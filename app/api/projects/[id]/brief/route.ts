import type { NextRequest } from 'next/server';
import { services } from '@/lib/services';
import { ok, route } from '@/lib/http/respond';
import { numericId, type RouteContext } from '@/lib/http/params';

export const dynamic = 'force-dynamic';

/**
 * Delivery-risk brief for one project. The score is always computed locally, so
 * this endpoint answers with no API key configured.
 */
export const GET = route(async (_request: NextRequest, context: RouteContext<{ id: string }>) => {
  return ok(await services().risk.briefForProject(await numericId(context)));
});
