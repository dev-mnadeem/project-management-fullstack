import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
  UpdateProjectInput,
} from '../domain/project';
import type {
  CreateTaskInput,
  Task,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from '../domain/task';
import type { Page } from '../domain/pagination';

export interface ProjectListParams {
  limit: number;
  offset: number;
  status?: ProjectStatus;
  search?: string;
}

export interface TaskListParams {
  limit: number;
  offset: number;
  projectId?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
}

/** One row of `GROUP BY project_id, status`. */
export interface TaskStatusCount {
  projectId: number;
  status: TaskStatus;
  count: number;
}

export interface StatusTally<K extends string> {
  status: K;
  count: number;
}

export interface AnalyticsSnapshot {
  projectCount: number;
  taskCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  projectsByStatus: StatusTally<ProjectStatus>[];
  tasksByStatus: StatusTally<TaskStatus>[];
  tasksByPriority: { priority: TaskPriority; count: number }[];
}

export interface ProjectRepository {
  list(params: ProjectListParams): Promise<Page<Project>>;
  findById(id: number): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: number, patch: UpdateProjectInput): Promise<Project | null>;
  remove(id: number): Promise<boolean>;
}

export interface TaskRepository {
  list(params: TaskListParams): Promise<Page<Task>>;
  findById(id: number): Promise<Task | null>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: number, patch: UpdateTaskInput): Promise<Task | null>;
  remove(id: number): Promise<boolean>;
  /**
   * Task counts for many projects in a single round trip. The dashboard needs a
   * per-project breakdown for every card on screen; without this it would issue
   * one query per card.
   */
  countsByProject(projectIds: number[]): Promise<TaskStatusCount[]>;
  /** Every task belonging to one project, unpaginated - used by the risk model. */
  allForProject(projectId: number): Promise<Task[]>;
}

export interface AnalyticsRepository {
  /** Aggregates computed by the database, not by shipping every row to the client. */
  snapshot(today: string): Promise<AnalyticsSnapshot>;
}

export interface Datastore {
  readonly driver: 'postgres' | 'memory';
  readonly projects: ProjectRepository;
  readonly tasks: TaskRepository;
  readonly analytics: AnalyticsRepository;
  /** True when the backing store answered. Drives /api/health. */
  ping(): Promise<boolean>;
  close(): Promise<void>;
}
