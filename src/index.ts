/**
 * Anggor - Fast, Local-First, Provider-Agnostic Autonomous Coding Agent
 */
import { CLI_VERSION, getHelpText, parseArgv } from "./cli/index.js";

export async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const parsed = parseArgv(argv);

  if (!parsed.ok) {
    console.error(`Error: ${parsed.error}`);
    console.error(`\n${getHelpText()}`);
    process.exitCode = 1;
    return;
  }

  const { command } = parsed;

  // Fast path: --help and --version do NOT import heavy modules.
  if (command.flags.includes("help")) {
    console.log(getHelpText());
    return;
  }

  if (command.flags.includes("version")) {
    console.log(CLI_VERSION);
    return;
  }

  // Lazy-load heavy modules only when needed for actual commands.
  const [{ routeCommand }, { loadConfig }, { createProvider }] =
    await Promise.all([
      import("./cli/router.js"),
      import("./config/index.js"),
      import("./providers/index.js"),
    ]);

  const config = await loadConfig();
  const provider = createProvider(config.provider);

  // Handle --cost flag: show cost estimate before executing
  if (command.flags.includes("cost")) {
    const { CostTracker } = await import("./cost/tracker.js");
    const tracker = new CostTracker();
    const model = config.provider.model ?? "unknown";
    // Rough estimate: 500 prompt + 200 completion tokens per iteration
    const estimatedPromptTokens = 500 * config.agent.maxIterations;
    const estimatedCompletionTokens = 200 * config.agent.maxIterations;
    const estimatedCost = tracker.estimateCost(
      model,
      estimatedPromptTokens,
      estimatedCompletionTokens
    );

    console.log(
      `Estimated cost for "${command.name === "oneshot" ? (command as { prompt: string }).prompt : "task"}":`
    );
    console.log(
      `  ~${estimatedPromptTokens + estimatedCompletionTokens} tokens (${config.agent.maxIterations} iterations max)`
    );
    console.log(`  ~$${estimatedCost.toFixed(6)}`);
    console.log(`  Model: ${model}`);
  }

  await routeCommand(command, {
    config,
    provider,
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});