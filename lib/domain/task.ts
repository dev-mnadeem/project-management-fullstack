/** Task statuses in progression order - Todo is the least advanced. The order is
 *  load-bearing: the stacked progress bar and the ordinal colour ramp both read
 *  it as "distance travelled". */
export const TASK_STATUSES = ['Todo', 'In Progress', 'Done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TERMINAL_TASK_STATUS: TaskStatus = 'Done';

export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const DEFAULT_TASK_STATUS: TaskStatus = 'Todo';
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'Medium';

export const TASK_PRIORITY_META: Record<
  TaskPriority,
  { label: string; tone: 'neutral' | 'warning' | 'critical' }
> = {
  Low: { label: 'Low', tone: 'neutral' },
  Medium: { label: 'Medium', tone: 'neutral' },
  High: { label: 'High', tone: 'critical' },
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

export function isOpen(status: TaskStatus): boolean {
  return status !== TERMINAL_TASK_STATUS;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  /** ISO-8601 date (YYYY-MM-DD) or null when the task has no due date. */
  dueDate: string | null;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  projectId: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string | null;
  dueDate?: string | null;
  photoUrls?: string[];
}

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, 'projectId'>>;
