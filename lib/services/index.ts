import { getDatastore } from '../data';
import { resolveRiskBriefProvider } from '../ai';
import { ProjectService } from './projectService';
import { TaskService } from './taskService';
import { AnalyticsService } from './analyticsService';
import { RiskService } from './riskService';

interface Container {
  projects: ProjectService;
  tasks: TaskService;
  analytics: AnalyticsService;
  risk: RiskService;
}

const globalForContainer = globalThis as unknown as { __pmServices?: Container };

/**
 * A hand-rolled composition root. Route handlers ask for a service; they never
 * construct a repository, a pool or a provider themselves - which is what makes
 * swapping any of those a one-line change here.
 */
export function services(): Container {
  if (!globalForContainer.__pmServices) {
    const store = getDatastore();
    globalForContainer.__pmServices = {
      projects: new ProjectService(store),
      tasks: new TaskService(store),
      analytics: new AnalyticsService(store),
      risk: new RiskService(store, resolveRiskBriefProvider()),
    };
  }
  return globalForContainer.__pmServices;
}

/** Drops the cached container so the next call rebuilds it - used after a test
 *  swaps the datastore, and after a write invalidates the analytics cache. */
export function resetServices(): void {
  globalForContainer.__pmServices = undefined;
}

export { ProjectService, TaskService, AnalyticsService, RiskService };
export type { ProjectSummary } from './projectService';
