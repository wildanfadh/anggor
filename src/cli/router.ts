import { Agent } from "../agent/core.js";
import { SessionMemory } from "../agent/memory.js";
import { applyLoadedState, loadMemory as loadPersistent } from "../memory/bank.js";
import type { RuntimeContext } from "../runtime.js";
import { gitCommit, gitStatus } from "../tools/git.js";
import { printSteps } from "../ui/cliui.js";
import { printInfo, printMuted, printProviderTable, printSuccess, printWarning } from "../ui/output.js";
import { confirm, isCancel, text } from "../ui/prompts.js";
import { printCompletion, printPlanHeader } from "../ui/stream.js";
import { createInterruptHandler, registerSimpleInterrupt } from "../utils/interrupt.js";
import type { ParsedCommand } from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasDryRunFlag(command: ParsedCommand): boolean {
	return command.flags.includes("dryRun");
}

function getProviderLabel(context: RuntimeContext): string {
	return `${context.config.provider.name}/${context.config.provider.model}`;
}

/**
 * Print an actionable provider / API key error message.
 */
async function printProviderKeyError(providerName: string, model: string): Promise<void> {
	const envVarMap: Record<string, string> = {
		openai: "OPENAI_API_KEY",
		anthropic: "ANTHROPIC_API_KEY",
		google: "GOOGLE_API_KEY",
		ollama: "OLLAMA_HOST",
		openrouter: "OPENROUTER_API_KEY",
		groq: "GROQ_API_KEY",
		deepseek: "DEEPSEEK_API_KEY",
		azure: "AZURE_API_KEY",
		opencode: "OPENCODE_API_KEY",
		commandcode: "COMMANDCODE_API_KEY",
		mimo: "MIMO_API_KEY",
		mimosgp: "MIMOSGP_API_KEY",
	};

	const envVar = envVarMap[providerName] ?? `${providerName.toUpperCase()}_API_KEY`;

	const { printSection } = await import("../ui/cliui.js");
	printSection("Missing provider key", [
		`Provider : ${providerName}`,
		`Model    : ${model}`,
		`Env var  : ${envVar}`,
		"",
		"Fix:",
		`  export ${envVar}="sk-..."`,
		"",
		"Or edit .anggor.json:",
		`  { "provider": { "apiKey": "env:${envVar}" } }`,
	]);

	// Also show provider list hint
	printMuted("Run `anggor provider list` to see available providers.");
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function routeCommand(command: ParsedCommand, context: RuntimeContext): Promise<void> {
	const dryRun = hasDryRunFlag(command);

	switch (command.name) {
		// =====================================================================
		// Interactive chat mode
		// =====================================================================
		case "chat": {
			registerSimpleInterrupt();
			printInfo(`Starting interactive chat mode with ${getProviderLabel(context)}...`);
			printMuted("Type your message and press Enter. Empty line to exit, Ctrl+C to abort.");
			printMuted("");

			// Read lines interactively
			const readline = await import("node:readline");
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
				prompt: "\n> ",
			});

			let running = true;
			let agent: Agent | null = null;

			const askQuestion = (): Promise<string> =>
				new Promise((resolve) => {
					rl.question("\n> ", (answer: string) => {
						resolve(answer.trim());
					});
				});

			while (running) {
				const input = await askQuestion();

				if (!input) {
					running = false;
					break;
				}

				if (input === "/exit" || input === "/quit") {
					running = false;
					break;
				}

				if (input === "/status") {
					if (agent) {
						console.log(agent.getStatus());
					} else {
						printMuted("No active agent session.");
					}
					continue;
				}

				// Execute as one-shot
				agent = new Agent({
					config: context.config,
					provider: context.provider,
				});

				try {
					const result = await agent.execute(input);
					printCompletion(result.success, result.message, result.duration);
				} catch (error: unknown) {
					printWarning(`Error: ${error instanceof Error ? error.message : String(error)}`);
				}
			}

			rl.close();
			printInfo("Chat session ended.");
			return;
		}

		// =====================================================================
		// One-shot mode
		// =====================================================================
		case "oneshot": {
			const agent = new Agent({
				config: context.config,
				provider: context.provider,
				dryRun,
			});
			const interrupt = createInterruptHandler(agent);
			interrupt.register();

			try {
				if (dryRun) {
					printInfo("Dry-run mode: showing plan without executing");
					const result = await agent.planOnly(command.prompt);

					// Extract steps from the plan result
					const steps = result.message
						.split("\n")
						.filter((line) => /^\s*\d+\./.test(line))
						.map((line) => line.replace(/^\s*\d+\.\s*/, ""));

					if (steps.length > 0) {
						const { printSteps: ps } = await import("../ui/cliui.js");
						ps(`DRY RUN  ${command.prompt}`, steps);
					} else {
						printPlanHeader(command.prompt, 4);
						console.log(result.message);
					}
				} else {
					printInfo(`Running with ${getProviderLabel(context)}: ${command.prompt}`);
					const result = await agent.execute(command.prompt);

					if (interrupt.isInterrupted()) {
						printWarning("Execution was interrupted.");
					}

					printCompletion(result.success, result.message, result.duration);
				}
			} finally {
				interrupt.unregister();
			}
			return;
		}

		// =====================================================================
		// Plan mode
		// =====================================================================
		case "plan": {
			registerSimpleInterrupt();
			const agent = new Agent({
				config: context.config,
				provider: context.provider,
				dryRun: true,
			});
			const result = await agent.planOnly(command.prompt);

			// Extract steps from the plan result
			const steps = result.message
				.split("\n")
				.filter((line) => /^\s*\d+\./.test(line))
				.map((line) => line.replace(/^\s*\d+\.\s*/, ""));

			if (steps.length > 0) {
				printSteps(`PLAN  ${command.prompt}`, steps);
			} else {
				printPlanHeader(command.prompt, 4);
				console.log(result.message);
			}
			return;
		}

		// =====================================================================
		// Review current changes
		// =====================================================================
		case "review": {
			registerSimpleInterrupt();
			printInfo("Reviewing current changes...");
			try {
				const status = await gitStatus();
				if (status.files.length === 0) {
					printMuted("No changes to review. Working tree is clean.");
					return;
				}

				const { printTable } = await import("../ui/cliui.js");
				const headers = ["Status", "File"];
				const rows = status.files.map((f) => [
					f.worktree === "?" ? "A" : f.worktree === "M" ? "M" : f.worktree,
					f.path,
				]);
				printTable(headers, rows);
			} catch (error: unknown) {
				printWarning(`Could not get git status: ${error instanceof Error ? error.message : String(error)}`);
			}
			return;
		}

		// =====================================================================
		// Explain a file
		// =====================================================================
		case "explain": {
			registerSimpleInterrupt();
			printInfo(`Explaining file: ${command.target}`);

			if (context.provider) {
				try {
					const { readFile } = await import("node:fs/promises");
					const content = await readFile(command.target, "utf8");
					const truncated = content.length > 4000 ? `${content.slice(0, 4000)}\n... (truncated)` : content;

					const response = await context.provider.chat([
						{
							role: "system",
							content:
								"You are a code explainer. Explain what the following file does. Be concise and focus on architecture, key functions, and patterns.",
						},
						{
							role: "user",
							content: `Explain this file:\n\n\`\`\`\n${truncated}\n\`\`\``,
						},
					]);

					console.log(`\n${response.content}\n`);
				} catch (error: unknown) {
					const errMsg = error instanceof Error ? error.message : String(error);

					if (
						errMsg.includes("API key") ||
						errMsg.includes("Incorrect API key") ||
						errMsg.includes("401") ||
						errMsg.includes("Unauthorized")
					) {
						await printProviderKeyError(context.config.provider.name, context.config.provider.model ?? "unknown");
					} else {
						printWarning(`Could not explain file: ${errMsg}`);
					}
				}
			} else {
				printMuted("Provider not configured. Cannot explain files.");
				printMuted("Run `anggor provider use <name>` to set a provider.");
			}
			return;
		}

		// =====================================================================
		// Generate commit message
		// =====================================================================
		case "commit": {
			registerSimpleInterrupt();
			printInfo("Generating commit message...");

			try {
				const status = await gitStatus();
				if (status.files.length === 0) {
					printMuted("No changes to commit. Working tree is clean.");
					return;
				}

				const { gitDiff } = await import("../tools/git.js");
				const diff = await gitDiff();

				// Show changed files as a table
				const { printTable } = await import("../ui/cliui.js");
				const fileRows = status.files.map((f) => [`${f.index}${f.worktree}`, f.path]);
				printTable(["Status", "File"], fileRows);

				if (context.provider) {
					const response = await context.provider.chat([
						{
							role: "system",
							content:
								"Generate a concise conventional commit message (type(scope): description) for the following changes. Only output the commit message, nothing else.",
						},
						{
							role: "user",
							content: `Changed files:\n${status.files.map((f) => `  ${f.index}${f.worktree} ${f.path}`).join("\n")}\n\nDiff:\n${diff.slice(0, 3000)}`,
						},
					]);

					const message = response.content.trim();
					printInfo(`Suggested commit message:\n  ${message}`);

					// Use @clack/prompts for confirmation
					const shouldCommit = await confirm(`Commit with this message?`);

					if (isCancel(shouldCommit) || !shouldCommit) {
						printMuted("Commit cancelled.");
						return;
					}

					const result = await gitCommit(message);
					printSuccess(`Committed: ${result.shortHash}`);
				} else {
					const firstFile = status.files[0]?.path ?? "update";
					const defaultMsg = `chore: update ${firstFile}`;
					printInfo(`No LLM provider configured.`);

					const customMsg = await text({
						message: "Enter commit message",
						placeholder: defaultMsg,
						defaultValue: defaultMsg,
					});

					if (isCancel(customMsg)) {
						printMuted("Commit cancelled.");
						return;
					}

					const finalMessage = typeof customMsg === "string" ? customMsg.trim() : "";
					if (!finalMessage) {
						printMuted("No message provided. Commit cancelled.");
						return;
					}

					const result = await gitCommit(finalMessage);
					printSuccess(`Committed: ${result.shortHash}`);
				}
			} catch (error: unknown) {
				printWarning(`Commit failed: ${error instanceof Error ? error.message : String(error)}`);
			}
			return;
		}

		// =====================================================================
		// Show status
		// =====================================================================
		case "status": {
			registerSimpleInterrupt();
			const agent = new Agent({ config: context.config });
			console.log(agent.getStatus());
			return;
		}

		// =====================================================================
		// Resume previous session
		// =====================================================================
		case "resume": {
			registerSimpleInterrupt();
			const saved = await loadPersistent();

			if (!saved) {
				printWarning("No previous session found.");
				return;
			}

			printInfo(`Resuming session from ${new Date(saved.updatedAt).toLocaleString()}`);
			printMuted(`Previous CWD: ${saved.cwd}`);
			printMuted(
				`Messages: ${saved.messages.length} | Tool calls: ${saved.toolCalls.length} | Todos: ${saved.todos.length}`,
			);

			if (saved.summary) {
				printMuted(`Summary: ${saved.summary}`);
			}

			const memory = new SessionMemory();
			applyLoadedState(memory, saved);

			const agent = new Agent({
				config: context.config,
				provider: context.provider,
			});

			// Restore memory into agent
			for (const msg of saved.messages) {
				agent.memory.addMessage(msg.role, msg.content);
			}
			for (const todo of saved.todos) {
				agent.todos.addTodo(todo.task);
			}

			printInfo(`Session restored. Ready to continue.`);
			return;
		}

		// =====================================================================
		// MCP management
		// =====================================================================
		case "mcp": {
			registerSimpleInterrupt();
			const subcommand = command.subcommand ?? "list";

			if (subcommand === "list") {
				const mcpServers = context.config.mcpServers;
				const names = Object.keys(mcpServers);

				if (names.length === 0) {
					printMuted("No MCP servers configured.");
					printMuted('Add servers to your .anggor.json under "mcpServers".');
					return;
				}

				const { printTable } = await import("../ui/cliui.js");
				const rows = names.map((name) => {
					const raw = mcpServers[name] as Record<string, unknown> | undefined;
					return [name, String(raw?.command ?? "unknown")];
				});
				printTable(["Name", "Command"], rows);
				return;
			}

			if (subcommand === "add") {
				printMuted("MCP add: Add servers to .anggor.json under mcpServers.");
				return;
			}

			if (subcommand === "remove") {
				printMuted("MCP remove: Remove servers from .anggor.json under mcpServers.");
				return;
			}

			printMuted(`Unknown MCP subcommand: ${subcommand}`);
			return;
		}

		// =====================================================================
		// Skill management (V2.0 preview)
		// =====================================================================
		case "skill":
			registerSimpleInterrupt();
			{
				const subcommand = command.subcommand ?? "list";

				if (subcommand === "list") {
					const { SkillRegistry } = await import("../skills/loader.js");
					const registry = new SkillRegistry();
					await registry.loadBuiltins();

					const skills = registry.list();
					if (skills.length === 0) {
						printMuted("No skills installed.");
					} else {
						const { printTable } = await import("../ui/cliui.js");
						const rows = skills.map((s) => [s.name, "builtin", s.description]);
						printTable(["Name", "Source", "Description"], rows);
					}
				} else if (subcommand === "install") {
					printMuted("Skill install: coming soon via skill marketplace (V2.0).");
				} else if (subcommand === "remove") {
					printMuted("Skill remove: coming soon (V2.0).");
				} else if (subcommand === "run") {
					printMuted("Skill run: coming soon (V2.0).");
				} else if (subcommand === "search") {
					printMuted("Skill search: coming soon (V2.0).");
				} else {
					printMuted(`Unknown skill subcommand: ${subcommand}`);
				}
			}
			return;

		// =====================================================================
		// Provider management
		// =====================================================================
		case "provider": {
			registerSimpleInterrupt();
			const subcommand = command.subcommand ?? "list";

			if (subcommand === "list") {
				const providers = [
					{ name: "openai", models: "gpt-4o, gpt-4-turbo, gpt-3.5-turbo" },
					{ name: "anthropic", models: "claude-3-5-sonnet, claude-3-opus" },
					{ name: "google", models: "gemini-1.5-flash, gemini-1.5-pro" },
					{ name: "ollama", models: "llama3, mistral, codellama" },
					{ name: "openrouter", models: "Various (via OpenRouter)" },
					{ name: "groq", models: "llama3-70b, mixtral" },
					{ name: "deepseek", models: "deepseek-chat, deepseek-coder" },
					{ name: "azure", models: "gpt-4, gpt-3.5-turbo" },
					{ name: "opencode", models: "opencode-v1" },
					{ name: "commandcode", models: "commandcode-v1" },
					{ name: "mimo", models: "mimo-v1" },
					{ name: "mimosgp", models: "mimosgp-v1" },
					{ name: "custom", models: "OpenAI-compatible endpoint" },
				];

				const active = context.config.provider.name;
				printProviderTable(active, providers);
				return;
			}

			if (subcommand === "use") {
				const targetProvider = command.args?.[0];
				if (!targetProvider) {
					printMuted("Usage: anggor provider use <name>");
					return;
				}

				// Validate provider name
				const validProviders = [
					"openai",
					"anthropic",
					"google",
					"ollama",
					"openrouter",
					"groq",
					"deepseek",
					"azure",
					"opencode",
					"commandcode",
					"mimo",
					"mimosgp",
					"custom",
				];

				if (!validProviders.includes(targetProvider)) {
					printWarning(`Unknown provider: ${targetProvider}. Valid: ${validProviders.join(", ")}`);
					return;
				}

				// For now, instruct user to update config
				printInfo(`To switch to ${targetProvider}, update your .anggor.json:`);
				printMuted(`  "provider": { "name": "${targetProvider}" }`);
				printMuted(`  Then set the appropriate API key (e.g., ${targetProvider.toUpperCase()}_API_KEY env var).`);
				return;
			}

			printMuted(`Unknown provider subcommand: ${subcommand}`);
			return;
		}

		// =====================================================================
		// Cost tracking (V2.0)
		// =====================================================================
		case "cost": {
			registerSimpleInterrupt();
			const subcommand = command.subcommand ?? "show";

			if (subcommand === "show") {
				const { CostTracker } = await import("../cost/tracker.js");
				// In a real app, this would load from persistent storage
				const tracker = new CostTracker();
				const summary = tracker.getSummary();

				const { printTable } = await import("../ui/cliui.js");
				const rows: string[][] = [
					["Total tokens", String(summary.totalTokens)],
					["Total cost", `$${summary.totalCost.toFixed(4)}`],
				];

				for (const [provider, data] of Object.entries(summary.byProvider)) {
					rows.push([`  ${provider} tokens`, String(data.tokens)]);
					rows.push([`  ${provider} cost`, `$${data.cost.toFixed(4)}`]);
				}

				printTable(["Metric", "Value"], rows);
			} else if (subcommand === "reset") {
				const { CostTracker } = await import("../cost/tracker.js");
				const tracker = new CostTracker();
				tracker.reset();
				printSuccess("Cost tracking reset.");
			} else {
				printMuted(`Unknown cost subcommand: ${subcommand}`);
			}
			return;
		}

		// =====================================================================
		// Plugin management (V2.0)
		// =====================================================================
		case "plugin": {
			registerSimpleInterrupt();
			const subcommand = command.subcommand ?? "list";

			if (subcommand === "list") {
				const { PluginLoader } = await import("../plugins/loader.js");
				const loader = new PluginLoader();
				await loader.loadAll();

				const plugins = loader.list();
				if (plugins.length === 0) {
					printMuted("No plugins installed.");
					printMuted(
						"Place plugin .js/.ts files in ~/.anggor/plugins/. " +
							"Run `anggor plugin install <path>` to install.",
					);
				} else {
					const { printTable } = await import("../ui/cliui.js");
					const rows = plugins.map((p) => [p.name, p.version, p.description ?? ""]);
					printTable(["Name", "Version", "Description"], rows);
				}
			} else if (subcommand === "install") {
				const pluginPath = command.args?.[0];
				if (!pluginPath) {
					printMuted("Usage: anggor plugin install <path-to-plugin.js>");
					return;
				}

				try {
					const { PluginLoader } = await import("../plugins/loader.js");
					const loader = new PluginLoader();
					const plugin = await loader.loadPlugin(pluginPath);
					if (plugin) {
						printSuccess(`Plugin installed: ${plugin.meta.name}`);
					} else {
						printWarning("Could not load plugin from path.");
					}
				} catch (error: unknown) {
					printWarning(`Plugin install failed: ${error instanceof Error ? error.message : String(error)}`);
				}
			} else {
				printMuted(`Unknown plugin subcommand: ${subcommand}`);
			}
			return;
		}

		// =====================================================================
		// Config management
		// =====================================================================
		case "config": {
			registerSimpleInterrupt();
			const subcommand = command.subcommand ?? "show";

			if (subcommand === "set") {
				const key = command.args?.[0];
				const value = command.args?.[1];

				if (!key || !value) {
					printMuted("Usage: anggor config set <key> <value>");
					printMuted("Example: anggor config set approvalMode balanced");
					return;
				}

				printInfo(`To set config, edit your .anggor.json:`);
				printMuted(`  "${key}": "${value}"`);
				printMuted("Config file is located at .anggor.json in your project root.");
			} else if (subcommand === "show") {
				const { printTable } = await import("../ui/cliui.js");
				const rows: string[][] = [
					["Provider", context.config.provider.name],
					["Model", context.config.provider.model ?? "default"],
					["Max iterations", String(context.config.agent.maxIterations)],
					["Approval mode", context.config.agent.approvalMode],
					["Max context tokens", String(context.config.context.maxTokens)],
					["Scan depth", String(context.config.context.scanDepth)],
				];
				printTable(["Setting", "Value"], rows);
			} else {
				printMuted(`Unknown config subcommand: ${subcommand}. Use "show" or "set".`);
			}
			return;
		}
	}
}
