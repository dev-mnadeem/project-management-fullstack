import { describe, expect, it } from 'vitest';
import { types } from 'pg';
import '@/lib/data/postgres/pool';
import { toTask } from '@/lib/data/postgres/mappers';

describe('Postgres date columns', () => {
  it('are parsed as plain YYYY-MM-DD text, not local-midnight Dates', () => {
    const parse = types.getTypeParser(types.builtins.DATE, 'text');
    expect(parse('2026-03-01')).toBe('2026-03-01');
  });

  it('survive the row mapper unchanged', () => {
    const task = toTask({
      id: 1,
      project_id: 2,
      title: 'Ship it',
      description: null,
      status: 'Todo',
      priority: 'High',
      assignee: null,
      due_date: '2026-03-01',
      photo_urls: null,
      created_at: '2026-01-01T09:00:00.000Z',
      updated_at: '2026-01-01T09:00:00.000Z',
    });
    expect(task.dueDate).toBe('2026-03-01');
  });
});
