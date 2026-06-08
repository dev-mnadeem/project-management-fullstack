'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong border border-transparent',
  secondary: 'bg-raised text-ink border border-line-strong hover:bg-sunken',
  ghost: 'bg-transparent text-ink-secondary border border-transparent hover:bg-sunken',
  destructive: 'bg-critical text-white border border-transparent hover:brightness-90',
};

const SIZES: Record<Size, string> = {
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
}: { variant?: Variant; size?: Size; className?: string } = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
    'transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

/**
 * `type` defaults to "button". The previous implementation let it default to
 * the HTML default of "submit", which made every Cancel button inside a modal
 * form submit that form instead of closing it.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
});
