import { Pool, types } from 'pg';
import { config } from '../../config';
import { ConfigError } from '../../domain/errors';

// By default pg turns a `date` column into a Date at local midnight, and
// toISOString() then shifts it to the previous day on any server east of UTC.
// Deadlines and due dates are calendar dates, so keep them as YYYY-MM-DD text.
types.setTypeParser(types.builtins.DATE, (value: string) => value);

/**
 * Next.js reloads modules on every edit in development; a module-scoped `new
 * Pool()` therefore leaks a connection pool per reload until Postgres refuses
 * new clients. Caching on globalThis is the standard escape hatch.
 */
const globalForPool = globalThis as unknown as { __pmPool?: Pool };

export function getPool(): Pool {
  if (!config.databaseUrl) {
    throw new ConfigError(
      'DATABASE_URL is not set. Set it, or set DATA_DRIVER=memory to run the seeded demo dataset.',
    );
  }
  if (!globalForPool.__pmPool) {
    globalForPool.__pmPool = new Pool({
      connectionString: config.databaseUrl,
      max: config.pool.max,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
      connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
    });
    // An idle client erroring out must not take the process down.
    globalForPool.__pmPool.on('error', (error) => {
      console.error('[db] idle client error', error);
    });
  }
  return globalForPool.__pmPool;
}

export async function closePool(): Promise<void> {
  if (globalForPool.__pmPool) {
    await globalForPool.__pmPool.end();
    globalForPool.__pmPool = undefined;
  }
}
