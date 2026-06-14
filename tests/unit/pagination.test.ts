import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, clampLimit, clampOffset } from '@/lib/domain/pagination';

describe('clampLimit', () => {
  it('defaults when nothing is supplied', () => {
    expect(clampLimit(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampLimit(Number.NaN)).toBe(DEFAULT_PAGE_SIZE);
  });

  it('caps an unbounded request at MAX_PAGE_SIZE', () => {
    expect(clampLimit(100_000)).toBe(MAX_PAGE_SIZE);
    expect(clampLimit(Number.POSITIVE_INFINITY)).toBe(DEFAULT_PAGE_SIZE);
  });

  it('raises a zero or negative limit to one', () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-5)).toBe(1);
  });

  it('truncates a fractional limit', () => {
    expect(clampLimit(7.9)).toBe(7);
  });
});

describe('clampOffset', () => {
  it('never returns a negative offset', () => {
    expect(clampOffset(-1)).toBe(0);
    expect(clampOffset(undefined)).toBe(0);
    expect(clampOffset(12.7)).toBe(12);
  });
});
