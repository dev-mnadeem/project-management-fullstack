import { config } from '../config';
import type { RiskBriefProvider } from './types';
import { HeuristicRiskBriefProvider } from './heuristic';
import { AnthropicRiskBriefProvider } from './anthropic';

/**
 * Provider selection lives here and only here. With no ANTHROPIC_API_KEY the app
 * uses the deterministic local model, which is why a clean checkout produces a
 * working risk brief with no accounts and no configuration.
 */
export function resolveRiskBriefProvider(): RiskBriefProvider {
  if (config.ai.apiKey) {
    return new AnthropicRiskBriefProvider({
      apiKey: config.ai.apiKey,
      model: config.ai.model,
      timeoutMs: config.ai.timeoutMs,
    });
  }
  return new HeuristicRiskBriefProvider();
}

export * from './types';
export { HeuristicRiskBriefProvider } from './heuristic';
export { AnthropicRiskBriefProvider } from './anthropic';
