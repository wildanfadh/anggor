/**
 * Anggor - Fast, Local-First, Provider-Agnostic Autonomous Coding Agent
 */
export async function main(): Promise<void> {
  console.log("anggor v0.1.0");
  // TODO: Initialize CLI, load config, start agent loop
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});