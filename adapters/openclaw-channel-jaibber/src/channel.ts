import * as Ably from "ably";

// ── Types ────────────────────────────────────────────────────────────────

interface JaibberAccount {
  apiBaseUrl: string;
  token?: string;
  apiKey?: string;
  projectId: string;
  agentName: string;
}

interface AblyMessage {
  from: string;
  fromUsername: string;
  projectId: string;
  text: string;
  messageId: string;
  type: string;
  mentions?: string[];
  isAgentMessage?: boolean;
  agentName?: string;
}

interface InboundMessageHandler {
  (msg: {
    channelId: string;
    accountId: string;
    messageId: string;
    text: string;
    fromUserId: string;
    fromUsername: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }): void;
}

// ── State ────────────────────────────────────────────────────────────────

/** Per-account Ably realtime connections. */
const ablyClients = new Map<string, Ably.Realtime>();

/** Per-account subscriptions (for cleanup). */
const subscriptions = new Map<string, Ably.RealtimeChannel>();

/** Reference to gateway's onInboundMessage handler, set during registration. */
let onInboundMessage: InboundMessageHandler | null = null;

/** Reference to the global config object, set during registration. */
let globalConfig: Record<string, unknown> | null = null;

/** Logger provided by OpenClaw. */
let log: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void } = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

// ── Helpers ──────────────────────────────────────────────────────────────

function resolveAccount(cfg: Record<string, unknown>, accountId?: string): JaibberAccount {
  const channels = cfg.channels as Record<string, unknown> | undefined;
  const jaibber = channels?.jaibber as Record<string, unknown> | undefined;
  const accounts = jaibber?.accounts as Record<string, Record<string, unknown>> | undefined;
  const raw = accounts?.[accountId ?? "default"] ?? {};

  return {
    apiBaseUrl: (raw.apiBaseUrl as string) || "https://jaibber-server.vercel.app",
    token: raw.token as string | undefined,
    apiKey: raw.apiKey as string | undefined,
    projectId: raw.projectId as string || "",
    agentName: (raw.agentName as string) || "OpenClaw",
  };
}

function authHeaders(account: JaibberAccount): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (account.token) {
    h["Authorization"] = `Bearer ${account.token}`;
  } else if (account.apiKey) {
    h["X-API-Key"] = account.apiKey;
  }
  return h;
}

// ── @Mention Routing ─────────────────────────────────────────────────────

function parseMentions(text: string): string[] {
  const matches = text.match(/@(\w[\w-]*)/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1).toLowerCase());
}

function shouldRespond(text: string, agentName: string): boolean {
  const mentions = parseMentions(text);
  if (mentions.length === 0) return true;
  const myName = agentName.toLowerCase();
  return mentions.some((m) => m === myName || myName.includes(m) || m.includes(myName));
}

// ── Channel Plugin ───────────────────────────────────────────────────────

