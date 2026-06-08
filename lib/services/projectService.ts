import type { Datastore } from '../data';
import type { Project } from '../domain/project';
import type { Page } from '../domain/pagination';
import { NotFoundError } from '../domain/errors';
import { clampLimit, clampOffset } from '../domain/pagination';
import type { CreateProjectBody, ProjectListQuery, UpdateProjectBody } from '../schemas/project';
import type { TaskStatus } from '../domain/task';
import { TASK_STATUSES } from '../domain/task';

/** A project plus the task tallies the dashboard card needs. */
export interface ProjectSummary extends Project {
  taskCounts: Record<TaskStatus, number>;
  totalTasks: number;
  /** 0..1, share of the project's tasks that are Done. */
  progress: number;
}

function emptyCounts(): Record<TaskStatus, number> {
  return TASK_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<TaskStatus, number>,
  );
}

export class ProjectService {
  constructor(private readonly store: Datastore) {}

  /**
   * Lists projects and decorates each with its task tallies. The tallies come
   * from one grouped query covering the whole page, not one query per project.
   */
  async listWithProgress(query: ProjectListQuery): Promise<Page<ProjectSummary>> {
    const page = await this.store.projects.list({
      limit: clampLimit(query.limit),
      offset: clampOffset(query.offset),
      status: query.status,
      search: query.search && query.search.length > 0 ? query.search : undefined,
    });

    const counts = await this.store.tasks.countsByProject(page.items.map((project) => project.id));
    const byProject = new Map<number, Record<TaskStatus, number>>();
    for (const row of counts) {
      const bucket = byProject.get(row.projectId) ?? emptyCounts();
      bucket[row.status] = row.count;
      byProject.set(row.projectId, bucket);
    }

    return {
      ...page,
      items: page.items.map((project) => {
        const taskCounts = byProject.get(project.id) ?? emptyCounts();
        const totalTasks = TASK_STATUSES.reduce((sum, status) => sum + taskCounts[status], 0);
        return {
          ...project,
          taskCounts,
          totalTasks,
          progress: totalTasks === 0 ? 0 : taskCounts.Done / totalTasks,
        };
      }),
    };
  }

  async getOrThrow(id: number): Promise<Project> {
    const project = await this.store.projects.findById(id);
    if (!project) throw new NotFoundError('Project', id);
    return project;
  }

  async create(body: CreateProjectBody): Promise<Project> {
    return this.store.projects.create({
      title: body.title,
      description: body.description ?? null,
      status: body.status,
      deadline: body.deadline ?? null,
    });
  }

  async update(id: number, body: UpdateProjectBody): Promise<Project> {
    const updated = await this.store.projects.update(id, body);
    if (!updated) throw new NotFoundError('Project', id);
    return updated;
  }

  async remove(id: number): Promise<void> {
    const removed = await this.store.projects.remove(id);
    if (!removed) throw new NotFoundError('Project', id);
  }
}
