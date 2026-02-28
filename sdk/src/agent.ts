import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { JaibberClient } from "./client.js";
import { AblyManager, type AgentPresenceData } from "./ably-manager.js";
import { MessageContext, TaskContext } from "./context.js";
import { mentionsAgent } from "./mentions.js";
import type { Provider } from "./providers/base.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import type { AnthropicProviderOptions } from "./providers/base.js";
import type {
  AgentConfig,
  AblyMessage,
  MessageHandler,
  TaskHandler,
  TaskEvent,
  Task,
  Project,
  HistoryEntry,
  ServerMessage,
} from "./types.js";

const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_CHUNK_BATCH_MS = 200;
const DEFAULT_CONTEXT_WINDOW = 20;

/**
 * Headless Jaibber agent.
 *
 * Connects to the Jaibber server via REST + Ably, subscribes to project
 * channels, handles @mention routing, streams responses, and dual-writes
 * to the server for persistence.
 *
 * Usage:
 * ```ts
 * const agent = new JaibberAgent({ serverUrl, credentials, agentName });
 * await agent.connect();
 * agent.onMessage(async (msg, ctx) => ctx.reply('Hello!'));
 * ```
 */
export class JaibberAgent extends EventEmitter {
  private config: AgentConfig;
  private client: JaibberClient;
  private ablyManager: AblyManager | null = null;
  private messageHandler: MessageHandler | null = null;
  private taskHandler: TaskHandler | null = null;
  private provider: Provider | null = null;
  private connected = false;
  private projects: Project[] = [];
  private unsubscribers: Array<() => void> = [];

  /** In-memory conversation history per project. */
  private history = new Map<string, HistoryEntry[]>();
  /** Track in-flight responses to prevent double-handling. */
  private activeResponses = new Set<string>();

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.client = new JaibberClient(config.serverUrl);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  /** Authenticate, connect Ably, subscribe to project channels. */
  async connect(): Promise<void> {
    if (this.connected) throw new Error("Already connected");

    // 1. Login
    const { username, password } = this.config.credentials;
    console.log(`[sdk] Logging in as "${username}"...`);
    await this.client.login(username, password);
    const userId = this.client.userId!;
    const displayName = this.client.username!;

    // 2. List projects
    const allProjects = await this.client.listProjects();
    this.projects = this.config.projectIds
      ? allProjects.filter((p) => this.config.projectIds!.includes(p.id))
      : allProjects;

    if (this.projects.length === 0) {
      throw new Error(
        "No projects found. Ensure the agent account is a member of at least one project.",
      );
    }

    console.log(
      `[sdk] Found ${this.projects.length} project(s): ${this.projects.map((p) => p.name).join(", ")}`,
    );

    // 3. Connect Ably
    this.ablyManager = new AblyManager(this.client, userId, displayName);
    await this.ablyManager.connect();

    // 4. Enter global presence
    await this.ablyManager.enterGlobalPresence(
      this.projects.map((p) => p.id),
    );

    // 5. Subscribe to each project channel
    for (const project of this.projects) {
      const presenceData: AgentPresenceData = {
        userId,
        username: this.config.agentName,
        isAgent: true,
        agentName: this.config.agentName,
        agentInstructions: this.config.agentInstructions,
        agents: [
          {
            agentName: this.config.agentName,
            agentInstructions: this.config.agentInstructions,
          },
        ],
        machineName: this.config.machineName,
      };

      // Load recent history from server
      await this.loadHistory(project.id);

      const unsub = await this.ablyManager.subscribeToProject(
        project,
        presenceData,
        (msg) => this.handleIncomingMessage(msg, project),
        (data) => this.handleTaskEvent(data, project),
      );
      this.unsubscribers.push(unsub);
    }

    this.connected = true;
    console.log(`[sdk] Agent "${this.config.agentName}" connected and listening`);
    this.emit("connected", this.projects);
  }

  /** Leave presence, disconnect Ably. */
  async disconnect(): Promise<void> {
    if (!this.connected) return;

    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    if (this.ablyManager) {
      await this.ablyManager.disconnect();
      this.ablyManager = null;
    }

    this.connected = false;
    this.emit("disconnected");
  }

  // ── Handler registration ────────────────────────────────────────────

