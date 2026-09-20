import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/cpet'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(1000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().optional(),
  // SMTP Configuration for Email Delivery
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === 'true')
    .default(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().default('noreply@cpet.org'),
  SMTP_FROM_NAME: z.string().default('CPET'),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (!data.JWT_SECRET || data.JWT_SECRET.length < 32 || data.JWT_SECRET.includes('cpet-dev-')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET is required in production and must be at least 32 characters long',
      });
    }
    if (!data.REFRESH_TOKEN_SECRET || data.REFRESH_TOKEN_SECRET.length < 32 || data.REFRESH_TOKEN_SECRET.includes('cpet-dev-')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REFRESH_TOKEN_SECRET'],
        message: 'REFRESH_TOKEN_SECRET is required in production and must be at least 32 characters long',
      });
    }
    if (!data.COOKIE_SECRET || data.COOKIE_SECRET.length < 32 || data.COOKIE_SECRET.includes('cpet-dev-')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECRET'],
        message: 'COOKIE_SECRET is required in production and must be at least 32 characters long',
      });
    }
  }
}).transform((data) => {
  return {
    ...data,
    JWT_SECRET: data.JWT_SECRET || 'cpet-dev-super-secure-jwt-secret-key-change-in-production-2026',
    REFRESH_TOKEN_SECRET: data.REFRESH_TOKEN_SECRET || 'cpet-dev-refresh-token-secret-key-change-in-production-2026',
    COOKIE_SECRET: data.COOKIE_SECRET || 'cpet-dev-cookie-secret-key-2026',
  };
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Environment configuration validation failed:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const env = validateEnv();
