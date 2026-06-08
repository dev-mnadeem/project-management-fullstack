/** Date handling is centralised here because the app has three different needs
 *  that used to be solved three different ways: storage (YYYY-MM-DD), display
 *  (stable between server render and hydration) and arithmetic (day deltas). */

const MS_PER_DAY = 86_400_000;

const DISPLAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Narrow an arbitrary value to a YYYY-MM-DD string, or null. Postgres hands
 *  back a Date for `date` columns, the HTTP layer hands back a string. */
export function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function toIsoTimestamp(value: unknown): string {
  if (value === null || value === undefined) return new Date(0).toISOString();
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

/**
 * Format a date for display. Always UTC and always `en-US` so the server-rendered
 * string is byte-identical to the one React produces during hydration.
 * Returns an em dash for a missing date rather than "Invalid Date".
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '—';
  return DISPLAY_FORMAT.format(date);
}

/** Whole days from `from` to `to`. Negative means `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / MS_PER_DAY);
}

export function isPast(value: string | null | undefined, today: string): boolean {
  if (!value) return false;
  return daysBetween(today, value) < 0;
}

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
