/**
 * MCP Transport
 *
 * V1.1: stdio transport for Model Context Protocol.
 * Spawns a subprocess and communicates via JSON-RPC over stdin/stdout.
 */

import { type ChildProcess, type SpawnOptions, spawn } from "node:child_process";
import { createInterface } from "node:readline";

export interface McpTransportOptions {
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
}

export interface McpMessage {
	jsonrpc: "2.0";
	id?: number | string;
	method?: string;
	params?: Record<string, unknown>;
	result?: unknown;
	error?: { code: number; message: string; data?: unknown };
}

export class McpTransport {
	private process: ChildProcess | null = null;
	private requestId = 0;
	private pending = new Map<number | string, { resolve: (v: McpMessage) => void; reject: (e: Error) => void }>();

	constructor(private readonly options: McpTransportOptions) {}

	async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			const spawnOpts: SpawnOptions = {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env, ...(this.options.env ?? {}) },
				cwd: this.options.cwd,
			};

			this.process = spawn(this.options.command, this.options.args ?? [], spawnOpts);

			if (!this.process.stdout || !this.process.stdin) {
				reject(new Error("Failed to spawn MCP server"));
				return;
			}

			const reader = createInterface({ input: this.process.stdout });
			reader.on("line", (line) => {
				try {
					const msg = JSON.parse(line) as McpMessage;
					this.handleMessage(msg);
				} catch {
					// Ignore non-JSON lines
				}
			});

			if (this.process.stderr) {
				this.process.stderr.on("data", () => {
					// MCP servers may log to stderr
				});
			}

			this.process.on("error", reject);
			this.process.on("exit", (code) => {
				if (code !== 0 && code !== null) {
					for (const [, pending] of this.pending) {
						pending.reject(new Error(`MCP server exited with code ${code}`));
					}
					this.pending.clear();
				}
			});

			// Mark as started once the process is spawned
			resolve();
		});
	}

	async stop(): Promise<void> {
		if (this.process) {
			for (const [, pending] of this.pending) {
				pending.reject(new Error("MCP transport stopped"));
			}
			this.pending.clear();

			this.process.kill();
			this.process = null;
		}
	}

	async send(method: string, params?: Record<string, unknown>): Promise<McpMessage> {
		if (!this.process?.stdin) {
			throw new Error("MCP transport not started");
		}

		const id = ++this.requestId;
		const request: McpMessage = {
			jsonrpc: "2.0",
			id,
			method,
			params,
		};

		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });

			this.process!.stdin!.write(`${JSON.stringify(request)}\n`);
		});
	}

	async notify(method: string, params?: Record<string, unknown>): Promise<void> {
		if (!this.process?.stdin) {
			throw new Error("MCP transport not started");
		}

		const notification: McpMessage = {
			jsonrpc: "2.0",
			method,
			params,
		};

		this.process.stdin.write(`${JSON.stringify(notification)}\n`);
	}

	private handleMessage(msg: McpMessage): void {
		if (msg.id !== undefined && this.pending.has(msg.id)) {
			const pending = this.pending.get(msg.id)!;
			this.pending.delete(msg.id);

			if (msg.error) {
				pending.reject(new Error(`MCP error: ${msg.error.message}`));
			} else {
				pending.resolve(msg);
			}
		}
	}
}
