/**
 * Extension System Types
 *
 * Unified extension interface that consolidates Skills, Plugins, and MCP.
 */

import type { Provider } from "../providers/index.js";

export interface ExtensionMeta {
	name: string;
	version: string;
	description?: string;
	author?: string;
	type: "skill" | "plugin" | "mcp" | "hybrid";
}

export interface ExtensionTool {
	name: string;
	description: string;
	execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ExtensionHook {
	event: string;
	handler: (...args: unknown[]) => void | Promise<void>;
}

export interface ExtensionContext {
	registerTool(tool: ExtensionTool): void;
	registerProvider(provider: Provider): void;
	registerHook(hook: ExtensionHook): void;
	getConfig(): Record<string, unknown>;
	getLogger(): { info: (msg: string) => void; error: (msg: string) => void };
}

export interface Extension {
	meta: ExtensionMeta;
	activate(context: ExtensionContext): void | Promise<void>;
	deactivate?(): void | Promise<void>;
	tools?: ExtensionTool[];
	provider?: Provider;
	hooks?: ExtensionHook[];
}

export interface ExtensionManifest {
	name: string;
	version: string;
	description?: string;
	author?: string;
	type?: "skill" | "plugin" | "mcp" | "hybrid";
	main?: string;
	tools?: Array<{ name: string; description: string }>;
	mcp?: {
		command: string;
		args?: string[];
		env?: Record<string, string>;
	};
}

export interface InstalledExtension {
	name: string;
	path: string;
	manifest: ExtensionManifest;
	extension?: Extension;
}
