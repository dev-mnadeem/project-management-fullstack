import type { Datastore } from '../types';
import { closePool, getPool } from './pool';
import {
  PostgresAnalyticsRepository,
  PostgresProjectRepository,
  PostgresTaskRepository,
} from './repositories';

export function createPostgresDatastore(): Datastore {
  const pool = getPool();
  return {
    driver: 'postgres',
    projects: new PostgresProjectRepository(pool),
    tasks: new PostgresTaskRepository(pool),
    analytics: new PostgresAnalyticsRepository(pool),
    async ping() {
      try {
        await pool.query('SELECT 1');
        return true;
      } catch (error) {
        console.error('[db] ping failed', error);
        return false;
      }
    },
    async close() {
      await closePool();
    },
  };
}
