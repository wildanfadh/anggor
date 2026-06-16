/**
 * Extension Registry
 *
 * Manages loaded extensions and provides access to their capabilities.
 */

import type { Extension, ExtensionTool, ExtensionHook } from "./types.js";
import type { Provider } from "../providers/index.js";

export class ExtensionRegistry {
	private extensions = new Map<string, Extension>();
	private tools = new Map<string, ExtensionTool>();
	private providers = new Map<string, Provider>();
	private hooks = new Map<string, ExtensionHook[]>();

	register(extension: Extension): void {
		this.extensions.set(extension.meta.name, extension);

		// Register tools
		if (extension.tools) {
			for (const tool of extension.tools) {
				this.tools.set(tool.name, tool);
			}
		}

		// Register provider
		if (extension.provider) {
			this.providers.set(extension.meta.name, extension.provider);
		}

		// Register hooks
		if (extension.hooks) {
			for (const hook of extension.hooks) {
				const existing = this.hooks.get(hook.event) ?? [];
				existing.push(hook);
				this.hooks.set(hook.event, existing);
			}
		}
	}

	unregister(name: string): void {
		const extension = this.extensions.get(name);
		if (!extension) return;

		// Remove tools
		if (extension.tools) {
			for (const tool of extension.tools) {
				this.tools.delete(tool.name);
			}
		}

		// Remove provider
		this.providers.delete(name);

		// Remove hooks
		if (extension.hooks) {
			for (const hook of extension.hooks) {
				const existing = this.hooks.get(hook.event) ?? [];
				const filtered = existing.filter((h) => h !== hook);
				if (filtered.length > 0) {
					this.hooks.set(hook.event, filtered);
				} else {
					this.hooks.delete(hook.event);
				}
			}
		}

		// Call deactivate
		if (extension.deactivate) {
			extension.deactivate();
		}

		this.extensions.delete(name);
	}

	getExtension(name: string): Extension | null {
		return this.extensions.get(name) ?? null;
	}

	getTool(name: string): ExtensionTool | null {
		return this.tools.get(name) ?? null;
	}

	getProvider(name: string): Provider | null {
		return this.providers.get(name) ?? null;
	}

	getHooks(event: string): ExtensionHook[] {
		return this.hooks.get(event) ?? [];
	}

	listExtensions(): Extension[] {
		return [...this.extensions.values()];
	}

	listTools(): ExtensionTool[] {
		return [...this.tools.values()];
	}

	listProviders(): Array<{ name: string; provider: Provider }> {
		return [...this.providers.entries()].map(([name, provider]) => ({ name, provider }));
	}

	async triggerHooks(event: string, ...args: unknown[]): Promise<void> {
		const hooks = this.getHooks(event);
		for (const hook of hooks) {
			await hook.handler(...args);
		}
	}
}
