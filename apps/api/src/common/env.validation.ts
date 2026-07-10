import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL environment variable is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET environment variable is required and must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  REDIS_URL: z.string().min(1, "REDIS_URL environment variable is required"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET environment variable is required and must be at least 16 characters long"),
  AI_PROVIDER: z.enum(['google', 'openai', 'anthropic', 'mock']).default('mock'),
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
  return result.data;
}
