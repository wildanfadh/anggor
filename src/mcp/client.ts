/**
 * MCP Client
 *
 * V1.1: Model Context Protocol client.
 * Connects to MCP servers and exposes their tools.
 */

import { McpTransport, type McpTransportOptions } from "./transport.js";

export interface McpServerConfig {
	command: string;
	args?: string[];
	env?: Record<string, string>;
}

export interface McpTool {
	name: string;
	description?: string;
	inputSchema?: Record<string, unknown>;
}

export interface McpToolResult {
	content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }>;
	isError?: boolean;
}

export class McpClient {
	private transport!: McpTransport;
	private connected = false;
	private serverInfo: { name: string; version: string } | null = null;
	private tools: McpTool[] = [];

	constructor(private readonly config: McpServerConfig) {}

	async connect(): Promise<void> {
		if (this.connected) return;

		const transportOpts: McpTransportOptions = {
			command: this.config.command,
			args: this.config.args,
			env: this.config.env,
		};

		this.transport = new McpTransport(transportOpts);
		await this.transport.start();

		// Initialize
		const initResult = await this.transport.send("initialize", {
			protocolVersion: "2024-11-05",
			capabilities: { tools: {} },
			clientInfo: { name: "anggor", version: "0.1.1" },
		});

		if (initResult.result) {
			this.serverInfo = initResult.result as { name: string; version: string };
		}

		// Send initialized notification
		await this.transport.notify("notifications/initialized");

		// Discover tools
		await this.discoverTools();

		this.connected = true;
	}

	async disconnect(): Promise<void> {
		if (!this.connected) return;

		await this.transport.stop();
		this.connected = false;
		this.tools = [];
		this.serverInfo = null;
	}

	getTools(): McpTool[] {
		return [...this.tools];
	}

	getServerInfo(): { name: string; version: string } | null {
		return this.serverInfo;
	}

	isConnected(): boolean {
		return this.connected;
	}

	async callTool(name: string, args?: Record<string, unknown>): Promise<McpToolResult> {
		if (!this.connected) {
			throw new Error("MCP client not connected");
		}

		const result = await this.transport.send("tools/call", {
			name,
			arguments: args ?? {},
		});

		return result.result as McpToolResult;
	}

	private async discoverTools(): Promise<void> {
		try {
			const result = await this.transport.send("tools/list");
			this.tools = (result.result as { tools: McpTool[] })?.tools ?? [];
		} catch {
			this.tools = [];
		}
	}
}
