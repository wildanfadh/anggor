/**
 * Skill Registry (separate from loader)
 *
 * V2.0: Central registry for skill discovery, search, and installation.
 * The loader.ts handles builtin/user skill loading; this file handles the
 * registry abstraction (search, install, remove, list).
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistrySkill {
	name: string;
	description: string;
	version: string;
	author?: string;
	source: "builtin" | "user" | "remote";
	installPath?: string;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function registryPath(): string {
	return join(homedir(), ".anggor", "skills", "registry.json");
}

function installedSkillsDir(): string {
	return join(homedir(), ".anggor", "skills");
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class SkillRegistry {
	private skills = new Map<string, RegistrySkill>();

	// ---------------------------------------------------------------------------
	// Load / Save
	// ---------------------------------------------------------------------------

	async load(): Promise<RegistrySkill[]> {
		try {
			const raw = await readFile(registryPath(), "utf8");
			const data = JSON.parse(raw) as RegistrySkill[];
			for (const skill of data) {
				this.skills.set(skill.name, skill);
			}
		} catch {
			// No registry yet, start empty
		}
		return this.list();
	}

	async save(): Promise<void> {
		const data = this.list();
		await mkdir(installedSkillsDir(), { recursive: true });
		await writeFile(registryPath(), JSON.stringify(data, null, 2), "utf8");
	}

	// ---------------------------------------------------------------------------
	// CRUD
	// ---------------------------------------------------------------------------

	register(skill: RegistrySkill): void {
		this.skills.set(skill.name, skill);
	}

	unregister(name: string): void {
		this.skills.delete(name);
	}

	get(name: string): RegistrySkill | null {
		return this.skills.get(name) ?? null;
	}

	list(): RegistrySkill[] {
		return [...this.skills.values()];
	}

	search(query: string): RegistrySkill[] {
		const lower = query.toLowerCase();
		return this.list().filter(
			(s) => s.name.toLowerCase().includes(lower) || s.description.toLowerCase().includes(lower),
		);
	}

	// ---------------------------------------------------------------------------
	// Install / Remove
	// ---------------------------------------------------------------------------

	async installRemote(name: string, _url?: string): Promise<RegistrySkill> {
		// Stub: In a real implementation, this would fetch from a GitHub registry.
		// For now, register as remote with placeholder data.
		const skill: RegistrySkill = {
			name,
			description: `Remote skill: ${name}`,
			version: "0.1.0",
			source: "remote",
		};

		this.register(skill);
		await this.save();
		return skill;
	}

	async remove(name: string): Promise<void> {
		// Remove from registry
		this.unregister(name);

		// Remove installed files
		try {
			await rm(join(installedSkillsDir(), name), { recursive: true, force: true });
		} catch {
			// Already removed
		}

		await this.save();
	}
}
