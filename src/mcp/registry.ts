/**
 * MCP Registry
 *
 * V1.1: manages active MCP server connections and tool schemas.
 */

import { McpDiscovery, type McpServerInfo, type McpServerConfig } from "./discovery.js";
import type { McpTool } from "./client.js";

export class McpRegistry {
  private discovery = new McpDiscovery();

  async loadFromConfig(servers: Record<string, unknown>): Promise<void> {
    for (const [name, rawConfig] of Object.entries(servers)) {
      if (!rawConfig || typeof rawConfig !== "object") continue;

      const config = rawConfig as Record<string, unknown>;
      const command = config.command as string | undefined;
      const args = config.args as string[] | undefined;
      const env = config.env as Record<string, string> | undefined;

      if (!command) continue;

      const serverConfig: McpServerConfig = { command };
      if (args) serverConfig.args = args;
      if (env) serverConfig.env = env;

      await this.discovery.register(name, serverConfig);
    }
  }

  async connectAll(): Promise<void> {
    await this.discovery.connectAll();
  }

  async disconnectAll(): Promise<void> {
    await this.discovery.disconnectAll();
  }

  listServers(): string[] {
    return this.discovery.listServers();
  }

  getServer(name: string): McpServerInfo | null {
    return this.discovery.getServer(name);
  }

  getAllTools(): Array<{ server: string; tool: McpTool }> {
    return this.discovery.getAllTools();
  }

  getDiscovery(): McpDiscovery {
    return this.discovery;
  }
}
