import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * A single measured number. No chart: a lone magnitude reads faster as a figure
 * than as a one-bar plot.
 */
export function StatTile({
  label,
  value,
  caption,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: number | string;
  caption?: string;
  tone?: 'neutral' | 'good' | 'warning' | 'critical';
  icon?: React.ReactNode;
}) {
  const valueColor =
    tone === 'critical' ? 'text-critical' : tone === 'good' ? 'text-good' : 'text-ink';

  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-ink-secondary">{label}</p>
        {icon && <span className="text-ink-muted">{icon}</span>}
      </div>
      <p className={cn('tabular mt-2 text-3xl font-semibold tracking-[-0.02em]', valueColor)}>
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-ink-muted">{caption}</p>}
    </div>
  );
}