export const jaibberChannel = {
  id: "jaibber",

  meta: {
    id: "jaibber",
    label: "Jaibber",
    selectionLabel: "Jaibber (Multi-Agent Group Chat)",
    docsPath: "/channels/jaibber",
    blurb: "Connect to Jaibber multi-agent group chat workspaces.",
    aliases: ["jaibber"],
    order: 50,
  },

  capabilities: {
    chatTypes: ["group"] as ("direct" | "group")[],
    media: false,
    threads: false,
    streaming: false,
    mentions: true,
    edits: false,
    deletions: false,
    reactions: false,
    forwarding: false,
    groupCreation: false,
  },

  config: {
    listAccountIds: (cfg: Record<string, unknown>): string[] => {
      const channels = cfg.channels as Record<string, unknown> | undefined;
      const jaibber = channels?.jaibber as Record<string, unknown> | undefined;
      const accounts = jaibber?.accounts as Record<string, unknown> | undefined;
      return Object.keys(accounts ?? {});
    },

    resolveAccount: (cfg: Record<string, unknown>, accountId?: string) => {
      return resolveAccount(cfg, accountId);
    },
  },

  // ── Outbound: OpenClaw → Jaibber ────────────────────────────────────

  outbound: {
    deliveryMode: "direct" as const,

    sendText: async ({ text, accountId }: { text: string; accountId?: string }) => {
      try {
        const cfg = globalConfig;
        if (!cfg) return { ok: false as const, error: "Plugin not initialized" };

        const account = resolveAccount(cfg, accountId);
        if (!account.projectId) return { ok: false as const, error: "No projectId configured" };

        const url = `${account.apiBaseUrl}/api/projects/${account.projectId}/messages`;
        const res = await fetch(url, {
          method: "POST",
          headers: authHeaders(account),
          body: JSON.stringify({
            text,
            senderName: account.agentName,
            senderType: "agent",
            type: "response",
          }),
        });

        if (res.ok) {
          log.info(`[jaibber] Sent response to project ${account.projectId} (${text.length} chars)`);
          return { ok: true as const };
        } else {
          const errText = await res.text();
          log.error(`[jaibber] Send failed: ${res.status} ${errText}`);
          return { ok: false as const, error: `HTTP ${res.status}: ${errText}` };
        }
      } catch (err) {
        log.error("[jaibber] Send error:", err);
        return { ok: false as const, error: String(err) };
      }
    },
  },

  // ── Inbound: Jaibber → OpenClaw ─────────────────────────────────────

  inbound: {
    startAccount: async ({ accountId, config: cfg }: { accountId: string; config: Record<string, unknown> }) => {
      const account = resolveAccount(cfg, accountId);
      if (!account.projectId) {
        log.error(`[jaibber] Account ${accountId}: no projectId configured`);
        return;
      }
      if (!account.token && !account.apiKey) {
        log.error(`[jaibber] Account ${accountId}: no token or apiKey configured`);
        return;
      }

      log.info(`[jaibber] Starting account ${accountId} — project ${account.projectId}, agent "${account.agentName}"`);

      // Get Ably token from Jaibber server
      // The server issues scoped tokens via POST /api/ably/token
      let ablyTokenData: { token: string; clientId: string };
      try {
        const tokenUrl = `${account.apiBaseUrl}/api/ably/token`;
        const res = await fetch(tokenUrl, {
          method: "POST",
          headers: authHeaders(account),
        });
        if (!res.ok) {
          const errText = await res.text();
          log.error(`[jaibber] Failed to get Ably token: ${res.status} ${errText}`);
          return;
        }
        ablyTokenData = await res.json() as { token: string; clientId: string };
      } catch (err) {
        log.error("[jaibber] Ably token request failed:", err);
        return;
      }

      // Connect to Ably with the scoped token
      const ably = new Ably.Realtime({
        authCallback: async (_params, callback) => {
          try {
            const res = await fetch(`${account.apiBaseUrl}/api/ably/token`, {
              method: "POST",
              headers: authHeaders(account),
            });
            if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
            const tokenRequest = await res.json();
            callback(null, tokenRequest);
          } catch (err) {
            callback(String(err), null);
          }
        },
      });

      ablyClients.set(accountId, ably);

      // Subscribe to project channel
      const channelName = `jaibber:project:${account.projectId}`;
      const channel = ably.channels.get(channelName, {
        params: { rewind: "2m" },
      });

      channel.subscribe("message", (msg: Ably.Message) => {
        const payload = msg.data as AblyMessage;
        if (!payload || !payload.text) return;

        // Skip agent messages (including our own responses) to prevent loops
        if (payload.isAgentMessage) return;
        if (payload.type !== "message") return;

        // @mention routing: only respond if addressed to us or no mentions at all
        if (!shouldRespond(payload.text, account.agentName)) {
          const mentions = parseMentions(payload.text);
          log.info(`[jaibber] Skipping — addressed to @${mentions.join(", @")}, not "${account.agentName}"`);
          return;
        }

        log.info(`[jaibber] ${payload.fromUsername}: ${payload.text.slice(0, 80)}${payload.text.length > 80 ? "..." : ""}`);

        // Deliver to OpenClaw gateway
        if (onInboundMessage) {
          onInboundMessage({
            channelId: "jaibber",
            accountId,
            messageId: payload.messageId,
            text: payload.text,
            fromUserId: payload.from,
            fromUsername: payload.fromUsername,
            timestamp: new Date().toISOString(),
            metadata: {
              projectId: account.projectId,
              agentName: account.agentName,
            },
          });
        }
      });

      // Enter presence so the agent shows as online in Jaibber
      await channel.presence.enter({
        userId: ablyTokenData.clientId,
        username: account.agentName,
        isAgent: true,
        agentName: account.agentName,
      });

      subscriptions.set(accountId, channel);
      log.info(`[jaibber] Account ${accountId} connected — listening on ${channelName}`);
    },

    stopAccount: async ({ accountId }: { accountId: string }) => {
      log.info(`[jaibber] Stopping account ${accountId}`);

      const channel = subscriptions.get(accountId);
      if (channel) {
        await channel.presence.leave().catch(() => {});
        channel.unsubscribe();
        subscriptions.delete(accountId);
      }

      const ably = ablyClients.get(accountId);
      if (ably) {
        ably.close();
        ablyClients.delete(accountId);
      }
    },
  },
};

// ── Plugin Registration ──────────────────────────────────────────────────

export function setGlobals(
  config: Record<string, unknown>,
  inbound: InboundMessageHandler,
  logger: typeof log,
) {
  globalConfig = config;
  onInboundMessage = inbound;
  log = logger;
}
