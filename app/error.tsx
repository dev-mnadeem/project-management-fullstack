'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[ui] render failed', error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-6 py-28 text-center">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Something broke</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        The page failed to render. Retrying re-runs the request that failed.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-ink-muted">digest: {error.digest}</p>
      )}
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
