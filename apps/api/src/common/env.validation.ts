import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL environment variable is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET environment variable is required and must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  REFRESH_TOKEN_SECRET: z.string().min(32).optional(),
  SESSION_SECRET: z.string().min(16).optional(),
  REDIS_URL: z.string().min(1).optional(),
  ENABLE_IN_MEMORY_QUEUE_FALLBACK: z.string().optional(),
  FRONTEND_URL: z.string().url().optional(),
  WEB_PUBLIC_URL: z.string().url().optional(),
  API_PUBLIC_URL: z.string().url().optional(),
  DISABLE_QUEUE_WORKER: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  // Normalize alias variables
  if (!process.env.JWT_REFRESH_SECRET && process.env.REFRESH_TOKEN_SECRET) {
    process.env.JWT_REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
  }
  if (!process.env.FRONTEND_URL && process.env.WEB_PUBLIC_URL) {
    process.env.FRONTEND_URL = process.env.WEB_PUBLIC_URL;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorMessages = result.error.errors
      .map(err => `[ENV VALIDATION ERROR] ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    console.error("\n=======================================================");
    console.error("FATAL ERROR: ENVIRONMENT CONFIGURATION VALIDATION FAILED");
    console.error("=======================================================");
    console.error(errorMessages);
    console.error("=======================================================\n");
    throw new Error("Missing or invalid required environment configuration.");
  }

  if (result.data.NODE_ENV === 'production') {
    const errors: string[] = [];
    if (!result.data.REDIS_URL) errors.push('REDIS_URL is required in production');
    if (result.data.ENABLE_IN_MEMORY_QUEUE_FALLBACK === 'true') {
      errors.push('ENABLE_IN_MEMORY_QUEUE_FALLBACK must be false or unset in production');
    }
    const refreshSecret = result.data.JWT_REFRESH_SECRET || result.data.REFRESH_TOKEN_SECRET;
    if (!refreshSecret) errors.push('JWT_REFRESH_SECRET (or REFRESH_TOKEN_SECRET) is required in production');
    if (!result.data.SESSION_SECRET) errors.push('SESSION_SECRET is required in production');
    if (!result.data.FRONTEND_URL && !result.data.WEB_PUBLIC_URL) {
      errors.push('FRONTEND_URL (or WEB_PUBLIC_URL) is required in production for CORS security');
    }

    const weakKeywords = ['change_in_production', 'secret', 'default', 'password', 'threatsync_prod_secret', '12345678'];
    if (weakKeywords.some(k => result.data.JWT_SECRET.toLowerCase().includes(k))) {
      errors.push('JWT_SECRET must not use insecure default or example secret values in production');
    }
    if (refreshSecret && weakKeywords.some(k => refreshSecret.toLowerCase().includes(k))) {
      errors.push('JWT_REFRESH_SECRET/REFRESH_TOKEN_SECRET must not use insecure default or example secret values in production');
    }
    if (result.data.SESSION_SECRET && weakKeywords.some(k => result.data.SESSION_SECRET!.toLowerCase().includes(k))) {
      errors.push('SESSION_SECRET must not use insecure default or example secret values in production');
    }

    if (errors.length > 0) {
      throw new Error(`Production configuration validation failed: ${errors.join('; ')}`);
    }
  }

  return result.data;
}

