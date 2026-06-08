import type { RiskBrief, RiskBriefProvider, RiskLevel, RiskSignals } from './types';

/** Each weight is the number of risk points the signal contributes at full
 *  strength. They are named rather than inlined so the model can be tuned and
 *  argued about without reading the arithmetic. */
export const RISK_WEIGHTS = {
  overdueTask: 9,
  deadlinePassed: 30,
  deadlineWithinAWeek: 14,
  deadlineWithinAMonth: 6,
  openHighPriority: 5,
  unassignedOpen: 3,
  behindSchedule: 18,
  onHold: 10,
} as const;

export const RISK_CAPS = {
  overdue: 36,
  highPriority: 20,
  unassigned: 12,
} as const;

export const RISK_THRESHOLDS = { atRisk: 25, critical: 55 } as const;

const DAYS_IN_A_WEEK = 7;
const DAYS_IN_A_MONTH = 30;

function levelFor(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.critical) return 'critical';
  if (score >= RISK_THRESHOLDS.atRisk) return 'at-risk';
  return 'on-track';
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function scoreRisk(signals: RiskSignals): number {
  if (signals.projectStatus === 'Completed') return 0;

  let score = 0;

  score += Math.min(signals.overdueTasks * RISK_WEIGHTS.overdueTask, RISK_CAPS.overdue);
  score += Math.min(
    signals.openHighPriorityTasks * RISK_WEIGHTS.openHighPriority,
    RISK_CAPS.highPriority,
  );
  score += Math.min(signals.unassignedOpenTasks * RISK_WEIGHTS.unassignedOpen, RISK_CAPS.unassigned);

  const days = signals.daysToDeadline;
  if (days !== null && signals.completionRatio < 1) {
    if (days < 0) score += RISK_WEIGHTS.deadlinePassed;
    else if (days <= DAYS_IN_A_WEEK) score += RISK_WEIGHTS.deadlineWithinAWeek;
    else if (days <= DAYS_IN_A_MONTH) score += RISK_WEIGHTS.deadlineWithinAMonth;

    // Work remaining vs time remaining. A project 20% done with 10% of its
    // window left is behind in a way that a raw overdue count does not capture.
    if (days >= 0 && days <= DAYS_IN_A_MONTH) {
      const timeLeftRatio = days / DAYS_IN_A_MONTH;
      if (signals.completionRatio < 1 - timeLeftRatio) {
        score += Math.round(
          RISK_WEIGHTS.behindSchedule * (1 - timeLeftRatio - signals.completionRatio),
        );
      }
    }
  }

  if (signals.projectStatus === 'On Hold' && signals.completionRatio < 1) {
    score += RISK_WEIGHTS.onHold;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function describeRisk(signals: RiskSignals, score: number): Omit<RiskBrief, 'source'> {
  const level = levelFor(score);
  const findings: string[] = [];

  if (signals.totalTasks === 0) {
    findings.push('No tasks have been added, so there is nothing to measure progress against.');
  } else {
    findings.push(
      `${signals.doneTasks} of ${plural(signals.totalTasks, 'task')} complete (${Math.round(
        signals.completionRatio * 100,
      )}%), with ${signals.inProgressTasks} in progress.`,
    );
  }

  if (signals.overdueTasks > 0) {
    const one = signals.overdueTasks === 1;
    const lead = one ? '1 task is past its due date' : `${signals.overdueTasks} tasks are past their due dates`;
    const example =
      signals.criticalTaskTitles.length > 0 ? `, starting with "${signals.criticalTaskTitles[0]}"` : '';
    findings.push(`${lead}${example}.`);
  }

  if (signals.daysToDeadline !== null) {
    if (signals.daysToDeadline < 0) {
      findings.push(
        `The project deadline passed ${plural(Math.abs(signals.daysToDeadline), 'day')} ago.`,
      );
    } else if (signals.daysToDeadline <= DAYS_IN_A_WEEK) {
      findings.push(
        `Only ${plural(signals.daysToDeadline, 'day')} remain before the project deadline.`,
      );
    } else {
      findings.push(`${plural(signals.daysToDeadline, 'day')} remain before the deadline.`);
    }
  }

  if (signals.openHighPriorityTasks > 0) {
    findings.push(`${plural(signals.openHighPriorityTasks, 'high-priority task')} still open.`);
  }

  if (signals.unassignedOpenTasks > 0) {
    findings.push(`${plural(signals.unassignedOpenTasks, 'open task has', 'open tasks have')} no assignee.`);
  }

  if (signals.projectStatus === 'On Hold') {
    findings.push('The project is marked On Hold while work remains outstanding.');
  }

  let headline: string;
  let recommendation: string;

  if (signals.projectStatus === 'Completed') {
    headline = 'Closed out with no outstanding delivery risk.';
    recommendation = 'Archive the project or reopen it if follow-up work appears.';
  } else if (level === 'critical') {
    headline = `${signals.projectTitle} is unlikely to land on its current date.`;
    recommendation =
      signals.criticalTaskTitles.length > 0
        ? `Clear "${signals.criticalTaskTitles[0]}" first, then re-cut the deadline with the remaining ${plural(
            signals.totalTasks - signals.doneTasks,
            'open task',
          )}.`
        : 'Re-cut the deadline and agree a reduced scope before the next check-in.';
  } else if (level === 'at-risk') {
    headline = `${signals.projectTitle} is slipping but still recoverable.`;
    recommendation =
      signals.unassignedOpenTasks > 0
        ? `Assign the ${plural(signals.unassignedOpenTasks, 'unowned task')} and confirm the dates on everything still open.`
        : 'Confirm the dates on the open work and escalate anything without a clear owner.';
  } else {
    headline = `${signals.projectTitle} is tracking to plan.`;
    recommendation =
      signals.totalTasks === 0
        ? 'Break the project into tasks so progress becomes measurable.'
        : 'Keep the current cadence and revisit after the next block of work lands.';
  }

  return { level, score, headline, findings, recommendation };
}

/**
 * The default risk model: pure arithmetic over the measured signals. No network,
 * no API key, identical output for identical input. It is also the scoring half
 * of every other provider, so the number a reader sees is always reproducible.
 */
export class HeuristicRiskBriefProvider implements RiskBriefProvider {
  readonly name = 'local-heuristic';

  async brief(signals: RiskSignals): Promise<RiskBrief> {
    const score = scoreRisk(signals);
    return { ...describeRisk(signals, score), source: this.name };
  }
}
