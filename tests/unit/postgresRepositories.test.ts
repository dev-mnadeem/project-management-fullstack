import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import {
  PostgresProjectRepository,
  PostgresTaskRepository,
} from '@/lib/data/postgres/repositories';

function fakePool(responses: Array<{ rows: unknown[] }>) {
  const query = vi.fn(async () => responses.shift() ?? { rows: [] });
  return { pool: { query } as unknown as Pool, query };
}

describe('Postgres list totals', () => {
  it('reads the total from the window column when the page has rows', async () => {
    const row = {
      id: 1,
      title: 'Alpha',
      description: null,
      status: 'Active',
      deadline: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      total_count: '7',
    };
    const { pool, query } = fakePool([{ rows: [row] }]);
    const page = await new PostgresProjectRepository(pool).list({ limit: 1, offset: 0 });
    expect(page.total).toBe(7);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('counts separately when the offset is past the last row', async () => {
    const { pool, query } = fakePool([{ rows: [] }, { rows: [{ count: 5 }] }]);
    const page = await new PostgresProjectRepository(pool).list({
      limit: 20,
      offset: 40,
      status: 'Active',
    });
    expect(page.items).toEqual([]);
    expect(page.total).toBe(5);
    expect(query).toHaveBeenLastCalledWith(
      'SELECT COUNT(*)::int AS count FROM projects WHERE status = $1',
      ['Active'],
    );
  });

  it('skips the extra count for an empty first page', async () => {
    const { pool, query } = fakePool([{ rows: [] }]);
    const page = await new PostgresTaskRepository(pool).list({ limit: 20, offset: 0, projectId: 3 });
    expect(page.total).toBe(0);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
