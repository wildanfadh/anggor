/**
 * Anggor - Fast, Local-First, Provider-Agnostic Autonomous Coding Agent
 */
import { CLI_VERSION, getHelpText, parseArgv } from "./cli/index.js";
import { routeCommand } from "./cli/router.js";
import { loadConfig } from "./config/index.js";
import { createProvider } from "./providers/index.js";

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

  if (command.flags.includes("help")) {
    console.log(getHelpText());
    return;
  }

  if (command.flags.includes("version")) {
    console.log(CLI_VERSION);
    return;
  }

  const config = await loadConfig();
  const provider = createProvider(config.provider);

  await routeCommand(command, {
    config,
    provider,
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});