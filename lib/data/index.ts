import { config } from '../config';
import type { Datastore } from './types';
import { createMemoryDatastore } from './memory';
import { createPostgresDatastore } from './postgres';

const globalForStore = globalThis as unknown as { __pmDatastore?: Datastore };

/**
 * The single place that decides which driver the app talks to. Everything above
 * this line depends on the `Datastore` port, not on `pg`. Adding a driver means
 * adding a branch here and an implementation of the three repository
 * interfaces - no route handler or service changes.
 */
export function getDatastore(): Datastore {
  if (!globalForStore.__pmDatastore) {
    globalForStore.__pmDatastore =
      config.dataDriver === 'memory' ? createMemoryDatastore() : createPostgresDatastore();
  }
  return globalForStore.__pmDatastore;
}

/** Replace the process-wide datastore. Intended for tests and nothing else. */
export function setDatastore(datastore: Datastore | undefined): void {
  globalForStore.__pmDatastore = datastore;
}

export type { Datastore };
