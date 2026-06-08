import type { TaskStatus } from '../domain/task';

/**
 * The chart reads colours through JavaScript, the rest of the UI reads them
 * through CSS custom properties. Both resolve to the same variables declared in
 * app/globals.css, so there is exactly one definition of the "Done" colour.
 */
export const TASK_STATUS_VARIABLE: Record<TaskStatus, string> = {
  Todo: '--series-todo',
  'In Progress': '--series-progress',
  Done: '--series-done',
};

const FALLBACK: Record<string, string> = {
  '--series-todo': '#a7d3c9',
  '--series-progress': '#3a9a88',
  '--series-done': '#0f5c52',
  '--ink-secondary': '#4a4943',
  '--ink-muted': '#6b6a64',
  '--line': '#e2dfd5',
  '--surface': '#fdfcf9',
};

/** Reads a custom property off the document root. Falls back to the light-mode
 *  value during server render, where there is no computed style to read. */
export function cssVar(name: string): string {
  if (typeof window === 'undefined') return FALLBACK[name] ?? '#000000';
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || FALLBACK[name] || '#000000';
}
