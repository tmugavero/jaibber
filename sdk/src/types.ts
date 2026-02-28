import type { MessageContext } from "./context.js";
import type { TaskContext } from "./context.js";

// ── Execution mode ──────────────────────────────────────────────────

export type ExecutionMode = "auto" | "plan";

// ── Ably wire format (must match frontend src/types/message.ts) ─────

export interface AblyMessage {
  from: string;
  fromUsername: string;
  projectId: string;
  text: string;
  messageId: string;
  type:
    | "message"
    | "response"
    | "typing"
    | "done"
    | "error"
    | "chunk"
    | "task-created"
    | "task-updated"
    | "task-deleted";
  responseId?: string;
  agentName?: string;
  mentions?: string[];
  executionMode?: ExecutionMode;
  isAgentMessage?: boolean;
  responseDepth?: number;
  respondingChain?: string[];
  isTaskNotification?: boolean;
  attachments?: MessageAttachment[];
}

// ── Task types (must match frontend src/types/task.ts) ──────────────

export type TaskStatus =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentName: string | null;
  createdBy: string;
  createdByType: "user" | "agent";
  createdByName: string;
  sourceMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Attachment ──────────────────────────────────────────────────────

export interface MessageAttachment {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  blobUrl: string;
}

// ── Project ─────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ablyChannelName: string;
  role: string;
}

// ── Incoming message (simplified view for handlers) ─────────────────

export interface IncomingMessage {
  id: string;
  projectId: string;
  from: string;
  fromUsername: string;
  text: string;
  type: string;
  responseDepth: number;
  respondingChain: string[];
  executionMode?: ExecutionMode;
  isAgentMessage?: boolean;
  attachments?: MessageAttachment[];
}

// ── Task event from Ably ────────────────────────────────────────────

export interface TaskEvent {
  type: "task-created" | "task-updated" | "task-deleted";
  task: Task;
  projectId: string;
}

// ── Agent config ────────────────────────────────────────────────────

export interface AgentConfig {
  /** Jaibber server URL (e.g. "https://jaibber-server.vercel.app") */
  serverUrl: string;
  /** Login credentials for the agent's Jaibber account */
  credentials: { username: string; password: string };
  /** Agent display name (used for @mention routing and presence) */
  agentName: string;
  /** System prompt prepended to every LLM call */
  agentInstructions?: string;
  /** Machine identifier shown in presence */
  machineName?: string;
  /** Specific project IDs to join. Omit to join all user's projects. */
  projectIds?: string[];
  /** Max depth for agent-to-agent chains (default: 3) */
  maxResponseDepth?: number;
  /** Chunk batching interval in ms (default: 200) */
  chunkBatchMs?: number;
  /** Number of recent messages for conversation context (default: 20) */
  contextWindowSize?: number;
}

// ── Handler callbacks ───────────────────────────────────────────────

export type MessageHandler = (
  message: IncomingMessage,
  context: MessageContext,
) => Promise<void>;

export type TaskHandler = (
  task: Task,
  context: TaskContext,
) => Promise<void>;

// ── Server message format (from GET /api/projects/{id}/messages) ────

export interface ServerMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderType: "user" | "agent" | "api";
  senderName: string;
  type: "message" | "response" | "error";
  text: string;
  createdAt: string;
}

// ── Persist message payload ─────────────────────────────────────────

export interface PersistMessagePayload {
  id: string;
  senderType: "agent";
  senderName: string;
  type: "message" | "response" | "error";
  text: string;
}

// ── History entry (internal) ────────────────────────────────────────

export interface HistoryEntry {
  sender: "user" | "agent";
  senderName: string;
  text: string;
}
