/**
 * Extension System
 *
 * Unified extension interface consolidating Skills, Plugins, and MCP.
 */

export { ExtensionLoader } from "./loader.js";
export { ExtensionRegistry } from "./registry.js";
export type {
	Extension,
	ExtensionContext,
	ExtensionHook,
	ExtensionManifest,
	ExtensionMeta,
	ExtensionTool,
	InstalledExtension,
} from "./types.js";
