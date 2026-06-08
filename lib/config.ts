import { z } from 'zod';

/**
 * Every environment variable the server reads is declared here and nowhere else.
 * Modules import `config`; none of them touch `process.env` directly.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  /** `postgres` talks to DATABASE_URL, `memory` runs the seeded demo dataset. */
  DATA_DRIVER: z.enum(['postgres', 'memory']).optional(),
  PGPOOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  PGPOOL_IDLE_TIMEOUT_MS: z.coerce.number().int().min(0).default(30_000),
  PGPOOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(0).default(5_000),
  /** When absent the risk brief falls back to the deterministic local model. */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).default('claude-opus-5'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(100).default(8_000),
  ANALYTICS_CACHE_TTL_MS: z.coerce.number().int().min(0).default(10_000),
});

export type Env = z.infer<typeof envSchema>;

export interface AppConfig {
  dataDriver: 'postgres' | 'memory';
  databaseUrl: string | null;
  pool: { max: number; idleTimeoutMillis: number; connectionTimeoutMillis: number };
  ai: { apiKey: string | null; model: string; timeoutMs: number };
  analyticsCacheTtlMs: number;
}

/** The subset of the environment this app reads. Declared structurally so a
 *  test can build one from a plain object without faking all of NodeJS.ProcessEnv. */
export type EnvSource = Record<string, string | undefined>;

function build(source: EnvSource): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration -> ${issues}`);
  }
  const env = parsed.data;

  // Explicit DATA_DRIVER wins. Otherwise a DATABASE_URL implies Postgres, and
  // with neither set the app boots into the seeded in-memory demo so that
  // `npm run dev` works on a clean checkout with no services running.
  const dataDriver = env.DATA_DRIVER ?? (env.DATABASE_URL ? 'postgres' : 'memory');

  return {
    dataDriver,
    databaseUrl: env.DATABASE_URL ?? null,
    pool: {
      max: env.PGPOOL_MAX,
      idleTimeoutMillis: env.PGPOOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: env.PGPOOL_CONNECTION_TIMEOUT_MS,
    },
    ai: {
      apiKey: env.ANTHROPIC_API_KEY ?? null,
      model: env.AI_MODEL,
      timeoutMs: env.AI_TIMEOUT_MS,
    },
    analyticsCacheTtlMs: env.ANALYTICS_CACHE_TTL_MS,
  };
}

export const config: AppConfig = build(process.env);

/** Exposed for tests, which need to build a config from a synthetic env. */
export const buildConfig = build;
