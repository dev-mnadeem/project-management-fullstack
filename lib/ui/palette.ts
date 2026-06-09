import type { TaskStatus } from '../domain/task';

/**
 * The chart reads colours through JavaScript, the rest of the UI reads them
 * through CSS custom properties. Both resolve to the same variables declared in
 * app/globals.css, so there is exactly one definition of "Done blue".
 */
export const TASK_STATUS_VARIABLE: Record<TaskStatus, string> = {
  Todo: '--series-todo',
  'In Progress': '--series-progress',
  Done: '--series-done',
};

const FALLBACK: Record<string, string> = {
  '--series-todo': '#86b6ef',
  '--series-progress': '#2a78d6',
  '--series-done': '#104281',
  '--ink-secondary': '#52514e',
  '--ink-muted': '#898781',
  '--line': '#e3e2dc',
  '--surface': '#fcfcfb',
};

/** Reads a custom property off the document root. Falls back to the light-mode
 *  value during server render, where there is no computed style to read. */
export function cssVar(name: string): string {
  if (typeof window === 'undefined') return FALLBACK[name] ?? '#000000';
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || FALLBACK[name] || '#000000';
}
