import { cn } from '@/lib/utils';

// Kept out of button.tsx: that file is a client module, and a server component
// (the 404 page) cannot call a function exported from one.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong border border-transparent',
  secondary: 'bg-raised text-ink border border-line-strong hover:bg-sunken',
  ghost: 'bg-transparent text-ink-secondary border border-transparent hover:bg-sunken',
  destructive: 'bg-critical text-white border border-transparent hover:brightness-90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
};

/** The button look as a class string, for a <Link> that navigates. Wrapping a
 *  <button> in an <a> nests two interactive elements, which is invalid HTML and
 *  gives keyboard and screen-reader users two tab stops for one action. */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
    'transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
