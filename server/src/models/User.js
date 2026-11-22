import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // lower-cased copy so names are unique regardless of case
    nameLower: { type: String, required: true, unique: true },
    color: { type: String, required: true },
    // only a hash of the session token is stored, the raw token lives in the player's browser
    tokenHash: { type: String, required: true, unique: true },
    lastCaptureAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema, 'turf_users');
