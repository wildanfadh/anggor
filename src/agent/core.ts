/**
 * Anggor Agent Core
 *
 * Main agent loop: plan -> execute -> validate -> iterate
 */

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentResult {
  success: boolean;
  message: string;
  changes?: string[];
}

export class Agent {
  // TODO: Implement agent core loop
  // 1. Receive task
  // 2. Create plan
  // 3. Execute plan steps
  // 4. Validate results
  // 5. Self-heal on errors
  // 6. Return result
}