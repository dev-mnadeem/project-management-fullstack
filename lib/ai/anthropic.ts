import Anthropic from '@anthropic-ai/sdk';
import type { RiskBrief, RiskBriefProvider, RiskSignals } from './types';
import { HeuristicRiskBriefProvider, describeRisk, scoreRisk } from './heuristic';

const MAX_TOKENS = 2_000;

const SYSTEM_PROMPT = [
  'You are a delivery manager writing a short status brief about one software project.',
  'Use only the measured signals you are given. Never invent dates, names, or numbers.',
  'Reply with JSON only, matching exactly this shape:',
  '{"headline": string, "findings": string[], "recommendation": string}',
  'headline: one sentence, under 120 characters.',
  'findings: two to four sentences, each citing a number from the signals.',
  'recommendation: one concrete next action.',
].join('\n');

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  /** Injected by tests so the provider can be exercised without a network call. */
  client?: Pick<Anthropic, 'messages'>;
}

interface ModelBrief {
  headline?: unknown;
  findings?: unknown;
  recommendation?: unknown;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function asStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  );
  return items.length > 0 ? items.map((item) => item.trim()) : fallback;
}

/** Pull the first JSON object out of a reply that may be wrapped in prose or a
 *  fenced code block. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function buildPrompt(signals: RiskSignals): string {
  return `Measured signals for this project:\n${JSON.stringify(signals, null, 2)}`;
}

/**
 * Sends the measured signals to Claude for the narrative only. The risk score
 * and level are always computed locally by the heuristic model, so enabling
 * this provider changes the wording of a brief and never its verdict.
 *
 * Every failure path - missing key, timeout, non-JSON reply, refusal - returns
 * the local brief instead, so /api/projects/:id/brief has no configuration that
 * makes it fail.
 */
export class AnthropicRiskBriefProvider implements RiskBriefProvider {
  readonly name = 'anthropic';
  private readonly fallbackName = new HeuristicRiskBriefProvider().name;
  private readonly client: Pick<Anthropic, 'messages'>;

  constructor(private readonly options: AnthropicProviderOptions) {
    this.client =
      options.client ?? new Anthropic({ apiKey: options.apiKey, timeout: options.timeoutMs });
  }

  async brief(signals: RiskSignals): Promise<RiskBrief> {
    const score = scoreRisk(signals);
    const local = describeRisk(signals, score);

    try {
      const response = await this.client.messages.create({
        model: this.options.model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(signals) }],
      });

      if (response.stop_reason === 'refusal') {
        console.warn('[ai] model declined the request; using the local model');
        return { ...local, source: this.fallbackName };
      }

      const text = response.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('');
      const parsed = extractJson(text) as ModelBrief | null;
      if (!parsed) {
        console.warn('[ai] model reply was not JSON; using the local model');
        return { ...local, source: this.fallbackName };
      }

      return {
        level: local.level,
        score: local.score,
        headline: asString(parsed.headline, local.headline),
        findings: asStringList(parsed.findings, local.findings),
        recommendation: asString(parsed.recommendation, local.recommendation),
        source: this.name,
      };
    } catch (error) {
      console.warn('[ai] model call failed; using the local model', error);
      return { ...local, source: this.fallbackName };
    }
  }
}
