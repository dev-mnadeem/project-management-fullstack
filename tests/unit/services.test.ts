import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryDatastore, type MemoryDatastore } from '@/lib/data/memory';
import { ProjectService } from '@/lib/services/projectService';
import { TaskService } from '@/lib/services/taskService';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { NotFoundError } from '@/lib/domain/errors';
import { MAX_PAGE_SIZE } from '@/lib/domain/pagination';

let store: MemoryDatastore;
let projects: ProjectService;
let tasks: TaskService;

beforeEach(() => {
  store = createMemoryDatastore({ seed: false });
  projects = new ProjectService(store);
  tasks = new TaskService(store);
});

describe('ProjectService.listWithProgress', () => {
  it('attaches per-status task counts and a completion ratio', async () => {
    const project = await projects.create({ title: 'Alpha', status: 'Active' });
    await tasks.create({ projectId: project.id, title: 'a', status: 'Done', priority: 'Low' });
    await tasks.create({ projectId: project.id, title: 'b', status: 'Done', priority: 'Low' });
    await tasks.create({ projectId: project.id, title: 'c', status: 'Todo', priority: 'Low' });

    const page = await projects.listWithProgress({ limit: 10, offset: 0 });
    const summary = page.items[0];
    expect(summary.taskCounts).toEqual({ Todo: 1, 'In Progress': 0, Done: 2 });
    expect(summary.totalTasks).toBe(3);
    expect(summary.progress).toBeCloseTo(2 / 3);
  });

  it('gives a task-less project a zero progress instead of NaN', async () => {
    await projects.create({ title: 'Empty', status: 'Active' });
    const page = await projects.listWithProgress({ limit: 10, offset: 0 });
    expect(page.items[0].progress).toBe(0);
    expect(page.items[0].totalTasks).toBe(0);
  });

  it('fetches every page of tallies in a single repository call', async () => {
    const a = await projects.create({ title: 'A', status: 'Active' });
    const b = await projects.create({ title: 'B', status: 'Active' });
    await tasks.create({ projectId: a.id, title: 'x', status: 'Todo', priority: 'Low' });
    await tasks.create({ projectId: b.id, title: 'y', status: 'Todo', priority: 'Low' });

    const spy = vi.spyOn(store.tasks, 'countsByProject');
    await projects.listWithProgress({ limit: 10, offset: 0 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.arrayContaining([a.id, b.id]));
  });

  it('clamps an over-large limit before it reaches the repository', async () => {
    const spy = vi.spyOn(store.projects, 'list');
    await projects.listWithProgress({ limit: 100_000, offset: -3 });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: MAX_PAGE_SIZE, offset: 0 }));
  });

  it('treats an empty search string as no filter', async () => {
    const spy = vi.spyOn(store.projects, 'list');
    await projects.listWithProgress({ limit: 10, offset: 0, search: '' });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ search: undefined }));
  });
});

describe('ProjectService lookups', () => {
  it('throws NotFoundError for a missing project', async () => {
    await expect(projects.getOrThrow(42)).rejects.toBeInstanceOf(NotFoundError);
    await expect(projects.getOrThrow(42)).rejects.toMatchObject({ status: 404, code: 'not_found' });
  });

  it('throws NotFoundError when updating or deleting a missing project', async () => {
    await expect(projects.update(42, { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(projects.remove(42)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('TaskService', () => {
  it('refuses to create a task under a project that does not exist', async () => {
    await expect(
      tasks.create({ projectId: 99, title: 'orphan', status: 'Todo', priority: 'Low' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('creates a task once the project exists', async () => {
    const project = await projects.create({ title: 'Host', status: 'Active' });
    const task = await tasks.create({
      projectId: project.id,
      title: 'Real',
      status: 'Todo',
      priority: 'High',
    });
    expect(task.projectId).toBe(project.id);
  });

  it('throws NotFoundError for a missing task', async () => {
    await expect(tasks.getOrThrow(7)).rejects.toBeInstanceOf(NotFoundError);
    await expect(tasks.update(7, { status: 'Done' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(tasks.remove(7)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('AnalyticsService caching', () => {
  it('serves a repeat call from cache within the TTL', async () => {
    const spy = vi.spyOn(store.analytics, 'snapshot');
    const service = new AnalyticsService(store, 10_000, () => 1_000);
    await service.snapshot('2026-06-01');
    await service.snapshot('2026-06-01');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('re-queries once the TTL has elapsed', async () => {
    const spy = vi.spyOn(store.analytics, 'snapshot');
    let now = 1_000;
    const service = new AnalyticsService(store, 5_000, () => now);
    await service.snapshot('2026-06-01');
    now = 7_000;
    await service.snapshot('2026-06-01');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('re-queries when the day rolls over', async () => {
    const spy = vi.spyOn(store.analytics, 'snapshot');
    const service = new AnalyticsService(store, 60_000, () => 1_000);
    await service.snapshot('2026-06-01');
    await service.snapshot('2026-06-02');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('invalidate() forces the next call to re-query', async () => {
    const spy = vi.spyOn(store.analytics, 'snapshot');
    const service = new AnalyticsService(store, 60_000, () => 1_000);
    await service.snapshot('2026-06-01');
    service.invalidate();
    await service.snapshot('2026-06-01');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does not cache at all when the TTL is zero', async () => {
    const spy = vi.spyOn(store.analytics, 'snapshot');
    const service = new AnalyticsService(store, 0, () => 1_000);
    await service.snapshot('2026-06-01');
    await service.snapshot('2026-06-01');
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
