import type { Datastore } from '../data';
import { daysBetween, todayIso } from '../domain/dates';
import { NotFoundError } from '../domain/errors';
import type { RiskBrief, RiskBriefProvider } from '../ai/types';
import { buildSignals } from '../ai/types';

export class RiskService {
  constructor(
    private readonly store: Datastore,
    private readonly provider: RiskBriefProvider,
  ) {}

  async briefForProject(projectId: number, today: string = todayIso()): Promise<RiskBrief> {
    const project = await this.store.projects.findById(projectId);
    if (!project) throw new NotFoundError('Project', projectId);
    const tasks = await this.store.tasks.allForProject(projectId);
    const signals = buildSignals(project, tasks, today, daysBetween);
    return this.provider.brief(signals);
  }
}
