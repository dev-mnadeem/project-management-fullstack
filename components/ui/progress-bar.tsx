import { TASK_STATUSES, type TaskStatus } from '@/lib/domain/task';
import { cn } from '@/lib/utils';

const SEGMENT_COLOR: Record<TaskStatus, string> = {
  Todo: 'var(--series-todo)',
  'In Progress': 'var(--series-progress)',
  Done: 'var(--series-done)',
};

/**
 * A stacked progress bar over the three task statuses. Segments are separated by
 * a 2px gap in the surface colour so adjacent blues stay distinguishable
 * without an outline.
 */
export function ProgressBar({
  counts,
  className,
}: {
  counts: Record<TaskStatus, number>;
  className?: string;
}) {
  const total = TASK_STATUSES.reduce((sum, status) => sum + counts[status], 0);
  const label = TASK_STATUSES.map((status) => `${counts[status]} ${status}`).join(', ');

  if (total === 0) {
    return <div className={cn('h-1.5 w-full rounded-full bg-sunken', className)} aria-hidden />;
  }

  // Done first so the bar fills left to right as work completes.
  const ordered: TaskStatus[] = ['Done', 'In Progress', 'Todo'];

  return (
    <div
      className={cn('flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full', className)}
      role="img"
      aria-label={`Task breakdown: ${label}`}
    >
      {ordered
        .filter((status) => counts[status] > 0)
        .map((status) => (
          <span
            key={status}
            className="h-full rounded-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(counts[status] / total) * 100}%`,
              backgroundColor: SEGMENT_COLOR[status],
            }}
          />
        ))}
    </div>
  );
}
