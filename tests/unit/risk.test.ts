import { describe, expect, it, vi } from 'vitest';
import { buildSignals, type RiskSignals } from '@/lib/ai/types';
import { HeuristicRiskBriefProvider, RISK_THRESHOLDS, describeRisk, scoreRisk } from '@/lib/ai/heuristic';
import { AnthropicRiskBriefProvider, extractJson } from '@/lib/ai/anthropic';
import { RiskService } from '@/lib/services/riskService';
import { createMemoryDatastore } from '@/lib/data/memory';
import { daysBetween } from '@/lib/domain/dates';
import { NotFoundError } from '@/lib/domain/errors';
import { makeProject, makeTask } from '../factories';

const TODAY = '2026-06-01';

function signals(overrides: Partial<RiskSignals> = {}): RiskSignals {
  return {
    projectTitle: 'Alpha',
    projectStatus: 'Active',
    daysToDeadline: 60,
    totalTasks: 10,
    doneTasks: 8,
    inProgressTasks: 1,
    todoTasks: 1,
    overdueTasks: 0,
    openHighPriorityTasks: 0,
    unassignedOpenTasks: 0,
    completionRatio: 0.8,
    criticalTaskTitles: [],
    ...overrides,
  };
}

describe('buildSignals', () => {
  it('measures completion, overdue work and ownership from the task list', () => {
    const project = makeProject({ id: 1, title: 'Alpha', deadline: '2026-06-15' });
    const tasks = [
      makeTask({ id: 1, status: 'Done', dueDate: '2026-05-01' }),
      makeTask({ id: 2, status: 'Todo', priority: 'High', dueDate: '2026-05-20', assignee: null }),
      makeTask({ id: 3, status: 'In Progress', priority: 'Medium', dueDate: '2026-06-20' }),
    ];

    const result = buildSignals(project, tasks, TODAY, daysBetween);
    expect(result.daysToDeadline).toBe(14);
    expect(result.totalTasks).toBe(3);
    expect(result.doneTasks).toBe(1);
    expect(result.overdueTasks).toBe(1);
    expect(result.openHighPriorityTasks).toBe(1);
    expect(result.unassignedOpenTasks).toBe(1);
    expect(result.completionRatio).toBeCloseTo(1 / 3);
  });

  it('ranks the worst open task first - overdue before on-time, High before Low', () => {
    const project = makeProject({ id: 1 });
    const tasks = [
      makeTask({ id: 1, title: 'on time low', status: 'Todo', priority: 'Low', dueDate: '2026-09-01' }),
      makeTask({ id: 2, title: 'very late', status: 'Todo', priority: 'High', dueDate: '2026-01-01' }),
      makeTask({ id: 3, title: 'a bit late', status: 'Todo', priority: 'High', dueDate: '2026-05-30' }),
    ];
    const result = buildSignals(project, tasks, TODAY, daysBetween);
    expect(result.criticalTaskTitles[0]).toBe('very late');
  });

  it('reports a null deadline rather than inventing one', () => {
    const result = buildSignals(makeProject({ deadline: null }), [], TODAY, daysBetween);
    expect(result.daysToDeadline).toBeNull();
    expect(result.completionRatio).toBe(0);
  });
});

