import Link from 'next/link';
import { buttonClassName } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-6 py-28 text-center">
      <p className="tabular text-sm font-medium text-ink-muted">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink">Page not found</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        That URL does not match a project or a page in this dashboard.
      </p>
      <Link href="/" className={buttonClassName({ className: 'mt-6' })}>
        Back to dashboard
      </Link>
    </main>
  );
}
