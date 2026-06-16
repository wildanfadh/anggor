/**
 * Extension Loader
 *
 * Discovers and loads extensions from user and project directories.
 * Consolidates Skills, Plugins, and MCP into unified extension system.
 */

import { constants } from "node:fs";
import { access, mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Extension, ExtensionContext, ExtensionManifest, InstalledExtension } from "./types.js";

function userExtensionsDir(): string {
	return join(homedir(), ".anggor", "extensions");
}

function projectExtensionsDir(): string {
	return join(process.cwd(), ".anggor", "extensions");
}

export class ExtensionLoader {
	private extensions = new Map<string, InstalledExtension>();

	async loadAll(): Promise<string[]> {
		const names: string[] = [];

		// Load user-level extensions
		const userExts = await this.loadFromDir(userExtensionsDir());
		names.push(...userExts);

		// Load project-level extensions
		const projectExts = await this.loadFromDir(projectExtensionsDir());
		names.push(...projectExts);

		return names;
	}

	async loadFromDir(dir: string): Promise<string[]> {
		const names: string[] = [];

		try {
			await access(dir, constants.R_OK);
		} catch {
			return names;
		}

		try {
			const entries = await readdir(dir, { withFileTypes: true });

			for (const entry of entries) {
				if (!entry.isDirectory()) continue;

				try {
					const ext = await this.loadExtension(dir, entry.name);
					if (ext) {
						this.extensions.set(entry.name, ext);
						names.push(entry.name);
					}
				} catch {
					// Skip invalid extensions
				}
			}
		} catch {
			// Dir read error
		}

		return names;
	}

	async loadExtension(dir: string, name: string): Promise<InstalledExtension | null> {
		const extDir = join(dir, name);
		const manifestPath = join(extDir, "extension.json");

		try {
			await access(manifestPath, constants.R_OK);
		} catch {
			return null;
		}

		try {
			const manifestRaw = await readFile(manifestPath, "utf8");
			const manifest = JSON.parse(manifestRaw) as ExtensionManifest;

			return {
				name,
				path: extDir,
				manifest,
			};
		} catch {
			return null;
		}
	}

	async activateExtension(name: string, context: ExtensionContext): Promise<Extension | null> {
		const installed = this.extensions.get(name);
		if (!installed) return null;

		// Try to load the extension module
		const mainFile = installed.manifest.main ?? "extension.ts";
		const mainPath = join(installed.path, mainFile);

		try {
			await access(mainPath, constants.R_OK);
		} catch {
			// No main file, create a basic extension from manifest
			return this.createBasicExtension(installed, context);
		}

		try {
			const module = await import(mainPath);
			const extension: Extension = module.default ?? module.extension;

			if (extension && typeof extension.activate === "function") {
				await extension.activate(context);
				installed.extension = extension;
				return extension;
			}
		} catch {
			// Module load failed, fall back to basic extension
		}

		return this.createBasicExtension(installed, context);
	}

	private createBasicExtension(installed: InstalledExtension, _context: ExtensionContext): Extension {
		const extension: Extension = {
			meta: {
				name: installed.manifest.name,
				version: installed.manifest.version,
				description: installed.manifest.description,
				author: installed.manifest.author,
				type: installed.manifest.type ?? "hybrid",
			},
			activate: () => {},
		};

		installed.extension = extension;
		return extension;
	}

	async install(name: string, manifest: ExtensionManifest, files: Record<string, string>): Promise<void> {
		const extDir = join(userExtensionsDir(), name);
		await mkdir(extDir, { recursive: true });

		// Write manifest
		await writeFile(join(extDir, "extension.json"), JSON.stringify(manifest, null, 2), "utf8");

		// Write additional files
		for (const [filename, content] of Object.entries(files)) {
			await writeFile(join(extDir, filename), content, "utf8");
		}
	}

	async remove(name: string): Promise<void> {
		const extDir = join(userExtensionsDir(), name);
		await rm(extDir, { recursive: true, force: true });
		this.extensions.delete(name);
	}

	get(name: string): InstalledExtension | null {
		return this.extensions.get(name) ?? null;
	}

	list(): InstalledExtension[] {
		return [...this.extensions.values()];
	}

	search(query: string): InstalledExtension[] {
		const lower = query.toLowerCase();
		return this.list().filter(
			(ext) =>
				ext.name.toLowerCase().includes(lower) ||
				(ext.manifest.description?.toLowerCase().includes(lower) ?? false),
		);
	}
}
