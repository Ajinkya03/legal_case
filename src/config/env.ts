import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGO_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  SEED_SUPER_ADMIN_EMAIL: z.string().email().default(process.env.DEFAULT_SUPER_ADMIN_EMAIL ?? 'superadmin@example.com'),
  SEED_SUPER_ADMIN_USERNAME: z.string().default(process.env.DEFAULT_SUPER_ADMIN_USERNAME ?? 'superadmin'),
  SEED_SUPER_ADMIN_PASSWORD: z.string().min(8).default(process.env.DEFAULT_SUPER_ADMIN_PASSWORD ?? 'SuperAdmin123!'),
  SEED_ADMIN_EMAIL: z.string().email().default(process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@example.com'),
  SEED_ADMIN_USERNAME: z.string().default(process.env.DEFAULT_ADMIN_USERNAME ?? 'admin'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default(process.env.DEFAULT_ADMIN_PASSWORD ?? 'Admin123!')
});

export const env = envSchema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());