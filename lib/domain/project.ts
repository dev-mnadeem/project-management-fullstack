/** Project statuses, in board order. Adding one here flows through validation,
 *  filters, analytics and the status pill without further edits. */
export const PROJECT_STATUSES = ['Active', 'On Hold', 'Completed'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const DEFAULT_PROJECT_STATUS: ProjectStatus = 'Active';

/** Presentation metadata keyed by status. `tone` maps onto the status palette
 *  used by <StatusPill>; it is never the only carrier of meaning - the label
 *  always ships alongside it. */
export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; tone: 'neutral' | 'good' | 'warning' }
> = {
  Active: { label: 'Active', tone: 'neutral' },
  'On Hold': { label: 'On Hold', tone: 'warning' },
  Completed: { label: 'Completed', tone: 'good' },
};

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return PROJECT_STATUSES.includes(value as ProjectStatus);
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  status: ProjectStatus;
  /** ISO-8601 date (YYYY-MM-DD) or null when the project has no deadline. */
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  title: string;
  description?: string | null;
  status: ProjectStatus;
  deadline?: string | null;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;
