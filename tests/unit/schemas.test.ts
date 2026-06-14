import { describe, expect, it } from 'vitest';
import { createProjectSchema, projectListQuerySchema, updateProjectSchema } from '@/lib/schemas/project';
import { createTaskSchema, taskListQuerySchema, updateTaskSchema } from '@/lib/schemas/task';
import { DEFAULT_PAGE_SIZE } from '@/lib/domain/pagination';

describe('createProjectSchema', () => {
  it('accepts a well-formed project', () => {
    const result = createProjectSchema.parse({
      title: '  Portal rebuild  ',
      description: '  Rebuild it.  ',
      status: 'Active',
      deadline: '2026-06-30',
    });
    expect(result.title).toBe('Portal rebuild');
    expect(result.description).toBe('Rebuild it.');
  });

  it('turns an empty description into null rather than an empty string', () => {
    expect(createProjectSchema.parse({ title: 'A', description: '   ', status: 'Active' }).description).toBeNull();
  });

  it('rejects a blank title', () => {
    expect(createProjectSchema.safeParse({ title: '   ', status: 'Active' }).success).toBe(false);
  });

  it('rejects a status outside the registry', () => {
    expect(createProjectSchema.safeParse({ title: 'A', status: 'Shipped' }).success).toBe(false);
  });

  it('narrows a full timestamp deadline to a calendar date', () => {
    expect(
      createProjectSchema.parse({ title: 'A', status: 'Active', deadline: '2026-06-30T00:00:00.000Z' }).deadline,
    ).toBe('2026-06-30');
  });

  it('rejects a deadline that is not a real calendar date', () => {
    expect(createProjectSchema.safeParse({ title: 'A', status: 'Active', deadline: '2026-02-31' }).success).toBe(false);
    expect(createProjectSchema.safeParse({ title: 'A', status: 'Active', deadline: '30-06-2026' }).success).toBe(false);
  });
});

describe('updateProjectSchema', () => {
  it('accepts a single field', () => {
    expect(updateProjectSchema.parse({ status: 'Completed' })).toEqual({ status: 'Completed' });
  });

  it('rejects an empty patch', () => {
    expect(updateProjectSchema.safeParse({}).success).toBe(false);
  });
});

describe('projectListQuerySchema', () => {
  it('applies defaults and coerces strings from the query string', () => {
    expect(projectListQuerySchema.parse({})).toEqual({ limit: DEFAULT_PAGE_SIZE, offset: 0 });
    expect(projectListQuerySchema.parse({ limit: '5', offset: '10' })).toMatchObject({ limit: 5, offset: 10 });
  });

  it('rejects a limit above the cap instead of silently honouring it', () => {
    expect(projectListQuerySchema.safeParse({ limit: '10000' }).success).toBe(false);
  });
});

describe('createTaskSchema', () => {
  const base = { projectId: '3', title: 'Ship it', status: 'Todo', priority: 'High' };

  it('coerces a projectId arriving as a string', () => {
    expect(createTaskSchema.parse(base).projectId).toBe(3);
  });

  it('accepts http and https photo URLs', () => {
    expect(
      createTaskSchema.parse({ ...base, photoUrls: ['https://example.com/a.png', 'http://example.com/b.png'] })
        .photoUrls,
    ).toHaveLength(2);
  });

  it('rejects a javascript: photo URL', () => {
    expect(createTaskSchema.safeParse({ ...base, photoUrls: ['javascript:alert(1)'] }).success).toBe(false);
  });

  it('rejects a data: photo URL', () => {
    expect(
      createTaskSchema.safeParse({ ...base, photoUrls: ['data:text/html,<script>alert(1)</script>'] }).success,
    ).toBe(false);
  });

  it('caps the number of photo URLs', () => {
    const many = Array.from({ length: 9 }, (_, index) => `https://example.com/${index}.png`);
    expect(createTaskSchema.safeParse({ ...base, photoUrls: many }).success).toBe(false);
  });

  it('rejects a priority outside the registry', () => {
    expect(createTaskSchema.safeParse({ ...base, priority: 'Urgent' }).success).toBe(false);
  });
});

describe('updateTaskSchema', () => {
  it('does not accept projectId - a task cannot be moved between projects', () => {
    expect(updateTaskSchema.parse({ status: 'Done', projectId: 9 })).toEqual({ status: 'Done' });
  });

  it('rejects an empty patch', () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
  });
});

describe('taskListQuerySchema', () => {
  it('parses filters from query-string values', () => {
    expect(taskListQuerySchema.parse({ projectId: '4', status: 'Done' })).toMatchObject({
      projectId: 4,
      status: 'Done',
    });
  });
});
