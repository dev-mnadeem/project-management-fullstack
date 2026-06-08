import type { Datastore } from '../types';
import { MemoryStore } from './store';
import { seedMemoryStore } from './seed';
import {
  MemoryAnalyticsRepository,
  MemoryProjectRepository,
  MemoryTaskRepository,
} from './repositories';

export interface MemoryDatastore extends Datastore {
  readonly driver: 'memory';
  readonly store: MemoryStore;
}

/**
 * An in-memory implementation of the same three repository ports the Postgres
 * driver implements. Two jobs: it backs the unit tests without a database, and
 * it lets `npm run dev` produce a populated dashboard on a clean checkout.
 * State lives for the lifetime of the process and is not durable.
 */
export function createMemoryDatastore(options: { seed?: boolean } = {}): MemoryDatastore {
  const store = new MemoryStore();
  if (options.seed !== false) seedMemoryStore(store);
  return {
    driver: 'memory',
    store,
    projects: new MemoryProjectRepository(store),
    tasks: new MemoryTaskRepository(store),
    analytics: new MemoryAnalyticsRepository(store),
    async ping() {
      return true;
    },
    async close() {
      /* nothing to release */
    },
  };
}

export { MemoryStore, seedMemoryStore };
