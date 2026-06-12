import type { Project } from '../../domain/project';
import type { Task } from '../../domain/task';

/** The in-memory driver's tables. Kept as a class so a test can hold its own
 *  isolated instance instead of fighting module-level state. */
export class MemoryStore {
  projects: Project[] = [];
  tasks: Task[] = [];
  private nextProjectId = 1;
  private nextTaskId = 1;

  allocateProjectId(): number {
    return this.nextProjectId++;
  }

  allocateTaskId(): number {
    return this.nextTaskId++;
  }

  reset(): void {
    this.projects = [];
    this.tasks = [];
    this.nextProjectId = 1;
    this.nextTaskId = 1;
  }
}
