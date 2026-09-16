import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL environment variable is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET environment variable is required and must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  REDIS_URL: z.string().min(1).optional(),
  ENABLE_IN_MEMORY_QUEUE_FALLBACK: z.string().optional(),
  SESSION_SECRET: z.string().min(16).optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
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
    if (!result.data.JWT_REFRESH_SECRET) errors.push('JWT_REFRESH_SECRET is required in production');
    if (!result.data.SESSION_SECRET) errors.push('SESSION_SECRET is required in production');
    if (errors.length > 0) {
      throw new Error(`Production configuration validation failed: ${errors.join('; ')}`);
    }
  }

  return result.data;
}
