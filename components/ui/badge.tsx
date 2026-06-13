import * as React from 'react';
import { cn } from '@/lib/utils';

export type Tone = 'neutral' | 'good' | 'warning' | 'critical' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-secondary border-line-strong',
  good: 'bg-good-wash text-good border-good/30',
  warning: 'bg-warning-wash text-ink border-warning/40',
  critical: 'bg-critical-wash text-critical border-critical/30',
  accent: 'bg-accent-wash text-accent-strong border-accent/25',
};

const DOTS: Record<Tone, string> = {
  neutral: 'bg-ink-muted',
  good: 'bg-good',
  warning: 'bg-warning',
  critical: 'bg-critical',
  accent: 'bg-accent',
};

/**
 * A status pill always carries its label. Warning amber and serious orange sit
 * below 3:1 against the light surface, so colour is never the only channel -
 * the text is the meaning and the dot is the reinforcement.
 */
export function Badge({
  tone = 'neutral',
  dot = true,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', DOTS[tone])} />}
      {children}
    </span>
  );
}
