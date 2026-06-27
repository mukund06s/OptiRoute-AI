import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must be a PostgreSQL connection string'
    ),
  ML_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_STRICT_MAX: z.coerce.number().int().positive().default(20),
  JSON_BODY_LIMIT: z.string().default('512kb'),
  OPENWEATHER_API_KEY: z.string().optional(),
  N8N_WEBHOOK_URL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AGENT_CYCLE_INTERVAL_MINUTES: z.coerce.number().int().positive().default(15),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[EnvValidation] Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export function getCorsOrigins(): string[] {
  if (env.CORS_ORIGINS) {
    return env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
  }

  if (env.NODE_ENV === 'production') {
    return [];
  }

  return ['http://localhost:3000', 'http://127.0.0.1:3000'];
}
