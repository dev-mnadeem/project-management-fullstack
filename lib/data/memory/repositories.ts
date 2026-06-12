import type { MemoryStore } from './store';
import type {
  AnalyticsRepository,
  AnalyticsSnapshot,
  ProjectListParams,
  ProjectRepository,
  TaskListParams,
  TaskRepository,
  TaskStatusCount,
} from '../types';
import type { CreateProjectInput, Project, UpdateProjectInput } from '../../domain/project';
import { PROJECT_STATUSES } from '../../domain/project';
import type { CreateTaskInput, Task, UpdateTaskInput } from '../../domain/task';
import { TASK_PRIORITIES, TASK_STATUSES, isOpen } from '../../domain/task';
import type { Page } from '../../domain/pagination';
import { isPast } from '../../domain/dates';

function paginate<T>(rows: T[], limit: number, offset: number): Page<T> {
  return { items: rows.slice(offset, offset + limit), total: rows.length, limit, offset };
}

function byCreatedAtDesc(a: { createdAt: string; id: number }, b: { createdAt: string; id: number }) {
  if (a.createdAt === b.createdAt) return b.id - a.id;
  return a.createdAt < b.createdAt ? 1 : -1;
}

export class MemoryProjectRepository implements ProjectRepository {
  constructor(private readonly store: MemoryStore) {}

  async list(params: ProjectListParams): Promise<Page<Project>> {
    const needle = params.search?.toLowerCase();
    const rows = this.store.projects
      .filter((project) => (params.status ? project.status === params.status : true))
      .filter((project) => {
        if (!needle) return true;
        return (
          project.title.toLowerCase().includes(needle) ||
          (project.description ?? '').toLowerCase().includes(needle)
        );
      })
      .sort(byCreatedAtDesc);
    return paginate(rows, params.limit, params.offset);
  }

  async findById(id: number): Promise<Project | null> {
    return this.store.projects.find((project) => project.id === id) ?? null;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      id: this.store.allocateProjectId(),
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      deadline: input.deadline ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.projects.push(project);
    return project;
  }

  async update(id: number, patch: UpdateProjectInput): Promise<Project | null> {
    const project = this.store.projects.find((candidate) => candidate.id === id);
    if (!project) return null;
    if (patch.title !== undefined) project.title = patch.title;
    if (patch.description !== undefined) project.description = patch.description ?? null;
    if (patch.status !== undefined) project.status = patch.status;
    if (patch.deadline !== undefined) project.deadline = patch.deadline ?? null;
    project.updatedAt = new Date().toISOString();
    return project;
  }

  async remove(id: number): Promise<boolean> {
    const index = this.store.projects.findIndex((project) => project.id === id);
    if (index === -1) return false;
    this.store.projects.splice(index, 1);
    // Mirrors the ON DELETE CASCADE in db/schema.sql.
    this.store.tasks = this.store.tasks.filter((task) => task.projectId !== id);
    return true;
  }
}

export class MemoryTaskRepository implements TaskRepository {
  constructor(private readonly store: MemoryStore) {}

  async list(params: TaskListParams): Promise<Page<Task>> {
    const rows = this.store.tasks
      .filter((task) => (params.projectId ? task.projectId === params.projectId : true))
      .filter((task) => (params.status ? task.status === params.status : true))
      .filter((task) => (params.priority ? task.priority === params.priority : true))
      .sort(byCreatedAtDesc);
    return paginate(rows, params.limit, params.offset);
  }

  async findById(id: number): Promise<Task | null> {
    return this.store.tasks.find((task) => task.id === id) ?? null;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      id: this.store.allocateTaskId(),
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      assignee: input.assignee ?? null,
      dueDate: input.dueDate ?? null,
      photoUrls: input.photoUrls ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.tasks.push(task);
    return task;
  }

  async update(id: number, patch: UpdateTaskInput): Promise<Task | null> {
    const task = this.store.tasks.find((candidate) => candidate.id === id);
    if (!task) return null;
    if (patch.title !== undefined) task.title = patch.title;
    if (patch.description !== undefined) task.description = patch.description ?? null;
    if (patch.status !== undefined) task.status = patch.status;
    if (patch.priority !== undefined) task.priority = patch.priority;
    if (patch.assignee !== undefined) task.assignee = patch.assignee ?? null;
    if (patch.dueDate !== undefined) task.dueDate = patch.dueDate ?? null;
    if (patch.photoUrls !== undefined) task.photoUrls = patch.photoUrls ?? [];
    task.updatedAt = new Date().toISOString();
    return task;
  }

  async remove(id: number): Promise<boolean> {
    const index = this.store.tasks.findIndex((task) => task.id === id);
    if (index === -1) return false;
    this.store.tasks.splice(index, 1);
    return true;
  }

  async countsByProject(projectIds: number[]): Promise<TaskStatusCount[]> {
    if (projectIds.length === 0) return [];
    const wanted = new Set(projectIds);
    const tally = new Map<string, TaskStatusCount>();
    for (const task of this.store.tasks) {
      if (!wanted.has(task.projectId)) continue;
      const key = `${task.projectId}:${task.status}`;
      const existing = tally.get(key);
      if (existing) existing.count += 1;
      else tally.set(key, { projectId: task.projectId, status: task.status, count: 1 });
    }
    return [...tally.values()];
  }

  async allForProject(projectId: number): Promise<Task[]> {
    return this.store.tasks.filter((task) => task.projectId === projectId).sort(byCreatedAtDesc);
  }
}

export class MemoryAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly store: MemoryStore) {}

  async snapshot(today: string): Promise<AnalyticsSnapshot> {
    const { projects, tasks } = this.store;
    return {
      projectCount: projects.length,
      taskCount: tasks.length,
      openTaskCount: tasks.filter((task) => isOpen(task.status)).length,
      overdueTaskCount: tasks.filter((task) => isOpen(task.status) && isPast(task.dueDate, today))
        .length,
      projectsByStatus: PROJECT_STATUSES.map((status) => ({
        status,
        count: projects.filter((project) => project.status === status).length,
      })),
      tasksByStatus: TASK_STATUSES.map((status) => ({
        status,
        count: tasks.filter((task) => task.status === status).length,
      })),
      tasksByPriority: TASK_PRIORITIES.map((priority) => ({
        priority,
        count: tasks.filter((task) => task.priority === priority).length,
      })),
    };
  }
}
