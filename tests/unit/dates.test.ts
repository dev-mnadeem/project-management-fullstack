import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  formatDate,
  isPast,
  toIsoDate,
  toIsoTimestamp,
  todayIso,
} from '@/lib/domain/dates';

describe('toIsoDate', () => {
  it('narrows a Date to a calendar date', () => {
    expect(toIsoDate(new Date('2026-03-14T22:15:00.000Z'))).toBe('2026-03-14');
  });

  it('narrows an ISO timestamp string', () => {
    expect(toIsoDate('2026-03-14T00:00:00.000Z')).toBe('2026-03-14');
  });

  it('returns null for absent or unparseable values', () => {
    expect(toIsoDate(null)).toBeNull();
    expect(toIsoDate(undefined)).toBeNull();
    expect(toIsoDate('')).toBeNull();
    expect(toIsoDate('not a date')).toBeNull();
  });
});

describe('toIsoTimestamp', () => {
  it('keeps a full timestamp', () => {
    expect(toIsoTimestamp('2026-03-14T22:15:00.000Z')).toBe('2026-03-14T22:15:00.000Z');
  });

  it('falls back to the epoch rather than producing Invalid Date', () => {
    expect(toIsoTimestamp('rubbish')).toBe('1970-01-01T00:00:00.000Z');
  });
});

describe('formatDate', () => {
  it('formats in a fixed locale and time zone so SSR and hydration agree', () => {
    expect(formatDate('2026-03-14')).toBe('Mar 14, 2026');
    expect(formatDate('2026-03-14T23:59:59.000Z')).toBe('Mar 14, 2026');
  });

  it('renders an em dash for a missing date instead of "Invalid Date"', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('nonsense')).toBe('—');
  });
});

describe('daysBetween', () => {
  it('counts forwards and backwards', () => {
    expect(daysBetween('2026-03-01', '2026-03-11')).toBe(10);
    expect(daysBetween('2026-03-11', '2026-03-01')).toBe(-10);
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0);
  });

  it('crosses a daylight-saving boundary without drifting', () => {
    // US DST starts 2026-03-08; UTC arithmetic must still give exactly 7 days.
    expect(daysBetween('2026-03-05', '2026-03-12')).toBe(7);
  });
});

describe('isPast', () => {
  it('is true only for dates strictly before today', () => {
    expect(isPast('2026-03-01', '2026-03-02')).toBe(true);
    expect(isPast('2026-03-02', '2026-03-02')).toBe(false);
    expect(isPast('2026-03-03', '2026-03-02')).toBe(false);
    expect(isPast(null, '2026-03-02')).toBe(false);
  });
});

describe('todayIso', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayIso(new Date('2026-07-04T18:00:00.000Z'))).toBe('2026-07-04');
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
