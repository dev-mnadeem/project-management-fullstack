import type { Pool } from 'pg';
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
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TERMINAL_TASK_STATUS,
  isTaskStatus,
} from '../../domain/task';
import type { Page } from '../../domain/pagination';
import type { ProjectRow, TaskRow } from './mappers';
import { toProject, toTask } from './mappers';

const PROJECT_COLUMNS = 'id, title, description, status, deadline, created_at, updated_at';
const TASK_COLUMNS =
  'id, project_id, title, description, status, priority, assignee, due_date, photo_urls, created_at, updated_at';

/**
 * Domain field -> column name. An UPDATE builds its SET clause only from keys
 * present in this map, so no caller-controlled string ever reaches the SQL text
 * as an identifier.
 */
const PROJECT_COLUMN_MAP = {
  title: 'title',
  description: 'description',
  status: 'status',
  deadline: 'deadline',
} as const;

const TASK_COLUMN_MAP = {
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  assignee: 'assignee',
  dueDate: 'due_date',
  photoUrls: 'photo_urls',
} as const;

interface SetClause {
  sql: string;
  values: unknown[];
}

function buildSetClause(
  patch: Record<string, unknown>,
  columnMap: Record<string, string>,
): SetClause | null {
  const assignments: string[] = [];
  const values: unknown[] = [];
  for (const [field, column] of Object.entries(columnMap)) {
    if (!(field in patch)) continue;
    values.push(patch[field] ?? null);
    assignments.push(`${column} = $${values.length}`);
  }
  if (assignments.length === 0) return null;
  return { sql: assignments.join(', '), values };
}

/** `COUNT(*) OVER ()` gives the unfiltered total alongside the page, so a list
 *  endpoint costs one round trip instead of a SELECT plus a COUNT. */
function readTotal(rows: Array<{ total_count?: string | number }>, fallback: number): number {
  if (rows.length === 0) return fallback;
  return Number(rows[0].total_count ?? fallback);
}

export class PostgresProjectRepository implements ProjectRepository {
  constructor(private readonly pool: Pool) {}

