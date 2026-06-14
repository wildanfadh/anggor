/**
 * Multi-Provider Router
 *
 * V2.0: routes different tasks to different providers.
 * Planner → cheap/fast model, Coder → powerful model, Reviewer → second model.
 */

import type { Config, ProviderName } from "../config/schema.js";
import { createProvider, type Provider } from "../providers/index.js";

export interface RoutingConfig {
  planner?: ProviderName;
  coder?: ProviderName;
  reviewer?: ProviderName;
}

export interface RouterState {
  planner: Provider;
  coder: Provider;
  reviewer: Provider;
  config: RoutingConfig;
}

export function createRouter(config: Config): RouterState {
  const routing = config.routing ?? {};
  const baseProvider = config.provider;

  const plannerProviderName = routing.planner ?? baseProvider.name;
  const coderProviderName = routing.coder ?? baseProvider.name;
  const reviewerProviderName = routing.reviewer ?? baseProvider.name;

  const planner = createProvider({ ...baseProvider, name: plannerProviderName });
  const coder = createProvider({ ...baseProvider, name: coderProviderName });
  const reviewer = createProvider({ ...baseProvider, name: reviewerProviderName });

  return {
    planner,
    coder,
    reviewer,
    config: routing,
  };
}

export class Orchestrator {
  readonly planner: Provider;
  readonly coder: Provider;
  readonly reviewer: Provider;

  constructor(router: RouterState) {
    this.planner = router.planner;
    this.coder = router.coder;
    this.reviewer = router.reviewer;
  }

  async plan(task: string): Promise<string> {
    // Use planner provider to create a plan
    const result = await this.planner.chat([
      { role: "system", content: "You are a task planner. Create a step-by-step plan." },
      { role: "user", content: `Plan this task: ${task}` },
    ]);
    return result.content;
  }

  async code(task: string): Promise<string> {
    // Use coder provider to implement
    const result = await this.coder.chat([
      { role: "system", content: "You are an expert programmer. Write clean, efficient code." },
      { role: "user", content: task },
    ]);
    return result.content;
  }

  async review(code: string): Promise<string> {
    // Use reviewer provider to review
    const result = await this.reviewer.chat([
      { role: "system", content: "You are a code reviewer. Find bugs, security issues, and improvements." },
      { role: "user", content: `Review this code:\n${code}` },
    ]);
    return result.content;
  }
}
