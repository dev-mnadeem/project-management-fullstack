import * as React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong',
        'bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      {icon && <div className="mb-1 text-ink-muted">{icon}</div>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-ink-secondary">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
