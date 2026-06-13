import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-md', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <Skeleton className="mt-5 h-2 w-full rounded-full" />
    </div>
  );
}