describe('scoreRisk', () => {
  it('is zero for a completed project whatever else is true of it', () => {
    expect(scoreRisk(signals({ projectStatus: 'Completed', overdueTasks: 9, daysToDeadline: -100 }))).toBe(0);
  });

  it('stays inside 0..100', () => {
    const worst = signals({
      daysToDeadline: -90,
      overdueTasks: 40,
      openHighPriorityTasks: 40,
      unassignedOpenTasks: 40,
      completionRatio: 0,
      projectStatus: 'On Hold',
    });
    const score = scoreRisk(worst);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('is deterministic - the same signals always give the same score', () => {
    const input = signals({ overdueTasks: 3, daysToDeadline: 4 });
    expect(scoreRisk(input)).toBe(scoreRisk(input));
  });

  it('rises monotonically with the number of overdue tasks', () => {
    const none = scoreRisk(signals({ overdueTasks: 0 }));
    const some = scoreRisk(signals({ overdueTasks: 2 }));
    const many = scoreRisk(signals({ overdueTasks: 4 }));
    expect(some).toBeGreaterThan(none);
    expect(many).toBeGreaterThan(some);
  });

  it('caps the overdue contribution so one runaway project cannot saturate the score alone', () => {
    expect(scoreRisk(signals({ overdueTasks: 100 }))).toBe(scoreRisk(signals({ overdueTasks: 4 })));
  });

  it('penalises an On Hold project with work still outstanding', () => {
    expect(scoreRisk(signals({ projectStatus: 'On Hold' }))).toBeGreaterThan(
      scoreRisk(signals({ projectStatus: 'Active' })),
    );
  });

  it('adds nothing for a passed deadline once everything is finished', () => {
    expect(scoreRisk(signals({ daysToDeadline: -30, completionRatio: 1, doneTasks: 10, todoTasks: 0 }))).toBe(
      scoreRisk(signals({ daysToDeadline: null, completionRatio: 1, doneTasks: 10, todoTasks: 0 })),
    );
  });
});

describe('describeRisk', () => {
  it('labels a healthy project on-track', () => {
    const brief = describeRisk(signals(), scoreRisk(signals()));
    expect(brief.level).toBe('on-track');
    expect(brief.headline).toContain('Alpha');
  });

  it('labels a project above the critical threshold critical', () => {
    const bad = signals({
      overdueTasks: 5,
      daysToDeadline: -10,
      completionRatio: 0.1,
      openHighPriorityTasks: 4,
      criticalTaskTitles: ['Fix the importer'],
    });
    const brief = describeRisk(bad, scoreRisk(bad));
    expect(scoreRisk(bad)).toBeGreaterThanOrEqual(RISK_THRESHOLDS.critical);
    expect(brief.level).toBe('critical');
    expect(brief.recommendation).toContain('Fix the importer');
  });

  it('says so plainly when a project has no tasks at all', () => {
    const empty = signals({ totalTasks: 0, doneTasks: 0, inProgressTasks: 0, todoTasks: 0, completionRatio: 0 });
    const brief = describeRisk(empty, scoreRisk(empty));
    expect(brief.findings[0]).toContain('No tasks');
    expect(brief.recommendation).toContain('Break the project into tasks');
  });

  it('uses singular and plural forms correctly', () => {
    const one = signals({ overdueTasks: 1, criticalTaskTitles: ['Only one'] });
    expect(describeRisk(one, scoreRisk(one)).findings.join(' ')).toContain('1 task is past its due date');
    const two = signals({ overdueTasks: 2, criticalTaskTitles: ['First'] });
    expect(describeRisk(two, scoreRisk(two)).findings.join(' ')).toContain('2 tasks are past their due dates');
  });

  it('never cites a number the signals do not contain', () => {
    const input = signals({ totalTasks: 7, doneTasks: 3, inProgressTasks: 2, daysToDeadline: 12 });
    const text = describeRisk(input, scoreRisk(input)).findings.join(' ');
    expect(text).toContain('3 of 7 tasks');
    expect(text).toContain('12 days');
  });
});

describe('HeuristicRiskBriefProvider', () => {
  it('needs no network and names itself as the source', async () => {
    const brief = await new HeuristicRiskBriefProvider().brief(signals());
    expect(brief.source).toBe('local-heuristic');
    expect(brief.score).toBe(scoreRisk(signals()));
  });
});

describe('extractJson', () => {
  it('reads a bare JSON object', () => {
    expect(extractJson('{"headline":"hi"}')).toEqual({ headline: 'hi' });
  });

  it('reads JSON out of a fenced code block', () => {
    expect(extractJson('Sure!\n```json\n{"headline":"hi"}\n```')).toEqual({ headline: 'hi' });
  });

  it('reads JSON surrounded by prose', () => {
    expect(extractJson('Here you go: {"headline":"hi"} - hope that helps')).toEqual({ headline: 'hi' });
  });

  it('returns null for unparseable input rather than throwing', () => {
    expect(extractJson('no json here')).toBeNull();
    expect(extractJson('{broken')).toBeNull();
  });
});

describe('AnthropicRiskBriefProvider', () => {
  const options = { apiKey: 'test-key', model: 'claude-opus-5', timeoutMs: 1_000 };

  function providerReturning(create: ReturnType<typeof vi.fn>) {
    return new AnthropicRiskBriefProvider({
      ...options,
      client: { messages: { create } } as never,
    });
  }

  it('uses the model narrative but keeps the locally computed score', async () => {
    const create = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: '{"headline":"Model headline","findings":["one","two"],"recommendation":"Do the thing"}',
        },
      ],
    });
    const input = signals({ overdueTasks: 3 });
    const brief = await providerReturning(create).brief(input);

    expect(brief.headline).toBe('Model headline');
    expect(brief.findings).toEqual(['one', 'two']);
    expect(brief.source).toBe('anthropic');
    expect(brief.score).toBe(scoreRisk(input));
    expect(brief.level).toBe(describeRisk(input, scoreRisk(input)).level);
  });

  it('falls back to the local brief when the call throws', async () => {
    const create = vi.fn().mockRejectedValue(new Error('network down'));
    const brief = await providerReturning(create).brief(signals());
    expect(brief.source).toBe('local-heuristic');
    expect(brief.headline).toBe(describeRisk(signals(), scoreRisk(signals())).headline);
  });

  it('falls back when the reply is not JSON', async () => {
    const create = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'I am afraid I cannot format that.' }],
    });
    expect((await providerReturning(create).brief(signals())).source).toBe('local-heuristic');
  });

  it('falls back when the model declines the request', async () => {
    const create = vi.fn().mockResolvedValue({ stop_reason: 'refusal', content: [] });
    expect((await providerReturning(create).brief(signals())).source).toBe('local-heuristic');
  });

  it('keeps local text for any field the model omitted', async () => {
    const create = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: '{"headline":"Only a headline"}' }],
    });
    const brief = await providerReturning(create).brief(signals());
    const local = describeRisk(signals(), scoreRisk(signals()));
    expect(brief.headline).toBe('Only a headline');
    expect(brief.findings).toEqual(local.findings);
    expect(brief.recommendation).toBe(local.recommendation);
  });
});

describe('RiskService', () => {
  it('builds a brief from the project and its tasks', async () => {
    const store = createMemoryDatastore({ seed: false });
    const project = await store.projects.create({ title: 'Alpha', status: 'Active', deadline: '2026-06-10' });
    await store.tasks.create({
      projectId: project.id,
      title: 'late',
      status: 'Todo',
      priority: 'High',
      dueDate: '2026-01-01',
    });

    const brief = await new RiskService(store, new HeuristicRiskBriefProvider()).briefForProject(
      project.id,
      TODAY,
    );
    expect(brief.score).toBeGreaterThan(0);
    expect(brief.findings.join(' ')).toContain('1 task is past its due date');
  });

  it('throws NotFoundError for a project that does not exist', async () => {
    const store = createMemoryDatastore({ seed: false });
    await expect(
      new RiskService(store, new HeuristicRiskBriefProvider()).briefForProject(404, TODAY),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
