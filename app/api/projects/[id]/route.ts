import type { NextRequest } from 'next/server';
import { services } from '@/lib/services';
import { updateProjectSchema } from '@/lib/schemas/project';
import { noContent, ok, route } from '@/lib/http/respond';
import { numericId, type RouteContext } from '@/lib/http/params';

export const dynamic = 'force-dynamic';

type Context = RouteContext<{ id: string }>;

export const GET = route(async (_request: NextRequest, context: Context) => {
  return ok(await services().projects.getOrThrow(await numericId(context)));
});

export const PATCH = route(async (request: NextRequest, context: Context) => {
  const id = await numericId(context);
  const body = updateProjectSchema.parse(await request.json());
  const project = await services().projects.update(id, body);
  services().analytics.invalidate();
  return ok(project);
});

export const DELETE = route(async (_request: NextRequest, context: Context) => {
  await services().projects.remove(await numericId(context));
  services().analytics.invalidate();
  return noContent();
});
