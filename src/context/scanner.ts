/**
 * Project Scanner
 *
 * Analyzes project structure, detects frameworks, languages, and tools.
 * Parses `.gitignore` and `.ignore` for ignore rules.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type ManifestResult, parseManifest } from "./manifest.js";

export interface ProjectInfo {
  framework?: string;
  language?: string;
  orm?: string;
  auth?: string;
  testFramework?: string;
  database?: string;
  packageManager?: string;
  ignorePatterns: string[];
}

const DEFAULT_IGNORE_PATTERNS = [
  "node_modules",
  "dist",
  ".git",
  "*.log",
  "build",
  "target",
  "__pycache__",
  ".next",
  "coverage",
  ".cache",
  "*.tsbuildinfo",
];

export async function readIgnorePatterns(
  rootPath: string,
  extraPatterns: string[] = []
): Promise<string[]> {
  const patterns = [...DEFAULT_IGNORE_PATTERNS, ...extraPatterns];
  const ignoreFiles = [".gitignore", ".ignore"];

  for (const file of ignoreFiles) {
    try {
      const path = join(rootPath, file);
      const content = await readFile(path, "utf8");
      const filePatterns = content
        .split("\n")
        .map((line) => line.trimEnd().trimStart())
        .filter((line) => line.length > 0 && !line.startsWith("#"));

      patterns.push(...filePatterns);
    } catch {
      // File doesn't exist, skip
    }
  }

  return [...new Set(patterns)];
}

function mergeManifestResults(results: ManifestResult[]): ManifestResult {
  const merged: ManifestResult = {};

  for (const result of results) {
    if (result.language && !merged.language) merged.language = result.language;
    if (result.framework && !merged.framework) merged.framework = result.framework;
    if (result.orm && !merged.orm) merged.orm = result.orm;
    if (result.auth && !merged.auth) merged.auth = result.auth;
    if (result.testFramework && !merged.testFramework) merged.testFramework = result.testFramework;
    if (result.database && !merged.database) merged.database = result.database;
    if (result.packageManager && !merged.packageManager) merged.packageManager = result.packageManager;
  }

  return merged;
}

export class Scanner {
  constructor(private readonly extraIgnorePatterns: string[] = []) {}

  async scan(rootPath: string): Promise<ProjectInfo> {
    const [manifests, ignorePatterns] = await Promise.all([
      parseManifest(rootPath),
      readIgnorePatterns(rootPath, this.extraIgnorePatterns),
    ]);

    const merged = mergeManifestResults(manifests);

    return {
      language: merged.language,
      framework: merged.framework,
      orm: merged.orm,
      auth: merged.auth,
      testFramework: merged.testFramework,
      database: merged.database,
      packageManager: merged.packageManager,
      ignorePatterns,
    };
  }
}

export { searchInFiles, detectSearchEngine } from "./grep.js";
