import { homedir } from "node:os";
import { resolve } from "node:path";

export interface ConfigPaths {
  projectConfigPath: string;
  userConfigPath: string;
}

export function resolveConfigPaths(cwd: string = process.cwd()): ConfigPaths {
  return {
    projectConfigPath: resolve(cwd, "anggor.config.json"),
    userConfigPath: resolve(homedir(), ".anggor", "config.json"),
  };
}
