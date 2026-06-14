import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { toErrorResponse } from '@/lib/http/respond';
import { searchParamsToObject } from '@/lib/http/params';
import { AppError, NotFoundError, ValidationError } from '@/lib/domain/errors';

async function body(response: Response) {
  return (await response.json()) as { error: { code: string; message: string; details?: unknown } };
}

describe('toErrorResponse', () => {
  it('turns a Zod failure into a 400 with per-field detail', async () => {
    const schema = z.object({ title: z.string().min(1) });
    const result = schema.safeParse({ title: '' });
    expect(result.success).toBe(false);

    const response = toErrorResponse(result.success ? null : result.error);
    expect(response.status).toBe(400);
    const payload = await body(response);
    expect(payload.error.code).toBe('invalid_request');
    expect(payload.error.details).toEqual([{ path: 'title', message: expect.any(String) }]);
  });

  it('carries an AppError status and code through unchanged', async () => {
    const response = toErrorResponse(new NotFoundError('Project', 7));
    expect(response.status).toBe(404);
    const payload = await body(response);
    expect(payload.error.code).toBe('not_found');
    expect(payload.error.message).toBe('Project 7 was not found');
  });

  it('keeps a ValidationError at 400', async () => {
    const response = toErrorResponse(new ValidationError('bad input'));
    expect(response.status).toBe(400);
  });

  it('honours a custom AppError status', async () => {
    const response = toErrorResponse(new AppError('slow down', 429, 'rate_limited'));
    expect(response.status).toBe(429);
    expect((await body(response)).error.code).toBe('rate_limited');
  });

  it('never leaks an unexpected error message to the client', async () => {
    const response = toErrorResponse(new Error('connection string postgres://user:hunter2@db/app'));
    expect(response.status).toBe(500);
    const payload = await body(response);
    expect(payload.error.message).toBe('Internal Server Error');
    expect(JSON.stringify(payload)).not.toContain('hunter2');
  });
});

describe('searchParamsToObject', () => {
  it('collects the query string and drops empty values', () => {
    expect(searchParamsToObject('http://x/api/projects?status=Active&search=&limit=5')).toEqual({
      status: 'Active',
      limit: '5',
    });
  });

  it('returns an empty object when there is no query string', () => {
    expect(searchParamsToObject('http://x/api/projects')).toEqual({});
  });
});
