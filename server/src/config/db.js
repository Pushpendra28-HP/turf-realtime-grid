import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDb() {
  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));

  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  } catch (err) {
    throw new Error(`Could not connect to MongoDB. Check MONGODB_URI in server/.env (${err.message})`);
  }
  console.log('[db] connected');
}

export const disconnectDb = () => mongoose.disconnect();
