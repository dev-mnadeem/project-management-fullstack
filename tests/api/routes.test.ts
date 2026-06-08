import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { setDatastore } from '@/lib/data';
import { createMemoryDatastore, type MemoryDatastore } from '@/lib/data/memory';
import { resetServices } from '@/lib/services';
import { GET as listProjects, POST as createProject } from '@/app/api/projects/route';
import {
  DELETE as deleteProject,
  GET as getProject,
  PATCH as patchProject,
} from '@/app/api/projects/[id]/route';
import { GET as getBrief } from '@/app/api/projects/[id]/brief/route';
import { GET as listTasks, POST as createTask } from '@/app/api/tasks/route';
import { DELETE as deleteTask, PATCH as patchTask } from '@/app/api/tasks/[id]/route';
import { GET as getAnalytics } from '@/app/api/analytics/route';
import { GET as getHealth } from '@/app/api/health/route';

const BASE = 'http://localhost/api';

let store: MemoryDatastore;

function get(path: string) {
  return new NextRequest(`${BASE}${path}`);
}

function send(path: string, method: string, body: unknown) {
  return new NextRequest(`${BASE}${path}`, {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function ctx(id: string | number) {
  return { params: Promise.resolve({ id: String(id) }) };
}

beforeEach(() => {
  store = createMemoryDatastore({ seed: false });
  setDatastore(store);
  resetServices();
});

describe('GET /api/projects', () => {
  it('returns an empty page rather than an error when there is nothing', async () => {
    const response = await listProjects(get('/projects'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ items: [], total: 0 });
  });

  it('decorates each project with its task tallies', async () => {
    const project = await store.projects.create({ title: 'Alpha', status: 'Active' });
    await store.tasks.create({ projectId: project.id, title: 'a', status: 'Done', priority: 'Low' });

    const payload = await (await listProjects(get('/projects'))).json();
    expect(payload.items[0]).toMatchObject({ totalTasks: 1, progress: 1 });
  });

  it('applies the status filter from the query string', async () => {
    await store.projects.create({ title: 'Live', status: 'Active' });
    await store.projects.create({ title: 'Shipped', status: 'Completed' });

    const payload = await (await listProjects(get('/projects?status=Completed'))).json();
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].title).toBe('Shipped');
  });

  it('rejects a limit above the cap with a 400 and a field path', async () => {
    const response = await listProjects(get('/projects?limit=99999'));
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe('invalid_request');
    expect(payload.error.details[0].path).toBe('limit');
  });
});

describe('POST /api/projects', () => {
  it('creates a project and answers 201', async () => {
    const response = await createProject(
      send('/projects', 'POST', { title: 'New', status: 'Active', deadline: '2026-09-01' }),
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: 1, title: 'New', deadline: '2026-09-01' });
  });

  it('rejects a body missing the title', async () => {
    const response = await createProject(send('/projects', 'POST', { status: 'Active' }));
    expect(response.status).toBe(400);
  });

  it('rejects a status outside the registry', async () => {
    const response = await createProject(send('/projects', 'POST', { title: 'x', status: 'Cancelled' }));
    expect(response.status).toBe(400);
  });
});

describe('/api/projects/[id]', () => {
  it('answers 404 with a machine-readable code for a missing project', async () => {
    const response = await getProject(get('/projects/99'), ctx(99));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'not_found' } });
  });

  it('answers 400 for a non-numeric id instead of reaching the database', async () => {
    const response = await getProject(get('/projects/abc'), ctx('abc'));
    expect(response.status).toBe(400);
  });

  it('patches only the supplied fields', async () => {
    const project = await store.projects.create({ title: 'A', description: 'keep', status: 'Active' });
    const response = await patchProject(
      send(`/projects/${project.id}`, 'PATCH', { status: 'On Hold' }),
      ctx(project.id),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'On Hold', description: 'keep' });
  });

  it('rejects an empty patch body', async () => {
    const project = await store.projects.create({ title: 'A', status: 'Active' });
    const response = await patchProject(send(`/projects/${project.id}`, 'PATCH', {}), ctx(project.id));
    expect(response.status).toBe(400);
  });

  it('deletes with 204 and cascades to the tasks', async () => {
    const project = await store.projects.create({ title: 'A', status: 'Active' });
    await store.tasks.create({ projectId: project.id, title: 'T', status: 'Todo', priority: 'Low' });

    const response = await deleteProject(get(`/projects/${project.id}`), ctx(project.id));
    expect(response.status).toBe(204);
    expect((await store.tasks.list({ limit: 10, offset: 0 })).total).toBe(0);
  });

  it('answers 404 when deleting something already gone', async () => {
    expect((await deleteProject(get('/projects/5'), ctx(5))).status).toBe(404);
  });
});

