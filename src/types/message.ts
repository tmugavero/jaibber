import type { MessageAttachment } from "./attachment";

export type ExecutionMode = "auto" | "plan";

export interface Message {
  id: string;
  conversationId: string;  // projectId UUID
  sender: "me" | "them";
  senderName?: string;     // display name for group chat attribution
  text: string;
  timestamp: string;
  status: "sending" | "sent" | "streaming" | "done" | "error";
  executionMode?: ExecutionMode;  // "auto" or "plan" — affects agent behavior
  attachments?: MessageAttachment[];  // file attachments on this message
}

export interface AblyMessage {
  from: string;           // sender userId UUID
  fromUsername: string;   // display name shown in group chat
  projectId: string;      // replaces "to" — channel routing is implicit
  text: string;
  messageId: string;
  type: "message" | "response" | "typing" | "done" | "error" | "chunk" | "task-created" | "task-updated" | "task-deleted";
  responseId?: string;    // sent in "typing" so receivers can pre-create bubble with correct ID
  agentName?: string;     // set on agent messages (typing/response/chunk/error)
  mentions?: string[];    // parsed @mention targets from user messages
  executionMode?: ExecutionMode;  // sent with "message" type so agent knows which mode to use
  // Agent-to-agent loop prevention
  isAgentMessage?: boolean;     // true if this message was sent by an agent (not a human)
  responseDepth?: number;       // 0 for human messages, +1 for each agent response in a chain
  respondingChain?: string[];   // agentNames that have already responded in this chain
  // Task notifications — informational messages that should not trigger agent responses
  isTaskNotification?: boolean;
  // File attachments
  attachments?: MessageAttachment[];
}