  /** Register a handler for incoming messages. */
  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /** Register a handler for assigned tasks. */
  onTask(handler: TaskHandler): void {
    this.taskHandler = handler;
  }

  /** Use a built-in LLM provider. */
  useProvider(
    name: "anthropic",
    options: AnthropicProviderOptions,
  ): void {
    if (name === "anthropic") {
      this.provider = new AnthropicProvider(options);
    }
  }

  // ── Message handling ────────────────────────────────────────────────

  private async handleIncomingMessage(
    payload: AblyMessage,
    project: Project,
  ): Promise<void> {
    const userId = this.client.userId!;

    // Skip own messages
    if (payload.from === userId) return;

    // Skip task notifications
    if (payload.isTaskNotification) return;

    // Only respond to "message" type (and "response" for agent chains)
    if (payload.type !== "message" && payload.type !== "response") return;

    // Add to history (for both message and response types)
    this.addToHistory(project.id, {
      sender: payload.isAgentMessage ? "agent" : "user",
      senderName: payload.fromUsername,
      text: payload.text,
    });

    // Check if we should respond
    const depth = payload.responseDepth ?? 0;
    const chain = payload.respondingChain ?? [];

    if (!this.shouldRespond(payload.text, depth, chain)) return;

    // Prevent duplicate responses to the same message
    if (this.activeResponses.has(payload.messageId)) return;
    this.activeResponses.add(payload.messageId);

    try {
      await this.respondToMessage(payload, project, depth, chain);
    } catch (err) {
      console.error("[sdk] Error responding to message:", err);
      this.emit("error", err);
    } finally {
      this.activeResponses.delete(payload.messageId);
    }
  }

  /**
   * Should this agent respond to the message?
   * Mirrors useAbly.ts shouldAgentRespond() logic.
   */
  private shouldRespond(
    text: string,
    depth: number,
    chain: string[],
  ): boolean {
    const maxDepth = this.config.maxResponseDepth ?? DEFAULT_MAX_DEPTH;

    // Max depth check
    if (depth >= maxDepth) return false;

    // Chain deduplication — already responded
    if (chain.includes(this.config.agentName.toLowerCase())) return false;

    // @mention check
    if (!mentionsAgent(text, this.config.agentName)) return false;

    return true;
  }

  private async respondToMessage(
    payload: AblyMessage,
    project: Project,
    incomingDepth: number,
    incomingChain: string[],
  ): Promise<void> {
    const userId = this.client.userId!;
    const conversationHistory = this.getFormattedHistory(project.id);

    const ctx = new MessageContext({
      projectId: project.id,
      channelName: project.ablyChannelName,
      conversationHistory,
      ablyManager: this.ablyManager!,
      userId,
      agentName: this.config.agentName,
      client: this.client,
      incomingDepth,
      incomingChain,
      chunkBatchMs: this.config.chunkBatchMs ?? DEFAULT_CHUNK_BATCH_MS,
    });

    // Custom handler takes priority
    if (this.messageHandler) {
      await this.messageHandler(
        {
          id: payload.messageId,
          projectId: project.id,
          from: payload.from,
          fromUsername: payload.fromUsername,
          text: payload.text,
          type: payload.type,
          responseDepth: incomingDepth,
          respondingChain: incomingChain,
          executionMode: payload.executionMode,
          isAgentMessage: payload.isAgentMessage,
          attachments: payload.attachments,
        },
        ctx,
      );
      return;
    }

    // Built-in provider
    if (this.provider) {
      const systemPrompt = this.config.agentInstructions ?? "";
      await ctx.stream(() =>
        this.provider!.generate(payload.text, systemPrompt, conversationHistory),
      );
      return;
    }

    console.warn(
      "[sdk] No message handler or provider configured. Ignoring message.",
    );
  }

  // ── Task handling ───────────────────────────────────────────────────

