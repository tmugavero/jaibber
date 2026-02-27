import "dotenv/config";
import express, { type Request, type Response } from "express";
import { createHmac } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Config ────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`[fatal] Missing required env var: ${key}`);
    process.exit(1);
  }
  return v;
}

const cfg = {
  jaibberApiKey: required("JAIBBER_API_KEY"),
  jaibberApiUrl: env("JAIBBER_API_URL", "https://jaibber-server.vercel.app"),
  jaibberOrgId: required("JAIBBER_ORG_ID"),
  jaibberAgentName: env("JAIBBER_AGENT_NAME", "OpenClaw"),
  jaibberProjectIds: env("JAIBBER_PROJECT_IDS", "all"),
  sessionToken: env("JAIBBER_SESSION_TOKEN", ""),
  adapterPublicUrl: env("ADAPTER_PUBLIC_URL", ""),
  adapterMode: env("ADAPTER_MODE", "webhook") as "webhook" | "poll",
  adapterPort: parseInt(env("ADAPTER_PORT", "3456")),
  pollIntervalSecs: parseInt(env("POLL_INTERVAL_SECONDS", "5")),
  openClawUrl: env("OPENCLAW_URL", "http://localhost:18789"),
  openClawAuthToken: env("OPENCLAW_AUTH_TOKEN", ""),
};

// ── State File ────────────────────────────────────────────────────────

const STATE_FILE = resolve(__dirname, ".openclaw-agent.json");

interface AdapterState {
  agentId: string | null;
  webhookId: string | null;
  webhookSecret: string | null;
  pollCursors: Record<string, string>;
}

function loadState(): AdapterState {
  if (existsSync(STATE_FILE)) {
    try {
      return JSON.parse(readFileSync(STATE_FILE, "utf8"));
    } catch {
      /* corrupted — start fresh */
    }
  }
  return { agentId: null, webhookId: null, webhookSecret: null, pollCursors: {} };
}

function saveState(state: AdapterState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Jaibber API Client ────────────────────────────────────────────────

function jaibberHeaders(useSession = false): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (useSession && cfg.sessionToken) {
    h["Authorization"] = `Bearer ${cfg.sessionToken}`;
  } else {
    h["X-API-Key"] = cfg.jaibberApiKey;
  }
  return h;
}

async function jaibberPost<T>(path: string, body: unknown, useSession = false): Promise<T> {
  const res = await fetch(`${cfg.jaibberApiUrl}${path}`, {
    method: "POST",
    headers: jaibberHeaders(useSession),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jaibber POST ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function jaibberGet<T>(path: string): Promise<T> {
  const res = await fetch(`${cfg.jaibberApiUrl}${path}`, {
    headers: jaibberHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jaibber GET ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Registration ──────────────────────────────────────────────────────

async function ensureRegistered(state: AdapterState): Promise<AdapterState> {
  const updated = { ...state };

  // Agent registration
  if (!updated.agentId) {
    console.log("[init] Registering agent in Jaibber...");
    const useSession = !!cfg.sessionToken;
    try {
      const res = await jaibberPost<{ data: { id: string } }>(
        `/api/orgs/${cfg.jaibberOrgId}/agents`,
        {
          name: cfg.jaibberAgentName,
          description: "OpenClaw local AI agent bridged via jaibber-openclaw-adapter",
          vendor: "custom",
          capabilities: ["chat", "completions"],
          services: ["openclaw", "ai-assistant"],
          discoverable: true,
          endpointUrl: cfg.adapterPublicUrl || null,
        },
        useSession,
      );
      updated.agentId = res.data.id;
      console.log(`[init] Agent registered: ${updated.agentId}`);
    } catch (err) {
      console.error("[init] Agent registration failed:", err);
      console.error("       Provide JAIBBER_SESSION_TOKEN if your API key lacks permission.");
      process.exit(1);
    }
  } else {
    console.log(`[init] Using existing agent: ${updated.agentId}`);
  }

  // Webhook registration (webhook mode only, session JWT required)
  if (cfg.adapterMode === "webhook" && !updated.webhookId) {
    if (!cfg.sessionToken) {
      console.error("[init] Webhook mode requires JAIBBER_SESSION_TOKEN for webhook creation.");
      console.error("       Set ADAPTER_MODE=poll to use polling instead.");
      process.exit(1);
    }
    if (!cfg.adapterPublicUrl) {
      console.error("[init] ADAPTER_PUBLIC_URL is required in webhook mode.");
      console.error(`       Use ngrok, Tailscale Funnel, or Cloudflare Tunnel to expose port ${cfg.adapterPort}`);
      process.exit(1);
    }
    console.log("[init] Creating webhook for message.created events...");
    try {
      const res = await jaibberPost<{ data: { id: string; secret: string } }>(
        `/api/orgs/${cfg.jaibberOrgId}/webhooks`,
        {
          url: `${cfg.adapterPublicUrl}/hooks/jaibber`,
          events: ["message.created"],
        },
        true,
      );
      updated.webhookId = res.data.id;
      updated.webhookSecret = res.data.secret;
      console.log(`[init] Webhook registered: ${updated.webhookId}`);
    } catch (err) {
      console.error("[init] Webhook registration failed:", err);
      process.exit(1);
    }
  }

  return updated;
}

// ── HMAC Verification ─────────────────────────────────────────────────

function verifySignature(rawBody: string, secret: string, header: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  if (expected.length !== header.length) return false;
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  }
  return diff === 0;
}

// ── OpenClaw Client ───────────────────────────────────────────────────

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string } }>;
}

async function callOpenClaw(prompt: string): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.openClawAuthToken) {
    headers["Authorization"] = `Bearer ${cfg.openClawAuthToken}`;
  }

  const res = await fetch(`${cfg.openClawUrl}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "default",
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenClaw ${res.status}: ${text}`);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenClaw returned empty response");
  return content;
}

