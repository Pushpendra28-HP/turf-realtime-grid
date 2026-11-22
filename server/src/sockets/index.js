import { Server } from 'socket.io';
import { z } from 'zod';
import { config, publicConfig } from '../config/env.js';
import { authenticate, getLastCaptureAt, toPublicUser } from '../services/userService.js';
import { captureTile, getLeaderboard, getSnapshot } from '../services/gridService.js';
import { toClientError } from '../utils/errors.js';
import { createLimiter } from '../utils/rateLimiter.js';

const captureSchema = z.object({
  x: z.number({ invalid_type_error: 'x must be a number' }).int().min(0, 'Tile is outside the grid').max(config.cols - 1, 'Tile is outside the grid'),
  y: z.number({ invalid_type_error: 'y must be a number' }).int().min(0, 'Tile is outside the grid').max(config.rows - 1, 'Tile is outside the grid'),
});

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientOrigins },
    maxHttpBufferSize: 10_000,
  });

  // userId -> set of socket ids (one player can have several tabs open)
  const online = new Map();
  const presencePayload = () => ({ at: Date.now(), count: online.size, userIds: [...online.keys()] });

  // Leaderboard recalculation is throttled so a burst of captures costs one query, not many.
  let leaderboardTimer = null;
  const scheduleLeaderboard = () => {
    if (leaderboardTimer) return;
    leaderboardTimer = setTimeout(async () => {
      leaderboardTimer = null;
      try {
        io.emit('leaderboard', await getLeaderboard());
      } catch (err) {
        console.error('[socket] leaderboard failed:', err.message);
      }
    }, 250);
  };

  io.use(async (socket, next) => {
    try {
      const user = await authenticate(socket.handshake.auth?.token);
      if (!user) {
        const err = new Error('Unauthorized');
        err.data = { code: 'UNAUTHORIZED' };
        return next(err);
      }
      socket.data.user = user;
      next();
    } catch (err) {
      console.error('[socket] auth failed:', err.message);
      next(new Error('Server error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const userId = String(user._id);
    const allowed = createLimiter({ capacity: 8, refillPerSec: 4 });

    if (!online.has(userId)) online.set(userId, new Set());
    online.get(userId).add(socket.id);
    io.emit('presence', presencePayload());

    socket.on('tile:capture', async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        if (!allowed()) {
          return reply({ ok: false, code: 'RATE_LIMITED', message: 'Too many clicks, slow down a little.' });
        }
        const { x, y } = captureSchema.parse(payload);
        const result = await captureTile(user, x, y);

        io.emit('tile:update', result.tile);
        scheduleLeaderboard();
        reply({ ok: true, cooldownEndsAt: result.cooldownEndsAt, serverTime: Date.now() });
      } catch (err) {
        const { status, ...body } = toClientError(err);
        if (status >= 500) console.error('[socket] capture failed:', err);
        reply({ ok: false, ...body });
      }
    });

    socket.on('disconnect', () => {
      const sockets = online.get(userId);
      sockets?.delete(socket.id);
      if (sockets && sockets.size === 0) online.delete(userId);
      io.emit('presence', presencePayload());
    });

    // The snapshot is built after the handlers are in place. Anything that happens while
    // it is being built reaches the client as a normal event, and the client reconciles
    // the two using timestamps.
    (async () => {
      try {
        const [tiles, leaderboard, lastCaptureAt] = await Promise.all([
          getSnapshot(),
          getLeaderboard(),
          getLastCaptureAt(user._id),
        ]);
        socket.emit('init', {
          serverTime: Date.now(),
          config: publicConfig,
          me: { ...toPublicUser(user), lastCaptureAt },
          tiles,
          leaderboard,
          online: presencePayload(),
        });
      } catch (err) {
        console.error('[socket] init failed:', err.message);
        socket.disconnect(true);
      }
    })();
  });

  return io;
}
