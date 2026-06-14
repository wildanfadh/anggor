/**
 * Plugin System
 *
 * V2.0: plugin loader and sandbox.
 * Plugins are JS/TS modules that add tools, providers, or hooks.
 */

import { readdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface PluginMeta {
  name: string;
  version: string;
  description?: string;
  tools?: string[];
  provider?: string;
}

export interface Plugin {
  meta: PluginMeta;
  module: Record<string, unknown>;
}

function pluginsDir(): string {
  return join(homedir(), ".anggor", "plugins");
}

export class PluginLoader {
  private plugins = new Map<string, Plugin>();

  async loadAll(): Promise<string[]> {
    const names: string[] = [];

    try {
      const entries = await readdir(pluginsDir(), { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".ts"))) {
          try {
            const plugin = await this.loadPlugin(join(pluginsDir(), entry.name));
            if (plugin) {
              this.plugins.set(plugin.meta.name, plugin);
              names.push(plugin.meta.name);
            }
          } catch {
            // Skip invalid plugins
          }
        }
      }
    } catch {
      // Plugins dir doesn't exist
    }

    return names;
  }

  async loadPlugin(path: string): Promise<Plugin | null> {
    try {
      await access(path, constants.R_OK);
    } catch {
      return null;
    }

    // Dynamic import for the plugin module
    const module = await import(path);

    const meta: PluginMeta = module.meta ?? module.default?.meta ?? {
      name: path.split("/").pop()?.replace(/\.(js|ts)$/, "") ?? "unknown",
      version: "0.1.0",
    };

    return { meta, module };
  }

  get(name: string): Plugin | null {
    return this.plugins.get(name) ?? null;
  }

  list(): PluginMeta[] {
    return [...this.plugins.values()].map((p) => p.meta);
  }

  /**
   * Execute a plugin tool call (sandboxed via simple try/catch).
   * In production, use isolated-vm or worker threads.
   */
  async executeTool(pluginName: string, toolName: string, args: unknown): Promise<unknown> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) throw new Error(`Plugin not found: ${pluginName}`);

    const tool = plugin.module[toolName] as ((...args: unknown[]) => unknown) | undefined;
    if (!tool || typeof tool !== "function") {
      throw new Error(`Tool not found in plugin: ${toolName}`);
    }

    return tool(args);
  }
}
