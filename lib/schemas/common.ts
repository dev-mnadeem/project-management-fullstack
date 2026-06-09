import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../domain/pagination';

/** A calendar date with no time component, as stored and as transmitted. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date')
  // Date.parse happily rolls 2026-02-31 over into March, so a round trip is the
  // only way to reject a day that does not exist in its month.
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Not a real calendar date');

/** Accepts the `2026-03-01T00:00:00.000Z` that a <input type="date"> round-trip
 *  or a JSON timestamp can produce, and narrows it to the date part. */
export const flexibleIsoDate = z
  .string()
  .min(1)
  .transform((value) => value.slice(0, 10))
  .pipe(isoDate);

export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});

export const idParam = z.coerce.number().int().positive();

/** Trim, then treat an empty string as "not provided" rather than as "". */
export const optionalText = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();
