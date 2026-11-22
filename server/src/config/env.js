import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z
    .string({ required_error: 'MONGODB_URI is required' })
    .min(1, 'MONGODB_URI is required')
    .refine((v) => /^mongodb(\+srv)?:\/\//.test(v), 'MONGODB_URI must start with mongodb:// or mongodb+srv://'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  GRID_COLS: z.coerce.number().int().min(5).max(100).default(30),
  GRID_ROWS: z.coerce.number().int().min(5).max(100).default(20),
  COOLDOWN_MS: z.coerce.number().int().min(0).max(60_000).default(1500),
  LOCK_MS: z.coerce.number().int().min(0).max(300_000).default(10_000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration (check server/.env):');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  port: env.PORT,
  mongoUri: env.MONGODB_URI,
  clientOrigins: env.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  cols: env.GRID_COLS,
  rows: env.GRID_ROWS,
  cooldownMs: env.COOLDOWN_MS,
  lockMs: env.LOCK_MS,
};

// the part of the config the browser is allowed to know about
export const publicConfig = {
  cols: config.cols,
  rows: config.rows,
  cooldownMs: config.cooldownMs,
  lockMs: config.lockMs,
};
