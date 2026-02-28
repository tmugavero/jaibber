import { v4 as uuidv4 } from "uuid";
import type { AblyManager } from "./ably-manager.js";
import type { JaibberClient } from "./client.js";
import type { AblyMessage, Task } from "./types.js";

/**
 * Context passed to message handlers.
 * Provides `reply()` for one-shot responses and `stream()` for streaming.
 * Handles the full Ably publish protocol: typing → chunks → response.
 */
export class MessageContext {
  /** Formatted conversation history for LLM prompts. */
  readonly conversationHistory: string;
  /** The project ID this message was received on. */
  readonly projectId: string;

  private responseId: string;
  private ablyManager: AblyManager;
  private channelName: string;
  private userId: string;
  private agentName: string;
  private client: JaibberClient;
  private responseDepth: number;
  private respondingChain: string[];
  private chunkBatchMs: number;

  constructor(opts: {
    projectId: string;
    channelName: string;
    conversationHistory: string;
    ablyManager: AblyManager;
    userId: string;
    agentName: string;
    client: JaibberClient;
    incomingDepth: number;
    incomingChain: string[];
    chunkBatchMs: number;
  }) {
    this.projectId = opts.projectId;
    this.channelName = opts.channelName;
    this.conversationHistory = opts.conversationHistory;
    this.ablyManager = opts.ablyManager;
    this.userId = opts.userId;
    this.agentName = opts.agentName;
    this.client = opts.client;
    this.responseDepth = opts.incomingDepth + 1;
    this.respondingChain = [
      ...opts.incomingChain,
      opts.agentName.toLowerCase(),
    ];
    this.chunkBatchMs = opts.chunkBatchMs;
    this.responseId = uuidv4();
  }

  /** One-shot reply: publishes typing → response in sequence. */
  async reply(text: string): Promise<void> {
    await this.publishTyping();
    await this.publishResponse(text);
    this.persistAsync(text, "response");
  }

  /**
   * Streaming reply: consumes an async generator, batches chunks to Ably
   * every chunkBatchMs (default 200ms), then publishes the final response.
   *
   * Mirrors useAbly.ts lines 86-102 chunk batching pattern.
   */
  async stream(
    generator: () => AsyncGenerator<string, void, unknown>,
  ): Promise<void> {
    await this.publishTyping();

    let fullText = "";
    let chunkBuffer = "";
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushChunks = async () => {
      if (!chunkBuffer) return;
      const text = chunkBuffer;
      chunkBuffer = "";
      await this.publishChunk(text);
    };

    try {
      for await (const chunk of generator()) {
        fullText += chunk;
        chunkBuffer += chunk;

        if (!flushTimer) {
          flushTimer = setTimeout(async () => {
            flushTimer = null;
            await flushChunks();
          }, this.chunkBatchMs);
        }
      }

      // Flush remaining buffer
      if (flushTimer) clearTimeout(flushTimer);
      await flushChunks();

      // Publish final response
      await this.publishResponse(fullText);
      this.persistAsync(fullText, "response");
    } catch (err) {
      if (flushTimer) clearTimeout(flushTimer);
      const errText = `Agent error: ${err instanceof Error ? err.message : String(err)}`;
      await this.publishError(errText);
      this.persistAsync(errText, "error");
    }
  }

  // ── Internal publish helpers ────────────────────────────────────────

  private async publishTyping(): Promise<void> {
    await this.ablyManager.publish(this.channelName, "message", {
      from: this.userId,
      fromUsername: this.agentName,
      projectId: this.projectId,
      text: "",
      messageId: uuidv4(),
      responseId: this.responseId,
      type: "typing",
      agentName: this.agentName,
    });
  }

  private async publishChunk(text: string): Promise<void> {
    await this.ablyManager.publish(this.channelName, "message", {
      from: this.userId,
      fromUsername: this.agentName,
      projectId: this.projectId,
      text,
      messageId: this.responseId,
      type: "chunk",
      agentName: this.agentName,
    });
  }

  private async publishResponse(text: string): Promise<void> {
    await this.ablyManager.publish(this.channelName, "message", {
      from: this.userId,
      fromUsername: this.agentName,
      projectId: this.projectId,
      text,
      messageId: this.responseId,
      type: "response",
      agentName: this.agentName,
      isAgentMessage: true,
      responseDepth: this.responseDepth,
      respondingChain: this.respondingChain,
    });
  }

  private async publishError(text: string): Promise<void> {
    await this.ablyManager.publish(this.channelName, "message", {
      from: this.userId,
      fromUsername: this.agentName,
      projectId: this.projectId,
      text,
      messageId: this.responseId,
      type: "error",
      agentName: this.agentName,
    });
  }

  /** Fire-and-forget persist to server. */
  private persistAsync(text: string, type: "response" | "error"): void {
    this.client
      .persistMessage(this.projectId, {
        id: this.responseId,
        senderType: "agent",
        senderName: this.agentName,
        type,
        text,
      })
      .catch((err) => {
        console.error("[sdk] Failed to persist message:", err);
      });
  }
}

/**
 * Context passed to task handlers.
 * Provides `complete()` and `fail()` to update task status,
 * plus `sendMessage()` for progress updates in chat.
 */
export class TaskContext {
  readonly task: Task;
  readonly projectId: string;
  readonly conversationHistory: string;

  private ablyManager: AblyManager;
  private channelName: string;
  private userId: string;
  private agentName: string;
  private client: JaibberClient;

  constructor(opts: {
    task: Task;
    projectId: string;
    channelName: string;
    conversationHistory: string;
    ablyManager: AblyManager;
    userId: string;
    agentName: string;
    client: JaibberClient;
  }) {
    this.task = opts.task;
    this.projectId = opts.projectId;
    this.channelName = opts.channelName;
    this.conversationHistory = opts.conversationHistory;
    this.ablyManager = opts.ablyManager;
    this.userId = opts.userId;
    this.agentName = opts.agentName;
    this.client = opts.client;
  }

  /** Mark task as completed, optionally publishing a response message. */
  async complete(resultText?: string): Promise<void> {
    await this.client.updateTask(this.task.id, { status: "completed" });

    if (resultText) {
      await this.sendMessage(resultText);
    }
  }

  /** Mark task as failed, optionally publishing an error message. */
  async fail(errorText?: string): Promise<void> {
    await this.client.updateTask(this.task.id, { status: "failed" });

    if (errorText) {
      const msgId = uuidv4();
      await this.ablyManager.publish(this.channelName, "message", {
        from: this.userId,
        fromUsername: this.agentName,
        projectId: this.projectId,
        text: errorText,
        messageId: msgId,
        type: "error",
        agentName: this.agentName,
      });

      this.client
        .persistMessage(this.projectId, {
          id: msgId,
          senderType: "agent",
          senderName: this.agentName,
          type: "error",
          text: errorText,
        })
        .catch((err) => console.error("[sdk] Failed to persist:", err));
    }
  }

  /** Send a chat message (for progress updates). */
  async sendMessage(text: string): Promise<void> {
    const msgId = uuidv4();
    await this.ablyManager.publish(this.channelName, "message", {
      from: this.userId,
      fromUsername: this.agentName,
      projectId: this.projectId,
      text,
      messageId: msgId,
      type: "response",
      agentName: this.agentName,
      isAgentMessage: true,
    });

    this.client
      .persistMessage(this.projectId, {
        id: msgId,
        senderType: "agent",
        senderName: this.agentName,
        type: "response",
        text,
      })
      .catch((err) => console.error("[sdk] Failed to persist:", err));
  }
}
