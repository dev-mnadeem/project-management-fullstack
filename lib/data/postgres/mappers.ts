import type { Project, ProjectStatus } from '../../domain/project';
import { DEFAULT_PROJECT_STATUS, isProjectStatus } from '../../domain/project';
import type { Task, TaskPriority, TaskStatus } from '../../domain/task';
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STATUS,
  isTaskPriority,
  isTaskStatus,
} from '../../domain/task';
import { toIsoDate, toIsoTimestamp } from '../../domain/dates';

/**
 * Rows arrive snake_cased, with `Date` objects for date columns and `null` for
 * everything optional. Every row crosses into the domain through here, so no
 * component ever has to know what a `pg` row looks like.
 */
export interface ProjectRow {
  id: number | string;
  title: string;
  description: string | null;
  status: string;
  deadline: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface TaskRow {
  id: number | string;
  project_id: number | string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: string | null;
  due_date: Date | string | null;
  photo_urls: string[] | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function asProjectStatus(value: string): ProjectStatus {
  return isProjectStatus(value) ? value : DEFAULT_PROJECT_STATUS;
}

function asTaskStatus(value: string): TaskStatus {
  return isTaskStatus(value) ? value : DEFAULT_TASK_STATUS;
}

function asTaskPriority(value: string): TaskPriority {
  return isTaskPriority(value) ? value : DEFAULT_TASK_PRIORITY;
}

export function toProject(row: ProjectRow): Project {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    status: asProjectStatus(row.status),
    deadline: toIsoDate(row.deadline),
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  };
}

export function toTask(row: TaskRow): Task {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    title: row.title,
    description: row.description,
    status: asTaskStatus(row.status),
    priority: asTaskPriority(row.priority),
    assignee: row.assignee,
    dueDate: toIsoDate(row.due_date),
    photoUrls: row.photo_urls ?? [],
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  };
}
