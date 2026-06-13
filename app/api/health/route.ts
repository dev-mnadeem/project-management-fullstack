import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getDatastore } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Liveness plus a datastore round trip. Returns 503 when the store is
 *  unreachable so a container orchestrator can act on it. */
export async function GET() {
  const datastoreReachable = await getDatastore().ping();
  return NextResponse.json(
    {
      status: datastoreReachable ? 'ok' : 'degraded',
      driver: config.dataDriver,
      datastoreReachable,
      aiProvider: config.ai.apiKey ? 'anthropic' : 'local-heuristic',
      timestamp: new Date().toISOString(),
    },
    { status: datastoreReachable ? 200 : 503 },
  );
}
