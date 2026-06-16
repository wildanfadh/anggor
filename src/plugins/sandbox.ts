/**
 * Plugin Sandbox
 *
 * V2.0: Isolated execution environment for plugins.
 * In production, this would use isolated-vm or worker_threads.
 * Current implementation uses try/catch sandboxing.
 */

import type { Plugin, PluginMeta } from "./loader.js";

// ---------------------------------------------------------------------------
// Sandbox
// ---------------------------------------------------------------------------

export interface SandboxOptions {
	/** Maximum execution time in milliseconds */
	timeout?: number;
	/** Allowed globals exposed to the plugin */
	globals?: string[];
}

export interface SandboxResult<T = unknown> {
	success: boolean;
	result?: T;
	error?: string;
	duration: number;
}

export class PluginSandbox {
	constructor(private readonly options: SandboxOptions = {}) {}

	/**
	 * Execute a plugin's tool function with timeout and error isolation.
	 */
	async execute<T = unknown>(plugin: Plugin, toolName: string, args: unknown): Promise<SandboxResult<T>> {
		const startTime = performance.now();
		const timeout = this.options.timeout ?? 30_000;

		try {
			const tool = plugin.module[toolName] as ((...a: unknown[]) => unknown) | undefined;

			if (!tool || typeof tool !== "function") {
				return {
					success: false,
					error: `Tool "${toolName}" not found in plugin "${plugin.meta.name}"`,
					duration: Math.round(performance.now() - startTime),
				};
			}

			// Execute with timeout
			const result = await this.executeWithTimeout<T>(tool, args, timeout);
			return {
				success: true,
				result,
				duration: Math.round(performance.now() - startTime),
			};
		} catch (error: unknown) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				duration: Math.round(performance.now() - startTime),
			};
		}
	}

	/**
	 * Execute a function with a timeout.
	 */
	private async executeWithTimeout<T>(
		fn: (...args: unknown[]) => unknown,
		args: unknown,
		timeoutMs: number,
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`Plugin execution timed out after ${timeoutMs}ms`));
			}, timeoutMs);

			try {
				const result = fn(args);
				clearTimeout(timer);

				if (result instanceof Promise) {
					result
						.then((r) => {
							clearTimeout(timer);
							resolve(r as T);
						})
						.catch((e) => {
							clearTimeout(timer);
							reject(e);
						});
				} else {
					resolve(result as T);
				}
			} catch (error) {
				clearTimeout(timer);
				reject(error);
			}
		});
	}

	/**
	 * Validate a plugin's metadata before loading.
	 */
	validate(meta: PluginMeta): boolean {
		if (!meta.name || typeof meta.name !== "string") return false;
		if (!meta.version || typeof meta.version !== "string") return false;
		return true;
	}
}
