import type { ParsedCommand } from "./types.js";
import type { RuntimeContext } from "../runtime.js";
import { Agent } from "../agent/core.js";
import { SessionMemory } from "../agent/memory.js";
import { loadMemory as loadPersistent, applyLoadedState } from "../memory/bank.js";
import { printPlanHeader, printCompletion } from "../ui/stream.js";
import { printInfo, printMuted, printWarning } from "../ui/output.js";
import { createInterruptHandler, registerSimpleInterrupt } from "../utils/interrupt.js";

function hasDryRunFlag(command: ParsedCommand): boolean {
  return command.flags.includes("dryRun");
}

function getProviderLabel(context: RuntimeContext): string {
  return `${context.config.provider.name}/${context.config.provider.model}`;
}

export async function routeCommand(
  command: ParsedCommand,
  context: RuntimeContext
): Promise<void> {
  const dryRun = hasDryRunFlag(command);

  switch (command.name) {
    case "chat":
      registerSimpleInterrupt();
      printInfo(`Starting interactive chat mode with ${getProviderLabel(context)}...`);
      printMuted("Chat mode not implemented yet. Use one-shot mode.");
      return;

    case "oneshot": {
      const agent = new Agent({ config: context.config, dryRun });
      const interrupt = createInterruptHandler(agent);
      interrupt.register();

      try {
        if (dryRun) {
          printInfo("Dry-run mode: showing plan without executing");
          const result = await agent.planOnly(command.prompt);
          printPlanHeader(command.prompt, 4);
          console.log(result.message);
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

    case "plan": {
      registerSimpleInterrupt();
      const agent = new Agent({ config: context.config, dryRun: true });
      const result = await agent.planOnly(command.prompt);
      printPlanHeader(command.prompt, 4);
      console.log(result.message);
      return;
    }

    case "review":
      registerSimpleInterrupt();
      printInfo("Reviewing current changes...");
      printMuted("Review mode not implemented yet.");
      return;

    case "explain":
      registerSimpleInterrupt();
      printInfo(`Explaining file: ${command.target}`);
      printMuted("Explain mode not implemented yet.");
      return;

    case "commit":
      registerSimpleInterrupt();
      printInfo("Generating commit message...");
      printMuted("Commit mode not implemented yet.");
      return;

    case "status": {
      registerSimpleInterrupt();
      const agent = new Agent({ config: context.config });
      console.log(agent.getStatus());
      return;
    }

    case "resume": {
      registerSimpleInterrupt();
      const saved = await loadPersistent();

      if (!saved) {
        printWarning("No previous session found.");
        return;
      }

      printInfo(`Resuming session from ${new Date(saved.updatedAt).toLocaleString()}`);
      printMuted(`Previous CWD: ${saved.cwd}`);
      printMuted(`Messages: ${saved.messages.length} | Tool calls: ${saved.toolCalls.length} | Todos: ${saved.todos.length}`);

      if (saved.summary) {
        printMuted(`Summary: ${saved.summary}`);
      }

      const memory = new SessionMemory();
      applyLoadedState(memory, saved);

      const agent = new Agent({ config: context.config });
      // Restore memory into agent
      for (const msg of saved.messages) {
        agent.memory.addMessage(msg.role, msg.content);
      }
      for (const todo of saved.todos) {
        agent.todos.addTodo(todo.task);
      }

      printInfo(`Session restored. Use "${saved.messages.length > 0 ? saved.messages[saved.messages.length - 1]?.content.slice(0, 50) : "anggor"}" as context.`);
      return;
    }

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
        printMuted("MCP add command not implemented yet. Add servers to anggor.config.json.");
        return;
      }

      if (subcommand === "remove") {
        printMuted("MCP remove command not implemented yet. Remove servers from anggor.config.json.");
        return;
      }

      printMuted(`Unknown MCP subcommand: ${subcommand}`);
      return;
    }

    case "skill":
      registerSimpleInterrupt();
      printInfo(`Skill command: ${command.subcommand ?? "list"}`);
      printMuted("Skills not implemented yet.");
      return;

    case "provider":
      registerSimpleInterrupt();
      printInfo(
        `Provider command: ${command.subcommand ?? "list"} (active: ${getProviderLabel(context)})`
      );
      return;
  }
}
