/**
 * Cost Tracker
 *
 * V2.0: tracks token usage and estimates costs per provider.
 */

export interface TokenUsage {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  timestamp: number;
}

export interface CostSummary {
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, { tokens: number; cost: number }>;
  byModel: Record<string, { tokens: number; cost: number }>;
}

// Approximate costs per 1K tokens (as of 2025-2026)
const MODEL_COSTS: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o": { prompt: 0.0025, completion: 0.01 },
  "gpt-4-turbo-preview": { prompt: 0.01, completion: 0.03 },
  "gpt-3.5-turbo": { prompt: 0.0005, completion: 0.0015 },
  "claude-3-5-sonnet-latest": { prompt: 0.003, completion: 0.015 },
  "gemini-1.5-flash": { prompt: 0.000075, completion: 0.0003 },
  "llama3": { prompt: 0, completion: 0 },
  "deepseek-chat": { prompt: 0.00014, completion: 0.00028 },
};

export class CostTracker {
  private history: TokenUsage[] = [];

  track(
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number
  ): void {
    const costs = MODEL_COSTS[model] ?? { prompt: 0, completion: 0 };
    const cost =
      (promptTokens / 1000) * costs.prompt +
      (completionTokens / 1000) * costs.completion;

    this.history.push({
      provider,
      model,
      promptTokens,
      completionTokens,
      cost,
      timestamp: Date.now(),
    });
  }

  getSummary(): CostSummary {
    const summary: CostSummary = {
      totalTokens: 0,
      totalCost: 0,
      byProvider: {},
      byModel: {},
    };

    for (const entry of this.history) {
      summary.totalTokens += entry.promptTokens + entry.completionTokens;
      summary.totalCost += entry.cost;

      // By provider
      if (!summary.byProvider[entry.provider]) {
        summary.byProvider[entry.provider] = { tokens: 0, cost: 0 };
      }
      summary.byProvider[entry.provider].tokens += entry.promptTokens + entry.completionTokens;
      summary.byProvider[entry.provider].cost += entry.cost;

      // By model
      if (!summary.byModel[entry.model]) {
        summary.byModel[entry.model] = { tokens: 0, cost: 0 };
      }
      summary.byModel[entry.model].tokens += entry.promptTokens + entry.completionTokens;
      summary.byModel[entry.model].cost += entry.cost;
    }

    return summary;
  }

  getHistory(): TokenUsage[] {
    return [...this.history];
  }

  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const costs = MODEL_COSTS[model] ?? { prompt: 0, completion: 0 };
    return (promptTokens / 1000) * costs.prompt + (completionTokens / 1000) * costs.completion;
  }

  reset(): void {
    this.history = [];
  }
}
