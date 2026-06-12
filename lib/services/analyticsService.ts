import type { Datastore } from '../data';
import type { AnalyticsSnapshot } from '../data/types';
import { config } from '../config';
import { todayIso } from '../domain/dates';

interface CacheEntry {
  key: string;
  value: AnalyticsSnapshot;
  expiresAt: number;
}

/**
 * The dashboard polls this on every load and the numbers change only when a
 * project or task changes. A short in-process TTL collapses a burst of
 * refreshes into one aggregate query; it is deliberately measured in seconds so
 * an edit is visible almost immediately. Set ANALYTICS_CACHE_TTL_MS=0 to disable.
 */
export class AnalyticsService {
  private cache: CacheEntry | null = null;

  constructor(
    private readonly store: Datastore,
    private readonly ttlMs: number = config.analyticsCacheTtlMs,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async snapshot(today: string = todayIso()): Promise<AnalyticsSnapshot> {
    const timestamp = this.now();
    if (this.cache && this.cache.key === today && this.cache.expiresAt > timestamp) {
      return this.cache.value;
    }
    const value = await this.store.analytics.snapshot(today);
    if (this.ttlMs > 0) {
      this.cache = { key: today, value, expiresAt: timestamp + this.ttlMs };
    }
    return value;
  }

  invalidate(): void {
    this.cache = null;
  }
}
