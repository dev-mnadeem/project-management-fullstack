import type { NextRequest } from 'next/server';
import { services } from '@/lib/services';
import { createTaskSchema, taskListQuerySchema } from '@/lib/schemas/task';
import { created, ok, route } from '@/lib/http/respond';
import { searchParamsToObject } from '@/lib/http/params';

export const dynamic = 'force-dynamic';

export const GET = route(async (request: NextRequest) => {
  const query = taskListQuerySchema.parse(searchParamsToObject(request.url));
  return ok(await services().tasks.list(query));
});

export const POST = route(async (request: NextRequest) => {
  const body = createTaskSchema.parse(await request.json());
  const task = await services().tasks.create(body);
  services().analytics.invalidate();
  return created(task);
});
