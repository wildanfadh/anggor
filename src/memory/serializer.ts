/**
 * Memory Serializer
 *
 * V1.1: Serializes and deserializes SessionMemory for persistent storage.
 * Companion to bank.ts — handles the data transformation layer.
 */

import type {
  SessionMemory,
  SessionMessage,
  ToolCallRecord,
  PlanRecord,
  TodoItem,
} from "../agent/memory.js";

// ---------------------------------------------------------------------------
// Serialized format
// ---------------------------------------------------------------------------

export interface SerializedMemory {
  version: 1;
  updatedAt: number;
  cwd: string;
  messages: SessionMessage[];
  toolCalls: ToolCallRecord[];
  plans: PlanRecord[];
  todos: TodoItem[];
  summary?: string;
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

export function serialize(memory: SessionMemory, cwd?: string): SerializedMemory {
  return {
    version: 1,
    updatedAt: Date.now(),
    cwd: cwd ?? process.cwd(),
    messages: memory.getMessages(),
    toolCalls: memory.getToolCalls(),
    plans: [],
    todos: memory.getTodos(),
  };
}

// ---------------------------------------------------------------------------
// Deserialize
// ---------------------------------------------------------------------------

export function deserialize(data: SerializedMemory, memory: SessionMemory): void {
  for (const msg of data.messages) {
    memory.addMessage(msg.role, msg.content);
  }

  for (const call of data.toolCalls) {
    memory.addToolCall(call.tool, call.input, call.output, call.success, call.duration);
  }

  for (const todo of data.todos) {
    memory.addTodo(todo.task);
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function isValid(data: unknown): data is SerializedMemory {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return d.version === 1 && Array.isArray(d.messages) && Array.isArray(d.toolCalls);
}
