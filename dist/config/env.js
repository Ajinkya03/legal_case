"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOrigins = exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.preprocess((value) => (typeof value === 'string' ? value.trim().toLowerCase() : value), zod_1.z.enum(['development', 'test', 'production']).default('development')),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    MONGO_URI: zod_1.z.string().min(1),
    JWT_ACCESS_SECRET: zod_1.z.string().min(16),
    JWT_REFRESH_SECRET: zod_1.z.string().min(16),
    JWT_ACCESS_EXPIRY: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRY: zod_1.z.string().default('7d'),
    CORS_ORIGINS: zod_1.z.string().default('http://localhost:5173'),
    STORAGE_DRIVER: zod_1.z.enum(['local', 's3']).default('local'),
    UPLOAD_DIR: zod_1.z.string().default('uploads'),
    SEED_SUPER_ADMIN_EMAIL: zod_1.z.string().email().default(process.env.DEFAULT_SUPER_ADMIN_EMAIL ?? 'superadmin@example.com'),
    SEED_SUPER_ADMIN_USERNAME: zod_1.z.string().default(process.env.DEFAULT_SUPER_ADMIN_USERNAME ?? 'superadmin'),
    SEED_SUPER_ADMIN_PASSWORD: zod_1.z.string().min(8).default(process.env.DEFAULT_SUPER_ADMIN_PASSWORD ?? 'SuperAdmin123!'),
    SEED_ADMIN_EMAIL: zod_1.z.string().email().default(process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@example.com'),
    SEED_ADMIN_USERNAME: zod_1.z.string().default(process.env.DEFAULT_ADMIN_USERNAME ?? 'admin'),
    SEED_ADMIN_PASSWORD: zod_1.z.string().min(8).default(process.env.DEFAULT_ADMIN_PASSWORD ?? 'Admin123!')
});
exports.env = envSchema.parse(process.env);
exports.corsOrigins = exports.env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
