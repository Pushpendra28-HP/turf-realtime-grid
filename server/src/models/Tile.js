import mongoose from 'mongoose';

const tileSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // denormalised so a snapshot of the whole grid needs no joins
  ownerName: { type: String, default: null },
  ownerColor: { type: String, default: null },
  capturedAt: { type: Date, default: null },
  lockedUntil: { type: Date, default: null },
  captureCount: { type: Number, default: 0 },
});

tileSchema.index({ x: 1, y: 1 }, { unique: true });
tileSchema.index({ ownerId: 1 });

export const Tile = mongoose.model('Tile', tileSchema, 'turf_tiles');
