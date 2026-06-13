/**
 * Terminal Output Utilities
 *
 * Format and display information in the terminal.
 */

import { theme } from "./theme.js";

export function printHeader(text: string): void {
  console.log(theme.bold(theme.primary(`\n${text}\n`)));
}

export function printSuccess(text: string): void {
  console.log(theme.success(`  ✓ ${text}`));
}

export function printError(text: string): void {
  console.log(theme.error(`  ✗ ${text}`));
}

export function printInfo(text: string): void {
  console.log(theme.info(`  → ${text}`));
}

export function printMuted(text: string): void {
  console.log(theme.muted(`  ${text}`));
}

export function printWarning(text: string): void {
  console.log(theme.warning(`  ⚠ ${text}`));
}

export function printDivider(): void {
  console.log(theme.muted("  ─".repeat(20)));
}

export function printKeyValue(key: string, value: string): void {
  console.log(`  ${theme.bold(key)}: ${value}`);
}

export function printList(items: string[], bullet = "•"): void {
  for (const item of items) {
    console.log(`  ${theme.muted(bullet)} ${item}`);
  }
}

export function printTable(rows: Array<[string, string]>): void {
  const maxKeyLen = Math.max(...rows.map(([key]) => key.length));

  for (const [key, value] of rows) {
    const paddedKey = key.padEnd(maxKeyLen);
    console.log(`  ${theme.bold(paddedKey)}  ${value}`);
  }
}
