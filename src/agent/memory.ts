/**
 * Agent Memory / Session
 *
 * Maintains context within a session.
 */

export interface SessionEntry {
  timestamp: number;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
}

export class Memory {
  private entries: SessionEntry[] = [];

  add(entry: Omit<SessionEntry, "timestamp">): void {
    this.entries.push({ ...entry, timestamp: Date.now() });
  }

  getHistory(): SessionEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }

  // TODO: Save/restore session to disk
  // TODO: Summarize long conversations
  // TODO: Context window management
}