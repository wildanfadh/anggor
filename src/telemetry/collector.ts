/**
 * Telemetry Collector
 *
 * V2.0: opt-in anonymous telemetry.
 * Collects command usage, provider selection, success rate, duration.
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

export interface TelemetryEvent {
  event: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface TelemetryConfig {
  enabled: boolean;
}

export class TelemetryCollector {
  private enabled = false;
  private events: TelemetryEvent[] = [];

  constructor(config: TelemetryConfig = { enabled: false }) {
    this.enabled = config.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  track(event: string, data: Record<string, unknown> = {}): void {
    if (!this.enabled) return;

    this.events.push({
      event,
      timestamp: Date.now(),
      data,
    });
  }

  trackCommand(command: string, duration: number, success: boolean): void {
    this.track("command", { command, duration, success });
  }

  trackProvider(provider: string, model: string): void {
    this.track("provider", { provider, model });
  }

  trackToolCall(tool: string, success: boolean, duration: number): void {
    this.track("tool", { tool, success, duration });
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  getSummary(): Record<string, number> {
    const summary: Record<string, number> = {};

    for (const event of this.events) {
      const count = summary[event.event] ?? 0;
      summary[event.event] = count + 1;
    }

    return summary;
  }

  async save(): Promise<void> {
    if (!this.enabled) return;

    const path = join(homedir(), ".anggor", "telemetry.json");
    await mkdir(dirname(path), { recursive: true });

    const existing = await this.loadExisting();
    const all = [...existing, ...this.events];

    await writeFile(path, JSON.stringify(all.slice(-1000), null, 2), "utf8");
  }

  reset(): void {
    this.events = [];
  }

  private async loadExisting(): Promise<TelemetryEvent[]> {
    const path = join(homedir(), ".anggor", "telemetry.json");

    try {
      const raw = await readFile(path, "utf8");
      return JSON.parse(raw) as TelemetryEvent[];
    } catch {
      return [];
    }
  }
}
