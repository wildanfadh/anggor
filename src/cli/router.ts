import type { ParsedCommand } from "./types.js";
import type { RuntimeContext } from "../runtime.js";
import { Agent } from "../agent/core.js";
import { SessionMemory } from "../agent/memory.js";
import { loadMemory as loadPersistent, applyLoadedState } from "../memory/bank.js";
import { printPlanHeader, printCompletion } from "../ui/stream.js";
import { printInfo, printMuted, printWarning, printSuccess } from "../ui/output.js";
import { createInterruptHandler, registerSimpleInterrupt } from "../utils/interrupt.js";
import { gitCommit, gitStatus } from "../tools/git.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasDryRunFlag(command: ParsedCommand): boolean {
  return command.flags.includes("dryRun");
}

function getProviderLabel(context: RuntimeContext): string {
  return `${context.config.provider.name}/${context.config.provider.model}`;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function routeCommand(
  command: ParsedCommand,
  context: RuntimeContext
): Promise<void> {
  const dryRun = hasDryRunFlag(command);

  switch (command.name) {
    // =====================================================================
    // Interactive chat mode
    // =====================================================================
    case "chat": {
      registerSimpleInterrupt();
      printInfo(
        `Starting interactive chat mode with ${getProviderLabel(context)}...`
      );
      printMuted(
        "Type your message and press Enter. Empty line to exit, Ctrl+C to abort."
      );
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
          printWarning(
            `Error: ${error instanceof Error ? error.message : String(error)}`
          );
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
          printPlanHeader(command.prompt, 4);
          console.log(result.message);
        } else {
          printInfo(
            `Running with ${getProviderLabel(context)}: ${command.prompt}`
          );
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
      printPlanHeader(command.prompt, 4);
      console.log(result.message);
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

        printInfo(`Found ${status.files.length} changed files:`);
        for (const f of status.files) {
          const icon =
            f.worktree === "?" ? "+" : f.worktree === "M" ? "~" : " ";
          printMuted(`  ${icon} ${f.path}`);
        }
      } catch (error: unknown) {
        printWarning(
          `Could not get git status: ${error instanceof Error ? error.message : String(error)}`
        );
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
          const truncated =
            content.length > 4000
              ? content.slice(0, 4000) + "\n... (truncated)"
              : content;

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
          printWarning(
            `Could not explain file: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        printMuted("Provider not configured. Cannot explain files.");
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
        // Get git status and diff
        const status = await gitStatus();
        if (status.files.length === 0) {
          printMuted("No changes to commit. Working tree is clean.");
          return;
        }

        // Get diff for context
        const { gitDiff } = await import("../tools/git.js");
        const diff = await gitDiff();

        if (context.provider) {
          // LLM-powered commit message
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

          // Auto-commit with confirmation
          const readline = await import("node:readline");
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer = await new Promise<string>((resolve) => {
            rl.question("\nCommit with this message? [Y/n] ", resolve);
          });
          rl.close();

          if (answer.toLowerCase() !== "n" && answer.toLowerCase() !== "no") {
            const result = await gitCommit(message);
            printSuccess(`Committed: ${result.shortHash}`);
          } else {
            printMuted("Commit cancelled.");
          }
        } else {
          // Heuristic commit: use first changed file as hint
          const firstFile = status.files[0]?.path ?? "update";
          const defaultMsg = `chore: update ${firstFile}`;
          printInfo(`Suggested commit message (no LLM):\n  ${defaultMsg}`);

          const readline = await import("node:readline");
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer = await new Promise<string>((resolve) => {
            rl.question("\nEnter commit message (or press Enter for default): ", resolve);
          });
          rl.close();

          const message = answer.trim() || defaultMsg;
          const result = await gitCommit(message);
          printSuccess(`Committed: ${result.shortHash}`);
        }
      } catch (error: unknown) {
        printWarning(
          `Commit failed: ${error instanceof Error ? error.message : String(error)}`
        );
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

      printInfo(
        `Resuming session from ${new Date(saved.updatedAt).toLocaleString()}`
      );
      printMuted(`Previous CWD: ${saved.cwd}`);
      printMuted(
        `Messages: ${saved.messages.length} | Tool calls: ${saved.toolCalls.length} | Todos: ${saved.todos.length}`
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
          return;
        }

        printInfo(`MCP servers (${names.length}):`);
        for (const name of names) {
          const raw = mcpServers[name] as Record<string, unknown> | undefined;
          printMuted(`  ${name} → ${raw?.command ?? "unknown"}`);
        }
        return;
      }

      if (subcommand === "add") {
        printMuted(
          "MCP add: Add servers to .anggor.json under mcpServers."
        );
        return;
      }

      if (subcommand === "remove") {
        printMuted(
          "MCP remove: Remove servers from .anggor.json under mcpServers."
        );
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
      printInfo(`Skill command: ${command.subcommand ?? "list"}`);
      printMuted("Skills available in V2.0. Built-in: reviewer, refactor, tester, architect, security.");
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
          { name: "custom", models: "OpenAI-compatible endpoint" },
        ];

        const active = context.config.provider.name;
        printInfo(`Available providers (active: ${active}):`);
        for (const p of providers) {
          const marker = p.name === active ? " *" : "  ";
          printMuted(`${marker} ${p.name} → ${p.models}`);
        }
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
          "custom",
        ];

        if (!validProviders.includes(targetProvider)) {
          printWarning(
            `Unknown provider: ${targetProvider}. Valid: ${validProviders.join(", ")}`
          );
          return;
        }

        // For now, instruct user to update config
        printInfo(
          `To switch to ${targetProvider}, update your .anggor.json:`
        );
        printMuted(`  "provider": { "name": "${targetProvider}" }`);
        printMuted(
          `  Then set the appropriate API key (e.g., ${targetProvider.toUpperCase()}_API_KEY env var).`
        );
        return;
      }

      printMuted(`Unknown provider subcommand: ${subcommand}`);
      return;
    }
  }
}
