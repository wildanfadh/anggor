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