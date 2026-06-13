'use client';

import * as React from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Headless UI v2 needs an explicit <DialogPanel>: without it, "click outside to
 * close" has no inside to compare against and the backdrop swallows the event.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] duration-150 data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel
          transition
          className={cn(
            'w-full max-w-lg rounded-xl border border-line bg-surface shadow-xl',
            'duration-150 data-[closed]:scale-95 data-[closed]:opacity-0',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-base font-semibold text-ink">{title}</DialogTitle>
              {description && <p className="text-sm text-ink-secondary">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 rounded-md p-1 text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-5">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