// ── Message Handling ──────────────────────────────────────────────────

interface IncomingMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderType: "user" | "agent" | "api";
  senderName: string;
  type: string;
  text: string;
  createdAt?: string;
}

interface WebhookPayload {
  event: string;
  orgId: string;
  projectId?: string;
  data: { message: IncomingMessage };
}

function isProjectAllowed(projectId: string): boolean {
  if (cfg.jaibberProjectIds === "all") return true;
  return cfg.jaibberProjectIds
    .split(",")
    .map((s) => s.trim())
    .includes(projectId);
}

// Dedup: track recently processed message IDs
const processed = new Set<string>();

async function handleMessage(msg: IncomingMessage): Promise<void> {
  // Dedup
  if (processed.has(msg.id)) return;
  processed.add(msg.id);
  setTimeout(() => processed.delete(msg.id), 60_000);

  // Skip non-user messages (prevents echo loops)
  if (msg.senderType !== "user") {
    console.log(`[skip] ${msg.senderType} message from ${msg.senderName}`);
    return;
  }

  // Skip out-of-scope projects
  if (!isProjectAllowed(msg.projectId)) {
    console.log(`[skip] Project ${msg.projectId} not in scope`);
    return;
  }

  const preview = msg.text.length > 80 ? msg.text.slice(0, 80) + "..." : msg.text;
  console.log(`[msg] ${msg.senderName}: ${preview}`);

  // Forward to OpenClaw
  let reply: string;
  try {
    console.log("[openclaw] Sending to OpenClaw...");
    reply = await callOpenClaw(msg.text);
    console.log(`[openclaw] Got response (${reply.length} chars)`);
  } catch (err) {
    console.error("[openclaw] Error:", err);
    await postReply(msg.projectId, `[OpenClaw error] ${err}`).catch(() => {});
    return;
  }

  // Post response to Jaibber
  await postReply(msg.projectId, reply);
}

async function postReply(projectId: string, text: string): Promise<void> {
  try {
    await jaibberPost(`/api/projects/${projectId}/messages`, {
      text,
      senderName: cfg.jaibberAgentName,
      senderType: "agent",
      type: "response",
    });
    console.log(`[reply] Posted to project ${projectId}`);
  } catch (err) {
    console.error("[reply] Failed to post:", err);
  }
}

// ── Webhook Server ────────────────────────────────────────────────────

