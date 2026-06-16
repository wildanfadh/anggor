import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

export interface ConfigPaths {
	/** Primary project config (per V1.0 blueprint). */
	projectConfigPath: string;
	/** Legacy/compat fallback config name. */
	legacyProjectConfigPath: string;
	/** User-global config at ~/.anggor/config.json. */
	userConfigPath: string;
}

function fileExists(path: string): boolean {
	try {
		accessSync(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Resolve config file paths for a project.
 *
 * Priority for project-level config:
 *   1. `.anggor.json`   (V1.0 blueprint – dotfile convention)
 *   2. `anggor.config.json`  (legacy / alt name)
 */
export function resolveConfigPaths(cwd: string = process.cwd()): ConfigPaths {
	return {
		projectConfigPath: resolve(cwd, ".anggor.json"),
		legacyProjectConfigPath: resolve(cwd, "anggor.config.json"),
		userConfigPath: resolve(homedir(), ".anggor", "config.json"),
	};
}

/**
 * Resolve the effective project config file (first existing one).
 */
export function resolveEffectiveProjectConfig(cwd: string = process.cwd()): string {
	const { projectConfigPath, legacyProjectConfigPath } = resolveConfigPaths(cwd);
	if (fileExists(projectConfigPath)) return projectConfigPath;
	if (fileExists(legacyProjectConfigPath)) return legacyProjectConfigPath;
	// Default to blueprint name for new projects
	return projectConfigPath;
}
