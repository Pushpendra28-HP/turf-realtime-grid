import { Tile } from '../models/Tile.js';
import { User } from '../models/User.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const TOTAL_TILES = config.cols * config.rows;

const toTilePayload = (t) => ({
  x: t.x,
  y: t.y,
  ownerId: t.ownerId ? String(t.ownerId) : null,
  ownerName: t.ownerName ?? null,
  ownerColor: t.ownerColor ?? null,
  capturedAt: t.capturedAt ? t.capturedAt.getTime() : 0,
  lockedUntil: t.lockedUntil ? t.lockedUntil.getTime() : 0,
});

// Makes sure every cell of the grid exists. Safe to run on every boot.
export async function seedGrid() {
  const outOfBounds = { $or: [{ x: { $gte: config.cols } }, { y: { $gte: config.rows } }] };
  await Tile.deleteMany(outOfBounds);

  const existing = await Tile.countDocuments();
  if (existing === TOTAL_TILES) return;

  const ops = [];
  for (let y = 0; y < config.rows; y++) {
    for (let x = 0; x < config.cols; x++) {
      ops.push({ updateOne: { filter: { x, y }, update: { $setOnInsert: { x, y } }, upsert: true } });
    }
  }
  await Tile.bulkWrite(ops, { ordered: false });
  console.log(`[grid] seeded ${config.cols}x${config.rows} tiles`);
}

// Only claimed tiles are sent, the client fills the rest as empty.
export async function getSnapshot() {
  const tiles = await Tile.find({ ownerId: { $ne: null } }).lean();
  return tiles.map(toTilePayload);
}

export async function getLeaderboard() {
  const at = Date.now();
  const [rows, claimed] = await Promise.all([
    Tile.aggregate([
      { $match: { ownerId: { $ne: null } } },
      { $group: { _id: '$ownerId', count: { $sum: 1 }, name: { $first: '$ownerName' }, color: { $first: '$ownerColor' } } },
      { $sort: { count: -1, name: 1 } },
      { $limit: 10 },
    ]),
    Tile.countDocuments({ ownerId: { $ne: null } }),
  ]);

  return {
    at,
    claimed,
    total: TOTAL_TILES,
    top: rows.map((r) => ({ userId: String(r._id), name: r.name, color: r.color, count: r.count })),
  };
}

// Puts the cooldown timestamp back if the capture did not go through,
// but only if nobody else touched it in the meantime.
async function refundCooldown(userId, takenAt, previous) {
  await User.updateOne({ _id: userId, lastCaptureAt: takenAt }, { $set: { lastCaptureAt: previous } });
}

/**
 * Captures a tile for a user.
 *
 * Concurrency: both checks are single atomic updates, so two players clicking the
 * same tile at the same moment can never both win.
 *   1. the cooldown is claimed with a conditional update on the user document
 *   2. the tile is claimed with a conditional update (not locked, not already theirs)
 * If step 2 fails, step 1 is refunded so a lost race does not cost the player a cooldown.
 */
export async function captureTile(user, x, y) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - config.cooldownMs);

  const before = await User.findOneAndUpdate(
    { _id: user._id, $or: [{ lastCaptureAt: null }, { lastCaptureAt: { $lte: cutoff } }] },
    { $set: { lastCaptureAt: now } },
    { returnDocument: 'before', projection: { lastCaptureAt: 1 } }
  ).lean();

  if (!before) {
    const current = await User.findById(user._id, 'lastCaptureAt').lean();
    if (!current) throw new AppError('UNAUTHORIZED', 'Your session is no longer valid.', 401);
    const wait = current.lastCaptureAt.getTime() + config.cooldownMs - now.getTime();
    throw new AppError('COOLDOWN', 'You are still recharging.', 429, { retryAfterMs: Math.max(wait, 0) });
  }

  const lockedUntil = new Date(now.getTime() + config.lockMs);
  let previousTile;
  try {
    previousTile = await Tile.findOneAndUpdate(
      {
        x,
        y,
        ownerId: { $ne: user._id },
        $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
      },
      {
        $set: {
          ownerId: user._id,
          ownerName: user.name,
          ownerColor: user.color,
          capturedAt: now,
          lockedUntil,
        },
        $inc: { captureCount: 1 },
      },
      { returnDocument: 'before' }
    ).lean();
  } catch (err) {
    await refundCooldown(user._id, now, before.lastCaptureAt ?? null);
    throw err;
  }

  if (!previousTile) {
    await refundCooldown(user._id, now, before.lastCaptureAt ?? null);

    const tile = await Tile.findOne({ x, y }).lean();
    if (!tile) throw new AppError('INVALID_TILE', 'That tile does not exist.', 404);
    if (String(tile.ownerId) === String(user._id)) {
      throw new AppError('ALREADY_OWNED', 'You already own this tile.', 409);
    }
    if (tile.lockedUntil && tile.lockedUntil > now) {
      throw new AppError('LOCKED', 'This tile is protected right now.', 409, {
        retryAfterMs: tile.lockedUntil.getTime() - now.getTime(),
      });
    }
    throw new AppError('CONFLICT', 'Someone captured it a split second before you.', 409);
  }

  return {
    tile: {
      x,
      y,
      ownerId: String(user._id),
      ownerName: user.name,
      ownerColor: user.color,
      capturedAt: now.getTime(),
      lockedUntil: lockedUntil.getTime(),
      prevOwnerName: previousTile.ownerName ?? null,
    },
    cooldownEndsAt: now.getTime() + config.cooldownMs,
  };
}
