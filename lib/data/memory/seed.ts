import type { MemoryStore } from './store';
import type { Project, ProjectStatus } from '../../domain/project';
import type { Task, TaskPriority, TaskStatus } from '../../domain/task';

interface SeedTask {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  /** Days from the seed anchor. Negative is overdue. */
  dueInDays: number;
}

interface SeedProject {
  title: string;
  description: string;
  status: ProjectStatus;
  deadlineInDays: number;
  createdDaysAgo: number;
  tasks: SeedTask[];
}

/**
 * Demo data for the in-memory driver. Dates are relative to the anchor date so
 * the dashboard always shows a believable mix of overdue, due-soon and
 * comfortable work rather than a wall of stale 2024 deadlines.
 */
const SEED: SeedProject[] = [
  {
    title: 'Customer Portal Redesign',
    description: 'Rebuild the self-service portal on the new design system and ship an accessible, mobile-first account area.',
    status: 'Active',
    deadlineInDays: 24,
    createdDaysAgo: 62,
    tasks: [
      { title: 'Audit current portal accessibility', description: 'WCAG 2.2 AA pass over the eleven highest-traffic screens.', status: 'Done', priority: 'High', assignee: 'Priya Raman', dueInDays: -21 },
      { title: 'Design tokens for account area', description: 'Colour, spacing and type scale exported from Figma.', status: 'Done', priority: 'Medium', assignee: 'Marco Silva', dueInDays: -12 },
      { title: 'Build billing history screen', description: 'Paginated invoice list with PDF download.', status: 'In Progress', priority: 'High', assignee: 'Priya Raman', dueInDays: 5 },
      { title: 'Profile and notification settings', description: 'Preference toggles persisted per user.', status: 'In Progress', priority: 'Medium', assignee: 'Dana Okoye', dueInDays: 11 },
      { title: 'Retire legacy portal routes', description: 'Redirect map plus a two-week deprecation banner.', status: 'Todo', priority: 'Low', assignee: null, dueInDays: 20 },
      { title: 'Load test the new session store', description: 'Target 2k concurrent sessions with p95 under 400ms.', status: 'Todo', priority: 'High', assignee: 'Marco Silva', dueInDays: -3 },
    ],
  },
  {
    title: 'Warehouse Mobile Scanner',
    description: 'Offline-capable Android scanner for pick, pack and cycle counts across the three regional depots.',
    status: 'Active',
    deadlineInDays: 9,
    createdDaysAgo: 95,
    tasks: [
      { title: 'Offline sync conflict rules', description: 'Last-writer-wins with a per-location audit trail.', status: 'Done', priority: 'High', assignee: 'Tomas Berg', dueInDays: -34 },
      { title: 'Barcode symbology support', description: 'Code128, EAN-13 and the legacy internal 2of5 codes.', status: 'Done', priority: 'Medium', assignee: 'Tomas Berg', dueInDays: -18 },
      { title: 'Depot pilot in Rotterdam', description: 'Two-week shadow run beside the existing handhelds.', status: 'In Progress', priority: 'High', assignee: 'Lena Fischer', dueInDays: -2 },
      { title: 'Battery profiling on rugged devices', description: 'Full-shift drain measurements on the CT45 fleet.', status: 'Todo', priority: 'Medium', assignee: null, dueInDays: 6 },
      { title: 'Rollout runbook for depot leads', description: 'Device provisioning, fallback plan and escalation path.', status: 'Todo', priority: 'Medium', assignee: 'Lena Fischer', dueInDays: 8 },
    ],
  },
  {
    title: 'Billing Platform Migration',
    description: 'Move invoicing off the legacy monolith onto the metered billing service without a customer-visible gap.',
    status: 'On Hold',
    deadlineInDays: 61,
    createdDaysAgo: 140,
    tasks: [
      { title: 'Map legacy plan codes', description: 'Reconcile 214 historical plan codes against the new catalogue.', status: 'Done', priority: 'High', assignee: 'Dana Okoye', dueInDays: -48 },
      { title: 'Dual-write invoice records', description: 'Shadow writes to both systems behind a feature flag.', status: 'In Progress', priority: 'High', assignee: 'Sam Whitfield', dueInDays: 14 },
      { title: 'Tax engine contract review', description: 'Blocked pending the vendor renewal decision.', status: 'Todo', priority: 'Low', assignee: null, dueInDays: 40 },
      { title: 'Finance sign-off on reconciliation report', description: 'Month-end variance under 0.1% for three consecutive cycles.', status: 'Todo', priority: 'Medium', assignee: 'Dana Okoye', dueInDays: 52 },
    ],
  },
  {
    title: 'Observability Rollout',
    description: 'Structured logs, traces and service-level objectives for the twelve services that page on-call.',
    status: 'Active',
    deadlineInDays: 38,
    createdDaysAgo: 40,
    tasks: [
      { title: 'Standard log schema', description: 'Shared JSON envelope with request and tenant identifiers.', status: 'Done', priority: 'Medium', assignee: 'Sam Whitfield', dueInDays: -9 },
      { title: 'Trace propagation across the queue', description: 'Context headers carried through the worker pool.', status: 'In Progress', priority: 'High', assignee: 'Priya Raman', dueInDays: 7 },
      { title: 'Define SLOs for checkout', description: 'Availability and latency objectives with an error budget policy.', status: 'Todo', priority: 'High', assignee: null, dueInDays: 16 },
      { title: 'On-call dashboard templates', description: 'One board per service, generated from the service catalogue.', status: 'Todo', priority: 'Low', assignee: 'Tomas Berg', dueInDays: 30 },
    ],
  },
  {
    title: 'Vendor Onboarding Automation',
    description: 'Replace the spreadsheet-and-email supplier intake with a reviewed workflow and an audit trail.',
    status: 'Completed',
    deadlineInDays: -16,
    createdDaysAgo: 175,
    tasks: [
      { title: 'Intake form and validation rules', description: 'Company registry lookup with duplicate detection.', status: 'Done', priority: 'Medium', assignee: 'Lena Fischer', dueInDays: -70 },
      { title: 'Two-step approval workflow', description: 'Procurement review followed by finance approval.', status: 'Done', priority: 'High', assignee: 'Sam Whitfield', dueInDays: -44 },
      { title: 'Archive the legacy spreadsheet', description: 'Frozen snapshot retained for the seven-year audit window.', status: 'Done', priority: 'Low', assignee: 'Lena Fischer', dueInDays: -20 },
    ],
  },
  {
    title: 'Data Retention Compliance',
    description: 'Implement per-region retention windows and a verifiable deletion pipeline ahead of the audit.',
    status: 'Active',
    deadlineInDays: 4,
    createdDaysAgo: 51,
    tasks: [
      { title: 'Classify personal data by table', description: 'Column-level inventory across the four primary databases.', status: 'Done', priority: 'High', assignee: 'Marco Silva', dueInDays: -15 },
      { title: 'Deletion job for expired records', description: 'Batched hard-delete with a dry-run mode and a receipt log.', status: 'In Progress', priority: 'High', assignee: 'Marco Silva', dueInDays: -1 },
      { title: 'Evidence pack for the auditor', description: 'Policy, job logs and a sampled verification run.', status: 'Todo', priority: 'High', assignee: null, dueInDays: 3 },
    ],
  },
];

