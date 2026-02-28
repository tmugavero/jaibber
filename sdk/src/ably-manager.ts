import Ably from "ably";
import type { JaibberClient } from "./client.js";
import type { AblyMessage, Project, TaskEvent } from "./types.js";

/** Presence data entered on each project channel. */
export interface AgentPresenceData {
  userId: string;
  username: string;
  isAgent: boolean;
  agentName: string;
  agentInstructions?: string;
  agents?: Array<{ agentName: string; agentInstructions?: string }>;
  machineName?: string;
}

/**
 * Manages the Ably Realtime connection, channel subscriptions, and presence.
 * Node.js equivalent of the frontend's src/lib/ably.ts + useAbly.ts subscription logic.
 */
export class AblyManager {
  private ably: Ably.Realtime | null = null;
  private channels = new Map<string, Ably.RealtimeChannel>();
  private presenceChannel: Ably.RealtimeChannel | null = null;

  constructor(
    private client: JaibberClient,
    private userId: string,
    private username: string,
  ) {}

  /** Create Ably Realtime client with token auth callback. */
  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.ably = new Ably.Realtime({
        authCallback: async (_tokenParams, callback) => {
          try {
            const tokenRequest = await this.client.getAblyToken();
            callback(null, tokenRequest as Ably.TokenRequest);
          } catch (err) {
            callback(err as Ably.ErrorInfo, null);
          }
        },
        clientId: this.userId,
      });

      this.ably.connection.once("connected", () => {
        console.log("[sdk] Ably connected");
        resolve();
      });

      this.ably.connection.once("failed", (stateChange) => {
        reject(
          new Error(
            `Ably connection failed: ${stateChange?.reason?.message ?? "unknown"}`,
          ),
        );
      });
    });
  }

  /** Enter global presence channel (jaibber:presence). */
  async enterGlobalPresence(projectIds: string[]): Promise<void> {
    if (!this.ably) throw new Error("Ably not connected");

    this.presenceChannel = this.ably.channels.get("jaibber:presence");
    await this.presenceChannel.presence.enter({
      userId: this.userId,
      username: this.username,
      projectIds,
    });
  }

  /**
   * Subscribe to a project channel and enter per-project presence.
   * Returns an unsubscribe function.
   */
  async subscribeToProject(
    project: Project,
    presenceData: AgentPresenceData,
    onMessage: (msg: AblyMessage) => void,
    onTask: (data: TaskEvent) => void,
  ): Promise<() => void> {
    if (!this.ably) throw new Error("Ably not connected");

    const channel = this.ably.channels.get(project.ablyChannelName);
    this.channels.set(project.ablyChannelName, channel);

    // Enter presence on this project channel
    await channel.presence.enter(presenceData);

    // Subscribe to messages
    const messageHandler = (msg: Ably.Message) => {
      if (!msg.data) return;
      const payload = msg.data as AblyMessage;
      onMessage(payload);
    };

    // Subscribe to task events
    const taskHandler = (msg: Ably.Message) => {
      if (!msg.data) return;
      onTask(msg.data as TaskEvent);
    };

    channel.subscribe("message", messageHandler);
    channel.subscribe("task", taskHandler);

    return () => {
      channel.unsubscribe("message", messageHandler);
      channel.unsubscribe("task", taskHandler);
    };
  }

  /** Publish a message on a project channel. */
  async publish(
    channelName: string,
    eventName: string,
    data: AblyMessage,
  ): Promise<void> {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Not subscribed to channel: ${channelName}`);
    }
    await channel.publish(eventName, data);
  }

  /** Get the Ably connection ID (used for skip logic). */
  get connectionId(): string | undefined {
    return this.ably?.connection.id;
  }

  /** Leave presence on all channels and close the connection. */
  async disconnect(): Promise<void> {
    // Leave presence on all project channels
    for (const channel of this.channels.values()) {
      try {
        await channel.presence.leave();
      } catch {
        // Best-effort cleanup
      }
    }

    // Leave global presence
    if (this.presenceChannel) {
      try {
        await this.presenceChannel.presence.leave();
      } catch {
        // Best-effort cleanup
      }
    }

    // Close the connection
    if (this.ably) {
      this.ably.close();
      this.ably = null;
    }

    this.channels.clear();
    this.presenceChannel = null;
    console.log("[sdk] Ably disconnected");
  }
}