describe('/api/tasks', () => {
  it('creates a task under an existing project', async () => {
    const project = await store.projects.create({ title: 'Host', status: 'Active' });
    const response = await createTask(
      send('/tasks', 'POST', {
        projectId: project.id,
        title: 'Do it',
        status: 'Todo',
        priority: 'High',
        dueDate: '2026-08-01',
      }),
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ projectId: project.id, dueDate: '2026-08-01' });
  });

  it('answers 404 when the parent project does not exist', async () => {
    const response = await createTask(
      send('/tasks', 'POST', { projectId: 77, title: 'Orphan', status: 'Todo', priority: 'Low' }),
    );
    expect(response.status).toBe(404);
  });

  it('rejects a javascript: photo URL with a 400', async () => {
    const project = await store.projects.create({ title: 'Host', status: 'Active' });
    const response = await createTask(
      send('/tasks', 'POST', {
        projectId: project.id,
        title: 'XSS',
        status: 'Todo',
        priority: 'Low',
        photoUrls: ['javascript:alert(1)'],
      }),
    );
    expect(response.status).toBe(400);
  });

  it('filters the list by projectId', async () => {
    const a = await store.projects.create({ title: 'A', status: 'Active' });
    const b = await store.projects.create({ title: 'B', status: 'Active' });
    await store.tasks.create({ projectId: a.id, title: 'in A', status: 'Todo', priority: 'Low' });
    await store.tasks.create({ projectId: b.id, title: 'in B', status: 'Todo', priority: 'Low' });

    const payload = await (await listTasks(get(`/tasks?projectId=${a.id}`))).json();
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].title).toBe('in A');
  });

  it('patches and deletes a task', async () => {
    const project = await store.projects.create({ title: 'Host', status: 'Active' });
    const task = await store.tasks.create({ projectId: project.id, title: 'T', status: 'Todo', priority: 'Low' });

    const patched = await patchTask(send(`/tasks/${task.id}`, 'PATCH', { status: 'Done' }), ctx(task.id));
    expect(patched.status).toBe(200);
    await expect(patched.json()).resolves.toMatchObject({ status: 'Done' });

    expect((await deleteTask(get(`/tasks/${task.id}`), ctx(task.id))).status).toBe(204);
    expect((await deleteTask(get(`/tasks/${task.id}`), ctx(task.id))).status).toBe(404);
  });
});

describe('GET /api/analytics', () => {
  it('reports totals counted by the datastore', async () => {
    const project = await store.projects.create({ title: 'A', status: 'Active' });
    await store.tasks.create({ projectId: project.id, title: 'x', status: 'Done', priority: 'Low' });
    await store.tasks.create({ projectId: project.id, title: 'y', status: 'Todo', priority: 'High' });

    const payload = await (await getAnalytics()).json();
    expect(payload).toMatchObject({ projectCount: 1, taskCount: 2, openTaskCount: 1 });
    expect(payload.tasksByStatus).toContainEqual({ status: 'Done', count: 1 });
  });
});

describe('GET /api/projects/[id]/brief', () => {
  it('answers with a local brief and no API key configured', async () => {
    const project = await store.projects.create({ title: 'Alpha', status: 'Active', deadline: '2026-12-01' });
    const response = await getBrief(get(`/projects/${project.id}/brief`), ctx(project.id));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.source).toBe('local-heuristic');
    expect(payload.findings.length).toBeGreaterThan(0);
    expect(['on-track', 'at-risk', 'critical']).toContain(payload.level);
  });

  it('answers 404 for a project that does not exist', async () => {
    expect((await getBrief(get('/projects/88/brief'), ctx(88))).status).toBe(404);
  });
});

describe('GET /api/health', () => {
  it('reports the active driver and the local AI provider', async () => {
    const response = await getHealth();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      driver: 'memory',
      datastoreReachable: true,
      aiProvider: 'local-heuristic',
    });
  });
});
