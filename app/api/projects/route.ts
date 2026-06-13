import type { NextRequest } from 'next/server';
import { services } from '@/lib/services';
import { createProjectSchema, projectListQuerySchema } from '@/lib/schemas/project';
import { created, ok, route } from '@/lib/http/respond';
import { searchParamsToObject } from '@/lib/http/params';

export const dynamic = 'force-dynamic';

export const GET = route(async (request: NextRequest) => {
  const query = projectListQuerySchema.parse(searchParamsToObject(request.url));
  return ok(await services().projects.listWithProgress(query));
});

export const POST = route(async (request: NextRequest) => {
  const body = createProjectSchema.parse(await request.json());
  const project = await services().projects.create(body);
  services().analytics.invalidate();
  return created(project);
});
