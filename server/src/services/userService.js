import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const toPublicUser = (u) => ({ id: String(u._id), name: u.name, color: u.color });

export async function createUser({ name, color }) {
  const token = crypto.randomBytes(32).toString('hex');
  try {
    const user = await User.create({
      name,
      nameLower: name.toLocaleLowerCase(),
      color,
      tokenHash: hashToken(token),
    });
    return { user: toPublicUser(user), token };
  } catch (err) {
    if (err?.code === 11000 && err.keyPattern?.nameLower) {
      throw new AppError('NAME_TAKEN', 'That name is already taken, try another one.', 409);
    }
    throw err;
  }
}

export async function authenticate(token) {
  if (typeof token !== 'string' || token.length !== 64) return null;
  return User.findOne({ tokenHash: hashToken(token) }).lean();
}

export async function getLastCaptureAt(userId) {
  const user = await User.findById(userId, 'lastCaptureAt').lean();
  return user?.lastCaptureAt ? user.lastCaptureAt.getTime() : 0;
}
