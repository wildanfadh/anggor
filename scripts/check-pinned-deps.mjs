#!/usr/bin/env node

/**
 * Check that all direct dependencies are pinned to exact versions.
 * Exits with code 1 if any direct dependency uses a range (^, ~, *, >=, etc.)
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

const rangePatterns = [/^\^/, /^~/, /^\*/, /^>=/, /^<=/, /^>/, /^</, /^=/];
const violations = [];

for (const [name, version] of Object.entries(allDeps)) {
  // Skip workspace packages (internal)
  if (version.startsWith("workspace:")) continue;

  for (const pattern of rangePatterns) {
    if (pattern.test(version)) {
      violations.push({ name, version });
      break;
    }
  }
}

if (violations.length > 0) {
  console.error("❌ Unpinned direct dependencies found:\n");
  for (const { name, version } of violations) {
    console.error(`  ${name}: ${version}`);
  }
  console.error(
    "\nAll direct dependencies must use exact versions (no ^, ~, or ranges)."
  );
  console.error("Fix: Set exact versions in package.json and run bun install.");
  process.exit(1);
}

console.log("✅ All direct dependencies are pinned to exact versions.");
