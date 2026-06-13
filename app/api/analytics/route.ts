import { services } from '@/lib/services';
import { ok, route } from '@/lib/http/respond';

export const dynamic = 'force-dynamic';

/** Portfolio totals, counted by the database. The dashboard reads this instead
 *  of downloading every project row to tally statuses in the browser. */
export const GET = route(async () => {
  return ok(await services().analytics.snapshot());
});
