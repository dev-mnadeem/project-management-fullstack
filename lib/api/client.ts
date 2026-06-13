import type { Page } from '../domain/pagination';
import type { Project } from '../domain/project';
import type { Task } from '../domain/task';
import type { AnalyticsSnapshot } from '../data/types';
import type { ProjectSummary } from '../services/projectService';
import type { RiskBrief } from '../ai/types';
import type { CreateProjectBody, ProjectListQuery, UpdateProjectBody } from '../schemas/project';
import type { CreateTaskBody, TaskListQuery, UpdateTaskBody } from '../schemas/task';

/** An error carrying the status and the server's machine-readable code, so a
 *  component can distinguish "you typed something wrong" from "it broke". */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiErrorPayload {
  error?: { code?: string; message?: string; details?: unknown };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text.length > 0 ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const body = (payload ?? {}) as ApiErrorPayload;
    throw new ApiError(
      response.status,
      body.error?.code ?? 'unknown_error',
      body.error?.message ?? `Request failed with status ${response.status}`,
      body.error?.details,
    );
  }

  return payload as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const serialised = search.toString();
  return serialised ? `?${serialised}` : '';
}

export const api = {
  listProjects: (params: Partial<ProjectListQuery> = {}) =>
    request<Page<ProjectSummary>>(`/api/projects${query(params)}`),
  getProject: (id: number) => request<Project>(`/api/projects/${id}`),
  createProject: (body: CreateProjectBody) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id: number, body: UpdateProjectBody) =>
    request<Project>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProject: (id: number) => request<void>(`/api/projects/${id}`, { method: 'DELETE' }),

  listTasks: (params: Partial<TaskListQuery> = {}) =>
    request<Page<Task>>(`/api/tasks${query(params)}`),
  createTask: (body: CreateTaskBody) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: number, body: UpdateTaskBody) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTask: (id: number) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),

  analytics: () => request<AnalyticsSnapshot>('/api/analytics'),
  riskBrief: (projectId: number) => request<RiskBrief>(`/api/projects/${projectId}/brief`),
};

/** Query keys in one object - an invalidation typo becomes a type error. */
export const queryKeys = {
  projects: (params: Partial<ProjectListQuery> = {}) => ['projects', params] as const,
  project: (id: number) => ['project', id] as const,
  tasks: (projectId: number) => ['tasks', projectId] as const,
  analytics: () => ['analytics'] as const,
  riskBrief: (projectId: number) => ['risk-brief', projectId] as const,
};
