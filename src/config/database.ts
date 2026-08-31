import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 10_000
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}