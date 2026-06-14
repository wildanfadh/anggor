/**
 * Semantic Indexer
 *
 * V2.0: indexes project files for semantic search.
 * Stores index at ~/.anggor/index/.
 */

import { readdir, readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

export interface IndexEntry {
  path: string;
  content: string;
  tokens: number;
  lastModified: number;
}

export interface IndexConfig {
  maxFileSize?: number;
  ignorePatterns?: string[];
  scanDepth?: number;
}

const DEFAULT_CONFIG: IndexConfig = {
  maxFileSize: 1024 * 100, // 100KB
  ignorePatterns: ["node_modules", "dist", ".git", "*.log", "*.map", "*.lock"],
  scanDepth: 3,
};

function indexDir(): string {
  return join(homedir(), ".anggor", "index");
}

function matchesPattern(path: string, patterns: string[]): boolean {
  const name = path.split("/").pop() ?? path;

  return patterns.some((pattern) => {
    if (pattern.startsWith("*.")) {
      return name.endsWith(pattern.slice(1));
    }
    return path.includes(pattern) || name === pattern;
  });
}

export class Indexer {
  constructor(private readonly config: IndexConfig = {}) {}

  async indexProject(cwd: string): Promise<IndexEntry[]> {
    const entries: IndexEntry[] = [];
    const maxFileSize = this.config.maxFileSize ?? DEFAULT_CONFIG.maxFileSize ?? 100 * 1024;
    const ignorePatterns = [
      ...(this.config.ignorePatterns ?? []),
      ...(DEFAULT_CONFIG.ignorePatterns ?? []),
    ];

    await this.walkDirectory(cwd, cwd, entries, maxFileSize, ignorePatterns, 0, this.config.scanDepth ?? 3);
    await this.saveIndex(cwd, entries);

    return entries;
  }

  async loadIndex(cwd: string): Promise<IndexEntry[]> {
    const indexPath = join(indexDir(), Buffer.from(resolve(cwd)).toString("base64"), "index.json");

    try {
      const raw = await readFile(indexPath, "utf8");
      return JSON.parse(raw) as IndexEntry[];
    } catch {
      return [];
    }
  }

  private async walkDirectory(
    root: string,
    dir: string,
    entries: IndexEntry[],
    maxSize: number,
    ignorePatterns: string[],
    depth: number,
    maxDepth: number
  ): Promise<void> {
    if (depth > maxDepth) return;

    let items: string[] = [];

    try {
      items = await readdir(dir);
    } catch {
      return;
    }

    for (const item of items) {
      const fullPath = join(dir, item);
      const relPath = fullPath.slice(root.length + 1);

      if (matchesPattern(relPath, ignorePatterns)) continue;

      try {
        const stats = await stat(fullPath);

        if (stats.isFile()) {
          if (stats.size > maxSize) continue;

          try {
            const content = await readFile(fullPath, "utf8");
            entries.push({
              path: relPath,
              content,
              tokens: Math.ceil(content.length / 4),
              lastModified: stats.mtimeMs,
            });
          } catch {
            // Skip binary files
          }
        } else if (stats.isDirectory()) {
          await this.walkDirectory(root, fullPath, entries, maxSize, ignorePatterns, depth + 1, maxDepth);
        }
      } catch {
        continue;
      }
    }
  }

  private async saveIndex(cwd: string, entries: IndexEntry[]): Promise<void> {
    const indexPath = join(indexDir(), Buffer.from(resolve(cwd)).toString("base64"));
    await mkdir(indexPath, { recursive: true });
    await writeFile(join(indexPath, "index.json"), JSON.stringify(entries, null, 2), "utf8");
  }
}
