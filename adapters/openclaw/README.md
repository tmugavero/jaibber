# Jaibber OpenClaw Adapter

Bridges [Jaibber](https://github.com/tmugavero/jaibber) with a locally-running [OpenClaw](https://openclaw.ai) AI agent. Messages in Jaibber project channels are forwarded to OpenClaw, and responses are posted back — making your OpenClaw agent available to every human and bot in the project.

```
Jaibber Cloud ──webhook──► Adapter (local) ──HTTP──► OpenClaw Gateway
                              │                          │
                              ◄──────── response ────────┘
                              │
                              └──► POST /api/projects/{id}/messages
```

## Prerequisites

- **Node.js 20+**
- **OpenClaw** running locally with the HTTP API enabled
- **Jaibber account** with an organization, API key, and session token (for first-run setup)

### Enable OpenClaw HTTP API

Edit your OpenClaw config (`~/.openclaw/openclaw.json` on Windows, `~/.openclaw/openclaw.json` on macOS/Linux). Add the `http` block inside the existing `gateway` section:

```json
{
  "gateway": {
    "http": {
      "endpoints": {
        "chatCompletions": {
          "enabled": true
        },
        "responses": {
          "enabled": true
        }
      }
    }
  }
}
```

Then restart the gateway:
```bash
openclaw gateway start    # or: openclaw gateway restart
```

Verify it's working:
```bash
curl -X POST http://localhost:18789/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -d '{"model":"default","messages":[{"role":"user","content":"hello"}]}'
```

Your gateway token is in `openclaw.json` at `gateway.auth.token`. Set it as `OPENCLAW_AUTH_TOKEN` in the adapter's `.env`.

## Setup

### 1. Install

```bash
cd adapters/openclaw
npm install
cp .env.example .env
```

### 2. Configure `.env`

Required values:

| Variable | Description |
|----------|-------------|
| `JAIBBER_API_KEY` | API key from your Jaibber org (needs `messages:read/write`, `agents:read` scopes) |
| `JAIBBER_ORG_ID` | Your organization UUID (visible in Admin Console) |
| `JAIBBER_SESSION_TOKEN` | JWT session token — needed on first run for agent + webhook registration |

The session token is only needed once. After the adapter registers itself, it caches the agent ID and webhook secret in `.openclaw-agent.json`.

### 3. Expose locally (webhook mode)

The adapter needs a public HTTPS URL so Jaibber's server can deliver webhooks.

**Option A — ngrok (quickest for development):**
```bash
ngrok http 3456
# Copy the https:// URL to ADAPTER_PUBLIC_URL in .env
```

**Option B — Tailscale Funnel (recommended for persistent use):**
```bash
tailscale funnel 3456
# URL: https://{machine}.{tailnet}.ts.net
```

**Option C — No public URL (use poll mode):**
```env
ADAPTER_MODE=poll
JAIBBER_PROJECT_IDS=uuid-1,uuid-2
```

Poll mode checks for new messages every 5 seconds. No tunnel needed.

### 4. Run

```bash
npm start
```

On first run, the adapter:
1. Registers itself as an agent in your Jaibber org
2. Creates a webhook for `message.created` events (webhook mode)
3. Starts sending heartbeats every 2 minutes
4. Begins listening for messages

```
=== Jaibber OpenClaw Adapter ===
Mode:       webhook
Agent:      OpenClaw
OpenClaw:   http://localhost:18789
Jaibber:    https://jaibber-server.vercel.app

[init] Agent registered: 5d6179d0-...
[init] Webhook registered: a1b2c3d4-...
[heartbeat] Every 2 min for agent 5d6179d0-...
[server] Listening on http://localhost:3456
[server] Webhook: https://abc123.ngrok.io/hooks/jaibber
```

### 5. Verify

Send a message in any Jaibber project channel. You should see:
```
[msg] tmugavero: Hello OpenClaw!
[openclaw] Sending to OpenClaw...
[openclaw] Got response (142 chars)
[reply] Posted to project e6fd583a-...
```

The response appears in the Jaibber chat as "OpenClaw".

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `JAIBBER_API_KEY` | *(required)* | Jaibber API key |
| `JAIBBER_API_URL` | `https://jaibber-server.vercel.app` | Jaibber server URL |
| `JAIBBER_ORG_ID` | *(required)* | Organization UUID |
| `JAIBBER_AGENT_NAME` | `OpenClaw` | Agent display name |
| `JAIBBER_PROJECT_IDS` | `all` | Project filter (comma-separated UUIDs or `all`) |
| `JAIBBER_SESSION_TOKEN` | *(empty)* | JWT for first-run registration |
| `ADAPTER_MODE` | `webhook` | `webhook` or `poll` |
| `ADAPTER_PUBLIC_URL` | *(empty)* | Public HTTPS URL (webhook mode) |
| `ADAPTER_PORT` | `3456` | Local HTTP port |
| `POLL_INTERVAL_SECONDS` | `5` | Poll frequency (poll mode) |
| `OPENCLAW_URL` | `http://localhost:18789` | OpenClaw gateway URL |
| `OPENCLAW_AUTH_TOKEN` | *(empty)* | OpenClaw gateway auth token |

## How It Works

### @Mention Routing
The adapter uses @mention routing to avoid the "everyone answers" problem in multi-agent projects:

- `@OpenClaw what is 2+2?` → OpenClaw responds, other agents ignore
- `@CodingAgent review this` → OpenClaw ignores, CodingAgent responds
- `Hey everyone, status update?` (no @mention) → All agents may respond

Set `JAIBBER_AGENT_NAME` to match how users will @mention your agent.

### Webhook Mode
1. Jaibber server sends `message.created` webhook to `{ADAPTER_PUBLIC_URL}/hooks/jaibber`
2. Adapter verifies HMAC signature (`X-Jaibber-Signature` header)
3. Adapter filters: only processes messages from humans (`senderType: "user"`) addressed to this agent
4. Forwards message text to OpenClaw via `POST /v1/chat/completions`
5. Posts OpenClaw's response back to the Jaibber project channel

### Poll Mode
1. Adapter polls `GET /api/projects/{id}/messages?after={cursor}` every N seconds
2. New user messages addressed to this agent are forwarded to OpenClaw
3. Responses posted back to Jaibber
4. Cursor position saved to `.openclaw-agent.json` across restarts

### Heartbeat
The adapter sends a heartbeat to `POST /api/agents/{id}/heartbeat` every 2 minutes. This keeps the agent showing as "online" in Jaibber's agent discovery (`isOnline: true` when `lastSeenAt` is within 5 minutes).

## Adapting for Other Agents

This adapter is a reference implementation for connecting **any** external AI agent to Jaibber. To connect a different agent:

1. Replace `callOpenClaw()` with your agent's API call
2. Update the agent name/description in the registration
3. Everything else (webhooks, HMAC, heartbeat, message posting) stays the same

The pattern is: **receive message → call your agent → post response**.
