import type { Datastore } from '../data';
import type { Task } from '../domain/task';
import type { Page } from '../domain/pagination';
import { NotFoundError } from '../domain/errors';
import { clampLimit, clampOffset } from '../domain/pagination';
import type { CreateTaskBody, TaskListQuery, UpdateTaskBody } from '../schemas/task';

export class TaskService {
  constructor(private readonly store: Datastore) {}

  async list(query: TaskListQuery): Promise<Page<Task>> {
    return this.store.tasks.list({
      limit: clampLimit(query.limit),
      offset: clampOffset(query.offset),
      projectId: query.projectId,
      status: query.status,
      priority: query.priority,
    });
  }

  async getOrThrow(id: number): Promise<Task> {
    const task = await this.store.tasks.findById(id);
    if (!task) throw new NotFoundError('Task', id);
    return task;
  }

  /** Rejects a task pointed at a project that does not exist, rather than
   *  letting a foreign-key violation surface as a 500. */
  async create(body: CreateTaskBody): Promise<Task> {
    const project = await this.store.projects.findById(body.projectId);
    if (!project) throw new NotFoundError('Project', body.projectId);
    return this.store.tasks.create({
      projectId: body.projectId,
      title: body.title,
      description: body.description ?? null,
      status: body.status,
      priority: body.priority,
      assignee: body.assignee ?? null,
      dueDate: body.dueDate ?? null,
      photoUrls: body.photoUrls ?? [],
    });
  }

  async update(id: number, body: UpdateTaskBody): Promise<Task> {
    const updated = await this.store.tasks.update(id, body);
    if (!updated) throw new NotFoundError('Task', id);
    return updated;
  }

  async remove(id: number): Promise<void> {
    const removed = await this.store.tasks.remove(id);
    if (!removed) throw new NotFoundError('Task', id);
  }
}
