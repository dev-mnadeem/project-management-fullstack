import type { Project, ProjectStatus } from '@/lib/domain/project';
import type { Task, TaskPriority, TaskStatus } from '@/lib/domain/task';

let nextId = 1;

export function makeProject(overrides: Partial<Project> = {}): Project {
  const id = overrides.id ?? nextId++;
  return {
    id,
    title: `Project ${id}`,
    description: 'A project.',
    status: 'Active' as ProjectStatus,
    deadline: '2026-12-31',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  const id = overrides.id ?? nextId++;
  return {
    id,
    projectId: 1,
    title: `Task ${id}`,
    description: null,
    status: 'Todo' as TaskStatus,
    priority: 'Medium' as TaskPriority,
    assignee: 'Alex Chen',
    dueDate: '2026-12-01',
    photoUrls: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
