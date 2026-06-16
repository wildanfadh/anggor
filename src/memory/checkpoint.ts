/**
 * Checkpoint & Rollback
 *
 * V1.1: creates checkpoints before file modifications.
 * If an error or user cancel occurs, rollback restores original files.
 * Checkpoints stored at ~/.anggor/checkpoints/.
 */

import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface Checkpoint {
	id: string;
	createdAt: number;
	description: string;
	files: string[]; // relative file paths
	cwd: string;
}

function checkpointDir(): string {
	return join(homedir(), ".anggor", "checkpoints");
}

async function ensureCheckpointDir(): Promise<void> {
	await mkdir(checkpointDir(), { recursive: true });
}

export async function createCheckpoint(cwd: string, files: string[], description = ""): Promise<Checkpoint> {
	await ensureCheckpointDir();

	const id = randomUUID();
	const checkpointPath = join(checkpointDir(), id);
	const createdAt = Date.now();

	await mkdir(checkpointPath, { recursive: true });

	const saved: string[] = [];

	for (const file of files) {
		const fullPath = join(cwd, file);
		const destPath = join(checkpointPath, file);

		try {
			await mkdir(dirname(destPath), { recursive: true });
			await copyFile(fullPath, destPath);
			saved.push(file);
		} catch {
			// File doesn't exist or can't be backed up, skip
		}
	}

	const checkpoint: Checkpoint = {
		id,
		createdAt,
		description: description || `Checkpoint ${new Date(createdAt).toISOString()}`,
		files: saved,
		cwd,
	};

	// Save checkpoint metadata
	await writeFile(join(checkpointPath, "checkpoint.json"), JSON.stringify(checkpoint, null, 2), "utf8");

	return checkpoint;
}

export async function rollback(checkpointId: string): Promise<Checkpoint> {
	const checkpointPath = join(checkpointDir(), checkpointId);
	const metaPath = join(checkpointPath, "checkpoint.json");

	let checkpoint: Checkpoint;

	try {
		const raw = await readFile(metaPath, "utf8");
		checkpoint = JSON.parse(raw) as Checkpoint;
	} catch {
		throw new Error(`Checkpoint not found: ${checkpointId}`);
	}

	let _restored = 0;

	for (const file of checkpoint.files) {
		const sourcePath = join(checkpointPath, file);
		const destPath = join(checkpoint.cwd, file);

		try {
			await mkdir(dirname(destPath), { recursive: true });
			await copyFile(sourcePath, destPath);
			_restored++;
		} catch {
			// File couldn't be restored, skip
		}
	}

	return checkpoint;
}

export async function cleanupCheckpoint(checkpointId: string): Promise<void> {
	const checkpointPath = join(checkpointDir(), checkpointId);

	try {
		await rm(checkpointPath, { recursive: true, force: true });
	} catch {
		// Already cleaned up or doesn't exist
	}
}

export async function listCheckpoints(): Promise<Checkpoint[]> {
	const dir = checkpointDir();
	const checkpoints: Checkpoint[] = [];

	try {
		const entries = await readdir(dir);

		for (const entry of entries) {
			const metaPath = join(dir, entry, "checkpoint.json");

			try {
				const raw = await readFile(metaPath, "utf8");
				const checkpoint = JSON.parse(raw) as Checkpoint;
				checkpoints.push(checkpoint);
			} catch {
				// Skip if metadata file doesn't exist or is invalid
			}
		}
	} catch {
		// Checkpoint directory doesn't exist or can't be read
	}

	return checkpoints.sort((a, b) => b.createdAt - a.createdAt);
}

export async function cleanupOldCheckpoints(maxAge = 7 * 24 * 60 * 60 * 1000): Promise<number> {
	const now = Date.now();
	const checkpoints = await listCheckpoints();
	let cleaned = 0;

	for (const checkpoint of checkpoints) {
		if (now - checkpoint.createdAt > maxAge) {
			await cleanupCheckpoint(checkpoint.id);
			cleaned++;
		}
	}

	return cleaned;
}