function startWebhookServer(state: AdapterState): void {
  const app = express();

  // Raw text body for HMAC verification (must NOT use express.json())
  app.post("/hooks/jaibber", express.text({ type: "*/*" }), (req: Request, res: Response) => {
    const signature = req.headers["x-jaibber-signature"] as string | undefined;
    if (!signature || !state.webhookSecret) {
      res.status(401).json({ error: "Missing signature" });
      return;
    }

    if (!verifySignature(req.body as string, state.webhookSecret, signature)) {
      console.warn("[webhook] Invalid signature — rejecting");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    // Acknowledge immediately (Jaibber has 10s timeout)
    res.status(200).json({ ok: true });

    // Parse and process async
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(req.body as string) as WebhookPayload;
    } catch {
      console.error("[webhook] Failed to parse payload");
      return;
    }

    if (payload.event !== "message.created") return;

    handleMessage(payload.data.message).catch((err) => {
      console.error("[webhook] Unhandled error:", err);
    });
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, agent: cfg.jaibberAgentName, mode: "webhook" });
  });

  app.listen(cfg.adapterPort, () => {
    console.log(`[server] Listening on http://localhost:${cfg.adapterPort}`);
    console.log(`[server] Webhook: ${cfg.adapterPublicUrl}/hooks/jaibber`);
  });
}

// ── Polling Mode ──────────────────────────────────────────────────────

function resolveProjectIds(): string[] {
  if (cfg.jaibberProjectIds === "all") {
    console.error("[fatal] ADAPTER_MODE=poll requires explicit JAIBBER_PROJECT_IDS.");
    console.error("       Comma-separate your project UUIDs. 'all' is not supported in poll mode.");
    process.exit(1);
  }
  return cfg.jaibberProjectIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function pollOnce(projectId: string, state: AdapterState): Promise<void> {
  const cursor = state.pollCursors[projectId];
  let qs = `?limit=20`;
  if (cursor) qs += `&after=${encodeURIComponent(cursor)}`;

  const res = await jaibberGet<{
    data: IncomingMessage[];
    meta: { cursor: string | null; hasMore: boolean };
  }>(`/api/projects/${projectId}/messages${qs}`);

  if (res.data.length === 0) return;

  // Process oldest first (server returns asc order when `after` is used)
  for (const msg of res.data) {
    await handleMessage(msg);
  }

  // Advance cursor
  const last = res.data[res.data.length - 1];
  if (last?.createdAt) {
    state.pollCursors[projectId] = last.createdAt;
    saveState(state);
  }
}

function startPolling(state: AdapterState): void {
  const projectIds = resolveProjectIds();
  console.log(`[poll] Watching ${projectIds.length} project(s) every ${cfg.pollIntervalSecs}s`);
  console.log(`[poll] Projects: ${projectIds.join(", ")}`);

  const tick = async () => {
    for (const projectId of projectIds) {
      try {
        await pollOnce(projectId, state);
      } catch (err) {
        console.error(`[poll] Error on ${projectId}:`, err);
      }
    }
  };

  tick();
  setInterval(tick, cfg.pollIntervalSecs * 1_000);
}

// ── Heartbeat ─────────────────────────────────────────────────────────

function startHeartbeat(agentId: string): void {
  const beat = async () => {
    try {
      await jaibberPost(`/api/agents/${agentId}/heartbeat`, {});
    } catch (err) {
      console.warn("[heartbeat] Failed:", err);
    }
  };

  beat();
  setInterval(beat, 2 * 60 * 1_000);
  console.log(`[heartbeat] Every 2 min for agent ${agentId}`);
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Jaibber OpenClaw Adapter ===");
  console.log(`Mode:       ${cfg.adapterMode}`);
  console.log(`Agent:      ${cfg.jaibberAgentName}`);
  console.log(`OpenClaw:   ${cfg.openClawUrl}`);
  console.log(`Jaibber:    ${cfg.jaibberApiUrl}`);
  console.log();

  // Load or create state
  let state = loadState();

  // Register agent + webhook
  state = await ensureRegistered(state);
  saveState(state);

  // Start heartbeat
  startHeartbeat(state.agentId!);

  // Start message reception
  if (cfg.adapterMode === "webhook") {
    startWebhookServer(state);
  } else {
    startPolling(state);
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