  async list(params: ProjectListParams): Promise<Page<Project>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (params.status) {
      values.push(params.status);
      conditions.push(`status = $${values.length}`);
    }
    if (params.search) {
      values.push(`%${params.search}%`);
      conditions.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(params.limit, params.offset);
    const { rows } = await this.pool.query<ProjectRow & { total_count: string }>(
      `SELECT ${PROJECT_COLUMNS}, COUNT(*) OVER () AS total_count
         FROM projects
         ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return {
      items: rows.map(toProject),
      total: readTotal(rows, 0),
      limit: params.limit,
      offset: params.offset,
    };
  }

  async findById(id: number): Promise<Project | null> {
    const { rows } = await this.pool.query<ProjectRow>(
      `SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = $1`,
      [id],
    );
    return rows[0] ? toProject(rows[0]) : null;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const { rows } = await this.pool.query<ProjectRow>(
      `INSERT INTO projects (title, description, status, deadline)
       VALUES ($1, $2, $3, $4)
       RETURNING ${PROJECT_COLUMNS}`,
      [input.title, input.description ?? null, input.status, input.deadline ?? null],
    );
    return toProject(rows[0]);
  }

  async update(id: number, patch: UpdateProjectInput): Promise<Project | null> {
    const set = buildSetClause(patch as Record<string, unknown>, PROJECT_COLUMN_MAP);
    if (!set) return this.findById(id);
    const { rows } = await this.pool.query<ProjectRow>(
      `UPDATE projects SET ${set.sql}, updated_at = NOW()
        WHERE id = $${set.values.length + 1}
        RETURNING ${PROJECT_COLUMNS}`,
      [...set.values, id],
    );
    return rows[0] ? toProject(rows[0]) : null;
  }

  async remove(id: number): Promise<boolean> {
    const { rowCount } = await this.pool.query('DELETE FROM projects WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }
}

export class PostgresTaskRepository implements TaskRepository {
  constructor(private readonly pool: Pool) {}

  async list(params: TaskListParams): Promise<Page<Task>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (params.projectId !== undefined) {
      values.push(params.projectId);
      conditions.push(`project_id = $${values.length}`);
    }
    if (params.status) {
      values.push(params.status);
      conditions.push(`status = $${values.length}`);
    }
    if (params.priority) {
      values.push(params.priority);
      conditions.push(`priority = $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(params.limit, params.offset);
    const { rows } = await this.pool.query<TaskRow & { total_count: string }>(
      `SELECT ${TASK_COLUMNS}, COUNT(*) OVER () AS total_count
         FROM tasks
         ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return {
      items: rows.map(toTask),
      total: readTotal(rows, 0),
      limit: params.limit,
      offset: params.offset,
    };
  }

  async findById(id: number): Promise<Task | null> {
    const { rows } = await this.pool.query<TaskRow>(
      `SELECT ${TASK_COLUMNS} FROM tasks WHERE id = $1`,
      [id],
    );
    return rows[0] ? toTask(rows[0]) : null;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const { rows } = await this.pool.query<TaskRow>(
      `INSERT INTO tasks (project_id, title, description, status, priority, assignee, due_date, photo_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${TASK_COLUMNS}`,
      [
        input.projectId,
        input.title,
        input.description ?? null,
        input.status,
        input.priority,
        input.assignee ?? null,
        input.dueDate ?? null,
        input.photoUrls ?? [],
      ],
    );
    return toTask(rows[0]);
  }

  async update(id: number, patch: UpdateTaskInput): Promise<Task | null> {
    const set = buildSetClause(patch as Record<string, unknown>, TASK_COLUMN_MAP);
    if (!set) return this.findById(id);
    const { rows } = await this.pool.query<TaskRow>(
      `UPDATE tasks SET ${set.sql}, updated_at = NOW()
        WHERE id = $${set.values.length + 1}
        RETURNING ${TASK_COLUMNS}`,
      [...set.values, id],
    );
    return rows[0] ? toTask(rows[0]) : null;
  }

  async remove(id: number): Promise<boolean> {
    const { rowCount } = await this.pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  async countsByProject(projectIds: number[]): Promise<TaskStatusCount[]> {
    if (projectIds.length === 0) return [];
    const { rows } = await this.pool.query<{
      project_id: string;
      status: string;
      count: string;
    }>(
      `SELECT project_id, status, COUNT(*)::int AS count
         FROM tasks
        WHERE project_id = ANY($1::int[])
        GROUP BY project_id, status`,
      [projectIds],
    );
    return rows
      .filter((row) => isTaskStatus(row.status))
      .map((row) => ({
        projectId: Number(row.project_id),
        status: row.status as TaskStatusCount['status'],
        count: Number(row.count),
      }));
  }

  async allForProject(projectId: number): Promise<Task[]> {
    const { rows } = await this.pool.query<TaskRow>(
      `SELECT ${TASK_COLUMNS} FROM tasks WHERE project_id = $1 ORDER BY created_at DESC, id DESC`,
      [projectId],
    );
    return rows.map(toTask);
  }
}

export class PostgresAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Four aggregates in one round trip. The counting happens in the database, so
   * the dashboard never downloads a row per project just to tally statuses.
   */
  async snapshot(today: string): Promise<AnalyticsSnapshot> {
    const { rows } = await this.pool.query<{
      bucket: string;
      key: string;
      count: string;
    }>(
      `SELECT 'project_status' AS bucket, status AS key, COUNT(*)::int AS count
         FROM projects GROUP BY status
       UNION ALL
       SELECT 'task_status', status, COUNT(*)::int FROM tasks GROUP BY status
       UNION ALL
       SELECT 'task_priority', priority, COUNT(*)::int FROM tasks GROUP BY priority
       UNION ALL
       SELECT 'overdue', 'overdue', COUNT(*)::int
         FROM tasks
        WHERE status <> $1 AND due_date IS NOT NULL AND due_date < $2::date`,
      [TERMINAL_TASK_STATUS, today],
    );

    const lookup = (bucket: string, key: string) =>
      Number(rows.find((row) => row.bucket === bucket && row.key === key)?.count ?? 0);

    const projectsByStatus = PROJECT_STATUSES.map((status) => ({
      status,
      count: lookup('project_status', status),
    }));
    const tasksByStatus = TASK_STATUSES.map((status) => ({
      status,
      count: lookup('task_status', status),
    }));
    const tasksByPriority = TASK_PRIORITIES.map((priority) => ({
      priority,
      count: lookup('task_priority', priority),
    }));

    // Rows whose status/priority is not one the app knows about are still
    // counted in the totals - they exist, they just have no bucket.
    const sumBucket = (bucket: string) =>
      rows.filter((row) => row.bucket === bucket).reduce((total, row) => total + Number(row.count), 0);

    const taskCount = sumBucket('task_status');
    const doneCount = lookup('task_status', TERMINAL_TASK_STATUS);

    return {
      projectCount: sumBucket('project_status'),
      taskCount,
      openTaskCount: taskCount - doneCount,
      overdueTaskCount: lookup('overdue', 'overdue'),
      projectsByStatus,
      tasksByStatus,
      tasksByPriority,
    };
  }
}
