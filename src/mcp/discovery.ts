/**
 * MCP Discovery
 *
 * V1.1: discovers MCP servers from config and manages their lifecycle.
 */

import { McpClient, type McpServerConfig, type McpTool } from "./client.js";

export type { McpServerConfig } from "./client.js";

export interface McpServerInfo {
  name: string;
  config: McpServerConfig;
  client: McpClient;
  connected: boolean;
  tools: McpTool[];
  serverInfo: { name: string; version: string } | null;
}

export class McpDiscovery {
  private servers = new Map<string, McpServerInfo>();

  async register(name: string, config: McpServerConfig): Promise<void> {
    if (this.servers.has(name)) {
      throw new Error(`MCP server already registered: ${name}`);
    }

    const client = new McpClient(config);

    this.servers.set(name, {
      name,
      config,
      client,
      connected: false,
      tools: [],
      serverInfo: null,
    });
  }

  async connect(name: string): Promise<void> {
    const info = this.servers.get(name);
    if (!info) throw new Error(`MCP server not registered: ${name}`);

    if (info.connected) return;

    await info.client.connect();

    info.connected = true;
    info.tools = info.client.getTools();
    info.serverInfo = info.client.getServerInfo();
  }

  async connectAll(): Promise<void> {
    const names = [...this.servers.keys()];
    await Promise.all(names.map((name) => this.connect(name)));
  }

  async disconnect(name: string): Promise<void> {
    const info = this.servers.get(name);
    if (!info) return;

    if (info.connected) {
      await info.client.disconnect();
    }

    info.connected = false;
    info.tools = [];
  }

  async disconnectAll(): Promise<void> {
    const names = [...this.servers.keys()];
    await Promise.all(names.map((name) => this.disconnect(name)));
  }

  async remove(name: string): Promise<void> {
    await this.disconnect(name);
    this.servers.delete(name);
  }

  listServers(): string[] {
    return [...this.servers.keys()];
  }

  getServer(name: string): McpServerInfo | null {
    return this.servers.get(name) ?? null;
  }

  getTools(name: string): McpTool[] {
    const info = this.servers.get(name);
    return info ? [...info.tools] : [];
  }

  getAllTools(): Array<{ server: string; tool: McpTool }> {
    const result: Array<{ server: string; tool: McpTool }> = [];

    for (const [name, info] of this.servers) {
      for (const tool of info.tools) {
        result.push({ server: name, tool });
      }
    }

    return result;
  }

  async callTool(server: string, toolName: string, args?: Record<string, unknown>): Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }> {
    const info = this.servers.get(server);
    if (!info) throw new Error(`MCP server not found: ${server}`);

    if (!info.connected) {
      await this.connect(server);
    }

    return info.client.callTool(toolName, args);
  }
}
