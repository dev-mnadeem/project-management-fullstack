'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const CONTROL = cn(
  'w-full rounded-lg border border-line-strong bg-raised px-3 py-2',
  'text-sm text-ink placeholder:text-ink-muted',
  'transition-colors hover:border-ink-muted',
  'disabled:cursor-not-allowed disabled:opacity-60',
);

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(CONTROL, 'min-h-[84px] resize-y', className)} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  // The native caret is kept deliberately: without it a <select> is
  // indistinguishable from a text input at a glance.
  return <select ref={ref} className={cn(CONTROL, 'cursor-pointer pr-2', className)} {...props} />;
});