  private async handleTaskEvent(
    data: TaskEvent,
    project: Project,
  ): Promise<void> {
    // Only handle new/updated tasks with "submitted" status
    if (
      data.type !== "task-created" &&
      data.type !== "task-updated"
    )
      return;

    const task = data.task;
    if (task.status !== "submitted") return;

    // Only pick up tasks assigned to this agent
    if (
      !task.assignedAgentName ||
      task.assignedAgentName.toLowerCase() !==
        this.config.agentName.toLowerCase()
    )
      return;

    console.log(
      `[sdk] Picking up task: "${task.title}" (${task.id})`,
    );

    try {
      // Update status to working
      await this.client.updateTask(task.id, { status: "working" });

      // Announce pickup in chat
      const userId = this.client.userId!;
      const announceMsgId = uuidv4();
      await this.ablyManager!.publish(
        project.ablyChannelName,
        "message",
        {
          from: userId,
          fromUsername: this.config.agentName,
          projectId: project.id,
          text: `Picking up task: **${task.title}**`,
          messageId: announceMsgId,
          type: "message",
          agentName: this.config.agentName,
          isAgentMessage: true,
          isTaskNotification: true,
        },
      );

      const conversationHistory = this.getFormattedHistory(project.id);

      const ctx = new TaskContext({
        task,
        projectId: project.id,
        channelName: project.ablyChannelName,
        conversationHistory,
        ablyManager: this.ablyManager!,
        userId,
        agentName: this.config.agentName,
        client: this.client,
      });

      // Custom task handler
      if (this.taskHandler) {
        await this.taskHandler(task, ctx);
        return;
      }

      // Built-in provider — generate response from task description
      if (this.provider) {
        const taskPrompt = task.description
          ? `Task: ${task.title}\n\n${task.description}`
          : `Task: ${task.title}`;
        const systemPrompt = this.config.agentInstructions ?? "";

        const msgCtx = new MessageContext({
          projectId: project.id,
          channelName: project.ablyChannelName,
          conversationHistory,
          ablyManager: this.ablyManager!,
          userId,
          agentName: this.config.agentName,
          client: this.client,
          incomingDepth: 0,
          incomingChain: [],
          chunkBatchMs: this.config.chunkBatchMs ?? DEFAULT_CHUNK_BATCH_MS,
        });

        try {
          await msgCtx.stream(() =>
            this.provider!.generate(
              taskPrompt,
              systemPrompt,
              conversationHistory,
            ),
          );
          await this.client.updateTask(task.id, { status: "completed" });
        } catch {
          await this.client.updateTask(task.id, { status: "failed" });
        }
        return;
      }

      console.warn(
        "[sdk] No task handler or provider configured. Task left as working.",
      );
    } catch (err) {
      console.error("[sdk] Error handling task:", err);
      try {
        await this.client.updateTask(task.id, { status: "failed" });
      } catch {
        // Best-effort
      }
    }
  }

  // ── Conversation history ────────────────────────────────────────────

  private async loadHistory(projectId: string): Promise<void> {
    const contextSize =
      this.config.contextWindowSize ?? DEFAULT_CONTEXT_WINDOW;

    try {
      const messages = await this.client.fetchMessages(
        projectId,
        contextSize,
      );

      // Messages come in descending order from server — reverse for chronological
      const entries: HistoryEntry[] = messages.reverse().map((m: ServerMessage) => ({
        sender: m.senderType === "user" ? ("user" as const) : ("agent" as const),
        senderName: m.senderName,
        text: m.text,
      }));

      this.history.set(projectId, entries);
    } catch (err) {
      console.error(
        `[sdk] Failed to load history for project ${projectId}:`,
        err,
      );
      this.history.set(projectId, []);
    }
  }

  private addToHistory(projectId: string, entry: HistoryEntry): void {
    const contextSize =
      this.config.contextWindowSize ?? DEFAULT_CONTEXT_WINDOW;
    const entries = this.history.get(projectId) ?? [];
    entries.push(entry);

    // Keep only the last N messages
    if (entries.length > contextSize) {
      entries.splice(0, entries.length - contextSize);
    }

    this.history.set(projectId, entries);
  }

  /**
   * Format conversation history for LLM context.
   * Matches useAbly.ts lines 77-84 format.
   */
  private getFormattedHistory(projectId: string): string {
    const entries = this.history.get(projectId) ?? [];
    return entries
      .map((e) => {
        const role =
          e.sender === "user"
            ? "User"
            : `Assistant (${e.senderName || "Agent"})`;
        return `${role}: ${e.text}`;
      })
      .join("\n\n");
  }
}
