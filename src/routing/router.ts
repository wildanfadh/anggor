/**
 * Routing Router
 *
 * V2.0: Router abstraction for multi-provider routing.
 * Delegates to the Orchestrator for plan/code/review task routing.
 * Provides a thin wrapper for the `routing` config section.
 */

import type { Config } from "../config/schema.js";
import { createRouter, Orchestrator } from "./orchestrator.js";

export interface RouteTarget {
	provider: string;
	model?: string;
}

export interface RouteRequest {
	task: string;
	/** Which phase: plan, code, or review */
	phase: "plan" | "code" | "review";
}

/**
 * Create a router from the config. Returns the Orchestrator
 * which can then be used to plan(), code(), or review().
 */
export function createRouteHandler(config: Config): Orchestrator {
	const routerState = createRouter(config);
	return new Orchestrator(routerState);
}

/**
 * Determine which provider should handle a given phase.
 */
export function resolveProvider(config: Config, phase: "planner" | "coder" | "reviewer"): string {
	return config.routing?.[phase] ?? config.provider.name;
}
