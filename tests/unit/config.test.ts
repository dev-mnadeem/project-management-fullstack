import { describe, expect, it } from 'vitest';
import { buildConfig } from '@/lib/config';

describe('buildConfig', () => {
  it('falls back to the in-memory driver when nothing is configured', () => {
    expect(buildConfig({}).dataDriver).toBe('memory');
  });

  it('infers postgres from a DATABASE_URL', () => {
    expect(buildConfig({ DATABASE_URL: 'postgres://localhost/db' }).dataDriver).toBe('postgres');
  });

  it('lets an explicit DATA_DRIVER override the inference', () => {
    const config = buildConfig({ DATABASE_URL: 'postgres://localhost/db', DATA_DRIVER: 'memory' });
    expect(config.dataDriver).toBe('memory');
    expect(config.databaseUrl).toBe('postgres://localhost/db');
  });

  it('coerces numeric settings out of their string environment form', () => {
    const config = buildConfig({ PGPOOL_MAX: '25', AI_TIMEOUT_MS: '1500' });
    expect(config.pool.max).toBe(25);
    expect(config.ai.timeoutMs).toBe(1500);
  });

  it('defaults the model to claude-opus-5 and leaves the key null', () => {
    const config = buildConfig({});
    expect(config.ai.model).toBe('claude-opus-5');
    expect(config.ai.apiKey).toBeNull();
  });

  it('rejects an unknown driver instead of silently guessing', () => {
    expect(() => buildConfig({ DATA_DRIVER: 'mysql' })).toThrow(/Invalid environment configuration/);
  });

  it('rejects a pool size outside the permitted range', () => {
    expect(() => buildConfig({ PGPOOL_MAX: '0' })).toThrow(/Invalid environment configuration/);
    expect(() => buildConfig({ PGPOOL_MAX: '500' })).toThrow(/Invalid environment configuration/);
  });
});
