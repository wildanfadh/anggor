/**
 * Skill Loader
 *
 * Discovers and loads skills from built-in and user directories.
 */

import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface Skill {
	name: string;
	description: string;
	tools?: string[];
	prompt: string;
	path: string;
}

const BUILTIN_SKILLS_DIR = join(import.meta.dirname, "builtins");
const USER_SKILLS_DIR = () => join(process.env.HOME || "~", ".anggor", "skills");

export class SkillLoader {
	// TODO: Scan built-in skills
	// TODO: Scan user-installed skills
	// TODO: Load skill.json + prompt.md
	// TODO: Resolve tool dependencies
	// TODO: Validate skill schema

	async listBuiltinSkills(): Promise<string[]> {
		try {
			return await readdir(BUILTIN_SKILLS_DIR);
		} catch {
			return [];
		}
	}

	async listUserSkills(): Promise<string[]> {
		try {
			return await readdir(USER_SKILLS_DIR());
		} catch {
			return [];
		}
	}
}
