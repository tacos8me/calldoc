// ─── Environment Variable Validation ─────────────────────────────────────────
// Uses Zod to validate and type-check all environment variables at startup.
// Exports a typed `env` object for use throughout the application.

import { z } from 'zod';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Schema Definition
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // ── Core ──────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // ── Database (Required) ───────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // ── Redis (Required) ─────────────────────────────────────────────────────
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // ── Session ──────────────────────────────────────────────────────────────
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_MAX_AGE: z.coerce.number().int().positive().default(43200),
  SESSION_IDLE_TIMEOUT: z.coerce.number().int().positive().default(1800),

  // ── DevLink3 ─────────────────────────────────────────────────────────────
  DEVLINK3_HOST: z.string().optional(),
  DEVLINK3_PORT: z.coerce.number().int().min(1).max(65535).default(50797),
  DEVLINK3_USERNAME: z.string().optional(),
  DEVLINK3_PASSWORD: z.string().optional(),
  DEVLINK3_USE_TLS: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default('false'),

  // ── SMDR ──────────────────────────────────────────────────────────────────
  SMDR_PORT: z.coerce.number().int().min(1).max(65535).default(1150),
  SMDR_HOST: z.string().default('0.0.0.0'),
  SMDR_ENABLED: z
    .string()
    .transform((val) => val !== 'false')
    .optional()
    .default('true'),

  // ── Recording ────────────────────────────────────────────────────────────
  RECORDING_WATCH_DIR: z.string().optional(),
  RECORDING_POLL_INTERVAL: z.coerce.number().int().positive().default(30000),
  RECORDING_DEFAULT_POOL_ID: z.string().optional(),
  RECORDING_SOURCE_TYPE: z
    .enum(['vmpro_ftp', 'vrtx', 'devlink3_active', 'manual_upload'])
    .default('vmpro_ftp'),
  PCI_AUTO_RESUME_MS: z.coerce.number().int().nonnegative().default(180000),

  // ── SMTP ──────────────────────────────────────────────────────────────────
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@calldoc.local'),

  // ── S3-Compatible Storage ────────────────────────────────────────────────
  S3_ENDPOINT: z.string().url().optional().or(z.literal('')),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),

  // ── MinIO (alternative naming used in docker-compose) ────────────────────
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET: z.string().optional(),

  // ── SAML ──────────────────────────────────────────────────────────────────
  SAML_ENTRY_POINT: z.string().url().optional().or(z.literal('')),
  SAML_ISSUER: z.string().optional(),
  SAML_CALLBACK_URL: z.string().url().optional().or(z.literal('')),
  SAML_CERT: z.string().optional(),

  // ── NextAuth / Application URL ────────────────────────────────────────────
  NEXTAUTH_URL: z.string().url().optional().or(z.literal('')),
  NEXTAUTH_SECRET: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Type Export
// ---------------------------------------------------------------------------

export type Env = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// Validation Function
// ---------------------------------------------------------------------------

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages: string[] = [];

    for (const [field, messages] of Object.entries(errors)) {
      if (messages && messages.length > 0) {
        errorMessages.push(`  ${field}: ${messages.join(', ')}`);
      }
    }

    const header = '\n[CallDoc] Environment validation failed:';
    const body = errorMessages.join('\n');
    const footer = '\nPlease check your .env file or Docker environment variables.\n';

    console.error(`${header}\n${body}${footer}`);

    // In production, fail hard. In dev/test, use sensible defaults.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing or invalid environment variables: ${Object.keys(errors).join(', ')}`
      );
    }
  }

  const env = result.success ? result.data : envSchema.parse({
    ...process.env,
    // Provide fallback required vars in dev/test
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://calldoc:calldoc@localhost:5432/calldoc',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  // Generate random session secret in dev if not provided
  if (!env.SESSION_SECRET) {
    if (env.NODE_ENV === 'production') {
      console.error(
        '[CallDoc] WARNING: SESSION_SECRET is not set. A random value will be used.\n' +
        '  This means sessions will not persist across server restarts.\n' +
        '  Set SESSION_SECRET to a 32+ character string in production.'
      );
    }
    (env as Record<string, unknown>).SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  }

  return env;
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

/**
 * Validated and typed environment variables.
 * Import this object instead of using process.env directly:
 *
 * ```ts
 * import { env } from '@/lib/config/env';
 * const dbUrl = env.DATABASE_URL; // string (guaranteed present)
 * ```
 */
export const env: Env = validateEnv();
