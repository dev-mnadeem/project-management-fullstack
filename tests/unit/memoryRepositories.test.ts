import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '@/lib/data/memory/store';
import {
  MemoryAnalyticsRepository,
  MemoryProjectRepository,
  MemoryTaskRepository,
} from '@/lib/data/memory/repositories';
import { seedMemoryStore, SEED_PROJECT_COUNT, SEED_TASK_COUNT } from '@/lib/data/memory/seed';

let store: MemoryStore;
let projects: MemoryProjectRepository;
let tasks: MemoryTaskRepository;

beforeEach(() => {
  store = new MemoryStore();
  projects = new MemoryProjectRepository(store);
  tasks = new MemoryTaskRepository(store);
});

describe('MemoryProjectRepository', () => {
  it('creates a project with server-assigned identity and timestamps', async () => {
    const project = await projects.create({ title: 'Alpha', status: 'Active', deadline: '2026-05-01' });
    expect(project.id).toBe(1);
    expect(project.description).toBeNull();
    expect(project.createdAt).toBe(project.updatedAt);
  });

  it('paginates and reports the unfiltered total', async () => {
    for (let index = 0; index < 5; index += 1) {
      await projects.create({ title: `P${index}`, status: 'Active' });
    }
    const page = await projects.list({ limit: 2, offset: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(5);
    expect(page.offset).toBe(2);
  });

  it('filters by status', async () => {
    await projects.create({ title: 'A', status: 'Active' });
    await projects.create({ title: 'B', status: 'Completed' });
    const page = await projects.list({ limit: 10, offset: 0, status: 'Completed' });
    expect(page.items.map((project) => project.title)).toEqual(['B']);
    expect(page.total).toBe(1);
  });

  it('searches title and description case-insensitively', async () => {
    await projects.create({ title: 'Billing migration', status: 'Active' });
    await projects.create({ title: 'Scanner', description: 'Warehouse BILLING codes', status: 'Active' });
    await projects.create({ title: 'Unrelated', status: 'Active' });
    const page = await projects.list({ limit: 10, offset: 0, search: 'billing' });
    expect(page.total).toBe(2);
  });

  it('patches only the fields supplied', async () => {
    const created = await projects.create({ title: 'A', description: 'keep', status: 'Active' });
    const updated = await projects.update(created.id, { status: 'On Hold' });
    expect(updated?.status).toBe('On Hold');
    expect(updated?.description).toBe('keep');
  });

  it('returns null when updating a project that does not exist', async () => {
    expect(await projects.update(404, { title: 'x' })).toBeNull();
  });

  it('cascades deletes to the project tasks', async () => {
    const project = await projects.create({ title: 'A', status: 'Active' });
    await tasks.create({ projectId: project.id, title: 'T', status: 'Todo', priority: 'Low' });
    expect(await projects.remove(project.id)).toBe(true);
    expect((await tasks.list({ limit: 10, offset: 0 })).total).toBe(0);
  });

  it('reports a delete of a missing project as false', async () => {
    expect(await projects.remove(999)).toBe(false);
  });
});

describe('MemoryTaskRepository', () => {
  beforeEach(async () => {
    await projects.create({ title: 'Host', status: 'Active' });
  });

  it('defaults photoUrls to an empty array rather than null', async () => {
    const task = await tasks.create({ projectId: 1, title: 'T', status: 'Todo', priority: 'Low' });
    expect(task.photoUrls).toEqual([]);
  });

  it('filters by project, status and priority together', async () => {
    await tasks.create({ projectId: 1, title: 'A', status: 'Todo', priority: 'High' });
    await tasks.create({ projectId: 1, title: 'B', status: 'Done', priority: 'High' });
    await tasks.create({ projectId: 1, title: 'C', status: 'Todo', priority: 'Low' });
    const page = await tasks.list({ limit: 10, offset: 0, projectId: 1, status: 'Todo', priority: 'High' });
    expect(page.items.map((task) => task.title)).toEqual(['A']);
  });

  it('tallies every project in one call rather than one call per project', async () => {
    await projects.create({ title: 'Second', status: 'Active' });
    await tasks.create({ projectId: 1, title: 'A', status: 'Todo', priority: 'Low' });
    await tasks.create({ projectId: 1, title: 'B', status: 'Todo', priority: 'Low' });
    await tasks.create({ projectId: 1, title: 'C', status: 'Done', priority: 'Low' });
    await tasks.create({ projectId: 2, title: 'D', status: 'Done', priority: 'Low' });

    const counts = await tasks.countsByProject([1, 2]);
    expect(counts).toContainEqual({ projectId: 1, status: 'Todo', count: 2 });
    expect(counts).toContainEqual({ projectId: 1, status: 'Done', count: 1 });
    expect(counts).toContainEqual({ projectId: 2, status: 'Done', count: 1 });
  });

  it('returns nothing for an empty id list instead of scanning everything', async () => {
    await tasks.create({ projectId: 1, title: 'A', status: 'Todo', priority: 'Low' });
    expect(await tasks.countsByProject([])).toEqual([]);
  });
});

describe('MemoryAnalyticsRepository', () => {
  it('counts overdue open tasks and ignores completed ones', async () => {
    await projects.create({ title: 'Host', status: 'Active' });
    await tasks.create({ projectId: 1, title: 'late', status: 'Todo', priority: 'High', dueDate: '2026-01-01' });
    await tasks.create({ projectId: 1, title: 'late but done', status: 'Done', priority: 'High', dueDate: '2026-01-01' });
    await tasks.create({ projectId: 1, title: 'future', status: 'Todo', priority: 'Low', dueDate: '2099-01-01' });
    await tasks.create({ projectId: 1, title: 'no due date', status: 'Todo', priority: 'Low' });

    const snapshot = await new MemoryAnalyticsRepository(store).snapshot('2026-06-01');
    expect(snapshot.taskCount).toBe(4);
    expect(snapshot.openTaskCount).toBe(3);
    expect(snapshot.overdueTaskCount).toBe(1);
  });

  it('reports a zero bucket for a status nothing is in', async () => {
    await projects.create({ title: 'Host', status: 'Active' });
    const snapshot = await new MemoryAnalyticsRepository(store).snapshot('2026-06-01');
    expect(snapshot.projectsByStatus).toContainEqual({ status: 'Completed', count: 0 });
    expect(snapshot.tasksByStatus.map((row) => row.status)).toEqual(['Todo', 'In Progress', 'Done']);
  });
});

describe('seedMemoryStore', () => {
  it('produces the documented dataset', () => {
    seedMemoryStore(store, new Date('2026-06-01T00:00:00.000Z'));
    expect(store.projects).toHaveLength(SEED_PROJECT_COUNT);
    expect(store.tasks).toHaveLength(SEED_TASK_COUNT);
  });

  it('is idempotent - seeding twice does not double the data', () => {
    seedMemoryStore(store);
    seedMemoryStore(store);
    expect(store.projects).toHaveLength(SEED_PROJECT_COUNT);
  });

  it('every task points at a project that exists', () => {
    seedMemoryStore(store);
    const ids = new Set(store.projects.map((project) => project.id));
    expect(store.tasks.every((task) => ids.has(task.projectId))).toBe(true);
  });

  it('leaves at least one overdue open task so the dashboard is not artificially green', () => {
    const anchor = new Date('2026-06-01T00:00:00.000Z');
    seedMemoryStore(store, anchor);
    const overdue = store.tasks.filter(
      (task) => task.status !== 'Done' && task.dueDate !== null && task.dueDate < '2026-06-01',
    );
    expect(overdue.length).toBeGreaterThan(0);
  });
});
