import type { Project } from '../domain/project';
import type { Task } from '../domain/task';

export const RISK_LEVELS = ['on-track', 'at-risk', 'critical'] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];

/** The measured facts a risk model is allowed to reason about. Computed once,
 *  in one place, so the local model and a hosted model see identical inputs. */
export interface RiskSignals {
  projectTitle: string;
  projectStatus: string;
  /** Whole days until the deadline. Negative means the deadline has passed. */
  daysToDeadline: number | null;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  openHighPriorityTasks: number;
  unassignedOpenTasks: number;
  /** 0..1 */
  completionRatio: number;
  /** Titles of the open tasks that most need attention, worst first. */
  criticalTaskTitles: string[];
}

export interface RiskBrief {
  level: RiskLevel;
  /** 0 (healthy) to 100 (in trouble). Always produced by the local model so the
   *  number is reproducible whoever wrote the prose. */
  score: number;
  headline: string;
  findings: string[];
  recommendation: string;
  /** Which provider wrote the prose. Surfaced in the UI - a reader should never
   *  have to guess whether they are looking at model output. */
  source: string;
}

export interface RiskBriefProvider {
  readonly name: string;
  brief(signals: RiskSignals): Promise<RiskBrief>;
}

export function buildSignals(
  project: Project,
  tasks: Task[],
  today: string,
  daysBetween: (from: string, to: string) => number,
): RiskSignals {
  const open = tasks.filter((task) => task.status !== 'Done');
  const overdue = open.filter(
    (task) => task.dueDate !== null && daysBetween(today, task.dueDate) < 0,
  );
  const done = tasks.filter((task) => task.status === 'Done');
  const inProgress = tasks.filter((task) => task.status === 'In Progress');
  const todo = tasks.filter((task) => task.status === 'Todo');

  // Worst first: overdue before on-time, then High before Medium before Low,
  // then by how overdue. Deterministic for a given input set.
  const priorityRank = { High: 0, Medium: 1, Low: 2 } as const;
  const ranked = [...open].sort((a, b) => {
    const aOverdue = a.dueDate ? daysBetween(today, a.dueDate) : Number.MAX_SAFE_INTEGER;
    const bOverdue = b.dueDate ? daysBetween(today, b.dueDate) : Number.MAX_SAFE_INTEGER;
    const aLate = aOverdue < 0 ? 0 : 1;
    const bLate = bOverdue < 0 ? 0 : 1;
    if (aLate !== bLate) return aLate - bLate;
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    return a.id - b.id;
  });

  return {
    projectTitle: project.title,
    projectStatus: project.status,
    daysToDeadline: project.deadline ? daysBetween(today, project.deadline) : null,
    totalTasks: tasks.length,
    doneTasks: done.length,
    inProgressTasks: inProgress.length,
    todoTasks: todo.length,
    overdueTasks: overdue.length,
    openHighPriorityTasks: open.filter((task) => task.priority === 'High').length,
    unassignedOpenTasks: open.filter((task) => !task.assignee).length,
    completionRatio: tasks.length === 0 ? 0 : done.length / tasks.length,
    criticalTaskTitles: ranked.slice(0, 3).map((task) => task.title),
  };
}