const MS_PER_DAY = 86_400_000;

function shift(anchor: Date, days: number): string {
  return new Date(anchor.getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

function shiftTimestamp(anchor: Date, days: number): string {
  return new Date(anchor.getTime() + days * MS_PER_DAY).toISOString();
}

/** Populate an empty store with the demo dataset. Idempotent by construction:
 *  it resets the store first, so calling it twice is not a doubling. */
export function seedMemoryStore(store: MemoryStore, anchor: Date = new Date()): void {
  store.reset();

  SEED.forEach((seedProject, projectIndex) => {
    const createdAt = shiftTimestamp(anchor, -seedProject.createdDaysAgo);
    const project: Project = {
      id: store.allocateProjectId(),
      title: seedProject.title,
      description: seedProject.description,
      status: seedProject.status,
      deadline: shift(anchor, seedProject.deadlineInDays),
      createdAt,
      updatedAt: createdAt,
    };
    store.projects.push(project);

    seedProject.tasks.forEach((seedTask, taskIndex) => {
      // Stagger creation so `ORDER BY created_at DESC` produces a stable,
      // meaningful order rather than an arbitrary one.
      const taskCreatedAt = shiftTimestamp(
        anchor,
        -seedProject.createdDaysAgo + projectIndex * 0.01 + taskIndex * 0.001,
      );
      const task: Task = {
        id: store.allocateTaskId(),
        projectId: project.id,
        title: seedTask.title,
        description: seedTask.description,
        status: seedTask.status,
        priority: seedTask.priority,
        assignee: seedTask.assignee,
        dueDate: shift(anchor, seedTask.dueInDays),
        photoUrls: [],
        createdAt: taskCreatedAt,
        updatedAt: taskCreatedAt,
      };
      store.tasks.push(task);
    });
  });
}

export const SEED_PROJECT_COUNT = SEED.length;
export const SEED_TASK_COUNT = SEED.reduce((total, project) => total + project.tasks.length, 0);
