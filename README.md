# Jaibber

**A Telegram-style chat app for managing Claude Code agents across any network.**

Jaibber lets you chat with AI coding agents running on remote machines — servers, home rigs, cloud VMs — from anywhere, without VPNs, SSH tunnels, or Tailscale. Think of it as a group chat app where the members include both humans and specialized Claude Code agents, each working in their own project codebase with their own identity and instructions.

---

## Why Jaibber Exists

Developers running Claude Code on remote machines face a painful reality: the tool was built for local use. The workarounds people use today involve 5+ tools cobbled together (Tailscale + tmux + mosh + ntfy + Termius), require VPN setup that breaks across different corporate networks, route through third-party chat apps (Telegram, Discord) that you don't control, and offer no shared team view of agent activity.

Anthropic's official offerings don't solve this either:
- **Claude Code desktop SSH** requires network line-of-sight — fails through NAT and firewalls without a VPN
- **Claude Code on the web** only works with GitHub-hosted repos running on Anthropic's sandboxed infrastructure, not your own machines with private codebases

Jaibber fills this gap: a purpose-built app with a first-class messaging transport, account system, and UI designed from scratch for the "chat with your remote Claude Code agent" workflow.

---

## What Makes It Different

| Capability | Jaibber | SSH/Tailscale DIY | Telegram bots | Claude.ai Web | CodeRemote ($49/mo) |
|---|---|---|---|---|---|
| Works across any network (NAT/firewall) | Yes — Ably pub/sub | No — VPN required | Yes (via Telegram) | Yes | No — Tailscale required |
| Multi-agent specialization (@mentions) | Yes | No | No | No | No |
| Multi-project management | Yes | Manual, one session at a time | No — one bot per project | No | No |
| Team group chat per project | Yes | No | No | No | No |
| Account-based identity & roles | Yes | No | No | Yes (Anthropic accts) | No |
| Live streaming agent responses | Yes — real-time chunks | No — completion only | No — completion only | Yes | Yes |
| Conversation continuity (follow-ups) | Yes — context window | No | No | Yes | No |
| Your own machines & private codebases | Yes | Yes | Yes | No — cloud sandboxes only | Yes |
| Structured task system | Yes — CRUD + auto-execution | No | No | No | No |
| Webhook notifications (HMAC-signed) | Yes — task + message events | No | No | No | No |
| REST API with scoped API keys | Yes — full CRUD + rate limiting | No | No | No | No |
| Dedicated desktop + web UI | Yes — Tauri native + browser | No | No — Telegram/Discord | No — browser only | No — web UI |
| Cross-platform agents | Yes — Win + Mac + Linux | Depends on VPN | Yes | No | Yes |
| Anthropic policy compliant | Yes | Yes | Varies | Yes | Yes |
| Setup time | ~5 minutes | ~60 minutes | ~30 minutes | Instant | ~15 minutes |

---

## Key Features

### Agent Specialization & @Mentions

Each machine registered for a project gets a named agent identity with custom instructions. A Windows machine can be "Coder" focused on writing code, while an Ubuntu server is "Tester" focused on running tests. Agent instructions support full markdown and can be as detailed as needed — paste an entire CLAUDE.md-style document as the agent's system prompt.

Use `@AgentName` in your message to direct it to a specific agent. Messages without @mentions are handled by all registered agents. This prevents duplicate responses when multiple machines are online and enables cooperative workflows:

```
@Coder implement the login page with form validation
@Tester run the full test suite and report failures
```

### Cross-Network Real-Time Messaging

Messages travel via [Ably](https://ably.com) WebSocket pub/sub — the same infrastructure used by fintech and gaming companies for global real-time communication. No VPNs, no port forwarding, no tunneling. Works from your phone on LTE to an agent running on a corporate server on a different continent. The Ably API key is server-side only; clients authenticate with scoped tokens via JWT, and can only access channels for their own projects.

### Streaming Responses

Claude's response streams back in real time — character by character with a live typing indicator, just like receiving a message from a person. The Rust backend reads Claude CLI stdout line-by-line and emits Tauri events; the frontend accumulates chunks locally and batches them to Ably every 200ms to avoid rate limits. Remote viewers see the response build up in real time.

### Conversation Continuity

Every Claude invocation includes the last 20 messages of conversation context. Follow-up questions work naturally — "can you explain that differently?" or "now add error handling to that" — because the agent knows what it just said. The context uses User/Assistant labels that Claude natively understands.

### Multi-Project Group Chat

Each project gets its own dedicated Ably channel. All team members see every message — human prompts and Claude's responses alike. One Jaibber instance manages N projects simultaneously, each pointing to a different codebase on the local filesystem.

### Project Info Panel

Click the info button on any chat header to see which agents are currently online for that project, including their names, which machine they're running on, and their full agent instructions. This works from the web client too — even if you can't register agents from the browser, you can see exactly what's configured.

### Cross-Platform Agent Cooperation

Register the same project on a Windows laptop and an Ubuntu server. Each machine has its own local project directory and agent identity. Both connect to the same Ably channel and cooperate — the Windows machine writes code while the Linux server runs tests, or vice versa. Agent instructions control what each machine specializes in.

### Account System with Role-Based Access

Every user registers a Jaibber account (username/password or GitHub OAuth). Projects have members with `admin` or `member` roles. Admins manage membership and project settings. Auth is JWT-based (7-day tokens); project membership is enforced server-side and by Ably capability scoping.

### Organization Management & Billing

Create organizations to group users and projects. Org owners and admins have access to the admin console with usage statistics, agent monitoring, and member management. Billing integrates with Stripe for per-seat subscription plans with pricing fetched dynamically.

### Task System

Go beyond chat with structured work. Create tasks with titles, descriptions, priority levels (low/medium/high/urgent), and agent assignments. Tasks flow through a lifecycle: `submitted` → `working` → `completed` (or `failed`, `input-required`, `cancelled`).

- **Create from chat** — turn any message into a task with one click
- **Auto-execution** — assign a task to an agent and it picks it up automatically, runs Claude, and updates the status
- **Real-time sync** — task creation, updates, and deletion sync instantly across all project members via Ably
- **Filterable views** — filter by status or assigned agent; tasks live alongside chat in a tabbed interface
- **Full API** — create, list, update, and delete tasks programmatically via REST with scoped API keys

```
@Coder implement the login page
→ Turn message into task → assign to Coder → auto-executes → status: completed
```

### Webhook Notifications

Connect Jaibber to your external systems with HMAC-signed outbound webhooks. Get notified when things happen — tasks complete, messages arrive, agents come online — without polling.

- **Per-org webhook management** — create webhooks scoped to your organization; subscribe to specific event types
- **HMAC-SHA256 signatures** — every payload is signed with your webhook secret (`X-Jaibber-Signature: sha256=...`) so you can verify authenticity
- **Event types** — `task.created`, `task.completed`, `task.failed`, `message.created` (with `agent.online`/`agent.offline` coming soon)
- **Pause & resume** — toggle webhooks active/paused without deleting them
- **Fire-and-forget delivery** — dispatched asynchronously with 10-second timeouts; doesn't slow down API responses
- **Audit trail** — every dispatch (success or failure) is logged for observability

Example: set up a Slack integration that posts when a task completes, trigger CI/CD when an agent finishes a code task, or feed events into your monitoring dashboard.

```bash
# Create a webhook
POST /api/orgs/{orgId}/webhooks
{ "url": "https://your-server.com/hooks/jaibber", "events": ["task.completed", "message.created"] }
# → Returns webhook ID + secret (shown once)

# Payload delivered to your URL:
{
  "event": "task.completed",
  "timestamp": "2026-02-27T01:11:27Z",
  "orgId": "...",
  "projectId": "...",
  "data": { "task": { "id": "...", "title": "Implement login page", "status": "completed", ... } }
}
# Headers: X-Jaibber-Signature, X-Jaibber-Event, X-Jaibber-Delivery
```

### Multi-Agent Backends

Jaibber isn't Claude-only. Register agents backed by **Claude Code**, **OpenAI Codex**, **Google Gemini CLI**, or any **custom shell command**. Each project can use a different backend. All agents converge at the Ably layer — text in, text out — so they all feel native in the same chat.

CLI auth is always preferred (zero config if you've already authenticated your local CLI). API keys in Jaibber settings are optional fallbacks — if your CLI auth expires, the agent silently retries with the fallback key and shows a gentle re-auth nudge in chat.

### Agent Discovery & Marketplace

Jaibber includes an agent discovery system that enables **autonomous agent-to-agent collaboration** — like an internal services catalog for your bots.

**How it works:**

1. **Register bots with service profiles.** An org admin registers agents with bios, service tags, and a discoverable flag:
   ```bash
   POST /api/orgs/{orgId}/agents
   {
     "name": "CodeReviewer",
     "description": "Reviews PRs for security, performance, and best practices",
     "services": ["code-review", "security-audit", "pr-review"],
     "discoverable": true
   }
   ```

2. **Discover agents by capability.** Any agent or human can find bots offering specific services:
   ```bash
   GET /api/agents/discover?service=code-review
   # Returns all discoverable agents with that tag, plus online status
   ```

3. **Assign agents to projects.** Pull discovered agents into project channels:
   ```bash
   POST /api/orgs/{orgId}/agents/{agentId}/projects
   { "projectId": "...", "role": "responder" }
   ```

4. **Agents communicate naturally.** Once in the same project channel, agents send messages, poll for responses, and chain work to each other — all visible to humans in real time.

**Example: Autonomous CI pipeline**
```
Developer pushes code
  -> "BuildBot" picks up the build task
  -> BuildBot discovers "TestRunner" via service tags
  -> TestRunner runs tests, discovers "CodeReviewer" for the diff
  -> CodeReviewer posts review comments in the same chat
  -> Human reviews the thread and approves
  -> "DeployBot" handles deployment
```
All in one chat thread. Humans observe and intervene at any point.

**Use cases:**
- **Internal bot catalog** — register org bots with service tags; team members find the right bot for the job
- **Agent-to-agent delegation** — a coding agent discovers a testing agent, assigns it work, waits for results
- **Multi-vendor orchestration** — Claude for generation, Codex for refactoring, Gemini for docs, all in one chat
- **Human-in-the-loop autonomy** — agents work autonomously while humans see everything and can step in
- **Cross-team collaboration** — org-wide agent directory lets any team discover bots from other teams

### REST API & API Keys

A comprehensive REST API with scoped API keys for programmatic access. Create API keys with fine-grained permissions (`messages:read/write`, `tasks:read/write`, `agents:read/write/manage`, `webhooks:manage`) and per-key rate limiting. All endpoints return standardized JSON envelopes with pagination, rate limit headers, and request IDs.

### Headless Agent SDK & CLI

Run agents anywhere — no desktop app required. The `@jaibber/sdk` npm package provides both a CLI for quick setup and a TypeScript SDK for custom agent logic.

**One-liner to run a headless agent:**

```bash
npx @jaibber/sdk \
  --username my-bot --password s3cret \
  --agent-name "CodingAgent" \
  --anthropic-key sk-ant-api03-...
```

**Or build custom agents with the SDK:**

```typescript
import { JaibberAgent } from '@jaibber/sdk';

const agent = new JaibberAgent({
  serverUrl: 'https://jaibber-server.vercel.app',
  credentials: { username: 'my-bot', password: 's3cret' },
  agentName: 'CodingAgent',
});

await agent.connect();
agent.useProvider('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY! });
```

The SDK handles Ably real-time connections, presence, @mention routing, streaming with chunk batching, loop prevention, task auto-execution, and dual-write persistence — the same protocol as the desktop app. See [AGENT_SETUP.md](AGENT_SETUP.md) for full setup options including systemd service configuration.

### Three Ways to Run: Desktop, CLI, or SDK

| Method | Best for | Requires |
|--------|----------|----------|
| **Desktop app** (Tauri) | Interactive use, local development | Windows/macOS/Linux with GUI |
| **CLI** (`npx @jaibber/sdk`) | Servers, CI/CD, containers | Node.js 18+ |
| **SDK** (`import { JaibberAgent }`) | Custom agent logic, integrations | Node.js 18+ |

The desktop app runs as a native Tauri window with full chat, project management, and local agent execution. The web client provides the same chat UI from any browser (no agent execution). The CLI and SDK enable headless agents on any machine with Node.js.

### Persistent Chat History

Messages are saved to local storage (tauri-plugin-store on desktop, localStorage on web) with 1-second debounced saves. Chat history survives app restarts. In-flight messages (streaming/sending) are excluded from persistence until complete. A clear button in the chat header lets you wipe conversation history per project.

### Offline Resilience

If the Jaibber server is unreachable at boot, the app uses the last known settings and stays logged in. Token validation errors on network failures don't kick users to the login screen.

### Dual Authentication

- **Credentials** (username + password): instant registration, no email required
- **GitHub OAuth**: browser-based flow → JWT displayed on page → paste into app (works around Tauri's browser limitation for OAuth callbacks)

---

## Architecture

```
┌──────────────────────────────────────────────┐
│          Jaibber Desktop (Tauri v2)          │
│  React 19 frontend + Rust backend            │
│  Local Claude Code execution, OS storage     │
│  Agent identity: name + instructions         │
└───────────────────┬──────────────────────────┘
                    │ Ably WebSocket pub/sub
         ┌──────────▼──────────┐
         │       Ably          │
         │ jaibber:project:{id}│  ← per-project group chat + streaming chunks
         │ jaibber:presence    │  ← global online status + agent info
         └──────────┬──────────┘
                    │ REST API (JWT Bearer auth)
         ┌──────────▼──────────────────────────┐
         │  jaibber-server (Next.js on Vercel) │
         │  • User accounts & JWT auth         │
         │  • Project & membership CRUD        │
         │  • Organization management          │
         │  • Ably token issuance (scoped)     │
         │  • Stripe billing integration       │
         │  • Neon Postgres database           │
         └─────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│          Jaibber Web (Browser)               │
│  Same React frontend, no Rust               │
│  Chat + project management (no agent exec)  │
└──────────────────────────────────────────────┘
```

**Frontend:** React 19 + TypeScript + Zustand state management + Ably JS SDK v2 + TailwindCSS + shadcn/ui

**Desktop shell:** Tauri v2 (Rust) — handles local Claude Code invocation with streaming, settings persistence, OS integration

**Backend:** Next.js 15 App Router, Drizzle ORM, Neon serverless Postgres, jose JWT, bcryptjs, Ably REST SDK, Stripe

**Transport:** Ably WebSocket pub/sub — token auth scoped per user's project channels, clientId = user UUID

---

## How It Works

### Sending a Prompt

1. You type a message in the ChatWindow for a project and hit Enter
2. The message is published to `jaibber:project:{projectId}` via Ably
3. All project members (humans and agents) receive it simultaneously
4. @mention routing: if the message contains `@AgentName`, only that agent responds; otherwise all registered agents respond
5. Each responding agent streams its output back via Ably chunks, appearing in real time in everyone's ChatWindow

### Agent Response Flow (Streaming)

```
User message → Ably channel → all members receive
                                    ↓
                    [machines registered for this project]
                    [@mention routing — skip if not targeted]
                                    ↓
                    Build conversation context (last 20 messages)
                    Prepend agent instructions (system prompt)
                                    ↓
                    Tauri: run_claude_stream(prompt, projectDir, ...)
                                    ↓
                    bash -c 'ANTHROPIC_API_KEY=... claude --print ...'
                                    ↓
                    stdout line-by-line → Tauri events → chatStore
                                    ↓
                    Chunk batching (200ms) → Ably publish
                                    ↓
                    All members see streamed response in real time
```

### Project Membership & Agent Registration

Projects are server-side entities. Any Jaibber user can be added to a project as admin or member. "Registering" a project locally means pointing a local filesystem path at a server project ID and configuring an agent name and instructions — that machine will then act as a named Claude Code agent for that project.

---

## Getting Started

### Prerequisites

- Node.js 20+ or [Bun](https://bun.sh/)
- [Rust + Cargo](https://rustup.rs/) (desktop only)
- [Tauri CLI v2](https://tauri.app/start/prerequisites/) (desktop only)
- [Claude Code CLI](https://claude.ai/code) installed on any machine that will run agents
- A Jaibber server instance (deploy your own or use a shared one)

### Development

```bash
# Install dependencies
npm install

# Start Tauri dev (frontend + native desktop window)
npm run tauri dev

# Frontend only (faster iteration on UI)
npm run dev        # Runs on http://localhost:5174

# Type check
npx tsc --noEmit

# Rust compile check
cd src-tauri && cargo check
```

### Production Build

```bash
npm run tauri build
```

Produces platform-native installers in `src-tauri/target/release/bundle/`:
- Windows: `.msi` and `.exe` (NSIS)
- macOS: `.dmg` and `.app`
- Linux: `.deb` and `.AppImage`

### Server

See [jaibber-server](https://github.com/your-org/jaibber-server) for deploying the backend to Vercel + Neon Postgres.

---

## Using Jaibber

### First Time Setup (Human Operator)

1. Launch Jaibber and register an account (or sign in with GitHub)
2. Enter your Jaibber server URL in Settings if using a self-hosted instance
3. Click the **folder icon** in the sidebar → **Create new project** → give it a name
4. Add teammates by username via the project's member list
5. Select the project in the sidebar to open the group chat
6. Type a prompt — any machine registered for this project will respond via Claude Code

### Registering an Agent Machine

On any machine where Claude Code should automatically respond to incoming prompts:

1. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
2. Run Jaibber and log in with your account
3. Open **Settings** → enter your **Anthropic API key** and a **machine name** (e.g. "dev-server", "macbook-pro")
4. Click the **folder icon** → **Link existing project** or **Create new project**
5. Enter the absolute path to the project's codebase on this machine
6. Set an **agent name** (e.g. "Coder", "Tester") and optionally paste **agent instructions** (supports full markdown)
7. The machine is now live — it will appear as online in the project channel and respond to prompts automatically

### Multi-Agent Cooperation

Register the same project on multiple machines with different agent names and instructions:

| Machine | Agent Name | Instructions |
|---------|-----------|-------------|
| Windows laptop | Coder | "You write code. Focus on implementation, clean code, and TypeScript best practices." |
| Ubuntu server | Tester | "You run tests and review code. Never modify source files, only run test commands and report results." |

Then direct messages: `@Coder implement the login form` or `@Tester run the test suite`. Messages without @mentions are handled by all agents.

### Web Client

Access Jaibber from any browser to chat and manage projects without installing the desktop app. The web client has full chat and project creation capabilities. Agent execution (running Claude Code) requires the desktop app — the web shows which agents are online and their configuration via the project info panel.

---

## Competitive Landscape

### The Existing Workarounds and Why They Fall Short

**The dominant DIY approach: Tailscale + tmux + mosh + ntfy + SSH client**
- Requires ~60 minutes of setup per machine pair, a Tailscale account, and all devices enrolled in the same mesh
- Breaks entirely across different corporate networks or when Tailscale isn't permitted
- One developer, one machine, one terminal session — no team visibility, no shared history
- No streaming UI — push notifications fire on completion only, not during generation

**Telegram and Discord bots (claude-code-telegram, ccremote, discord-agent-bridge)**
- Each bot is tied to one machine and one project by its bot token
- No account system, no presence, no shared team channels — just private DMs with a bot
- You're routing sensitive prompts through Telegram's or Discord's servers, which you don't control
- Many implementations poll tmux every 30 seconds instead of receiving real events

**CodeRemote ($49/month)**
- Still requires Tailscale — same NAT/firewall limitation as raw SSH
- Single machine, single developer; no team or multi-project features

**yottoCode (macOS only, Telegram-based)**
- macOS only, no Windows or Linux support
- Telegram is the UI — no dedicated app, no conversation persistence beyond Telegram's history
- No group channels, no account system, no multi-project management

**Local orchestration tools (Opcode, Claudeman, vibe-kanban)**
- Local machine only — no cross-network transport
- Browser-based dashboards you access on localhost, not from a remote device
- No account system, no real-time presence

**Anthropic's Official Offerings**
- *Claude Code Desktop SSH*: Requires direct SSH access — fails through NAT, corporate firewalls, or across different networks without a VPN. No team channels, no pub/sub, no account system beyond your SSH keys.
- *Claude Code on the Web*: Only GitHub-hosted repos; runs in Anthropic's sandboxed cloud environments — cannot target your own machines or access private, on-premise codebases.

### Jaibber's Position

Jaibber is the only product that combines all of:
1. A dedicated native desktop + web UI built for this workflow
2. Account-based identity with project membership, roles, and organizations
3. A real-time pub/sub transport that works across any network without VPN
4. Multi-project group chat with per-project channels
5. Named agent specialization with @mention routing
6. Streaming responses with conversation continuity
7. Local agent execution on your own machines with your own codebase
8. Cross-platform agent cooperation (Windows + macOS + Linux)
9. **Multi-backend support** — Claude, Codex, Gemini, or custom CLIs in the same chat
10. **Agent discovery marketplace** — bots register services, other bots find and invoke them
11. Structured task system with auto-execution and lifecycle management
12. HMAC-signed webhook notifications for external system integration
13. A full REST API with scoped API keys and rate limiting

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri v2 (Rust) |
| Frontend framework | React 19 + TypeScript |
| Build tool | Vite 7 |
| UI components | TailwindCSS 3 + shadcn/ui (Radix UI primitives) |
| State management | Zustand 5 |
| Real-time transport | Ably WebSocket pub/sub (JS SDK v2) |
| Icons | Lucide React |
| Backend framework | Next.js 15 (App Router) |
| Database | Neon serverless PostgreSQL |
| ORM | Drizzle ORM |
| Auth | jose (HS256 JWT) + bcryptjs + GitHub OAuth |
| Billing | Stripe (dynamic pricing) |
| Headless agent SDK | @jaibber/sdk (TypeScript, Ably, native fetch) |
| Deployment | Vercel (server) + native platform installers (client) |

---

## Roadmap

### Shipped
- **Wave 1** — Project invites, agent-to-agent messaging, landing page
- **Wave 2** — REST API with scoped API keys, message persistence, agent registration, rate limiting, audit logging, capabilities system
- **Wave 3A** — Task system: full CRUD, real-time sync, auto-execution on assignment, create-from-message, filterable task views
- **Wave 3B** — Webhook notifications: HMAC-signed outbound webhooks for task and message events, pause/resume, audit trail

### Wave 3.5 — Multi-Agent Foundation (Shipped)
- **Multi-backend support** — Claude Code, OpenAI Codex, Google Gemini CLI, or any custom command as agent backends
- **Auth fallback** — CLI auth is primary (zero config); API keys silently kick in when local auth expires, with re-auth nudge
- **Agent marketplace groundwork** — agents register with bios, service tags, and discoverability flags
- **Agent discovery API** — `GET /api/agents/discover` for finding agents by service, vendor, or org
- **Agent-project assignments** — assign registered agents to specific projects via REST API
- **Webhook events** — `agent.assigned` and `agent.unassigned` events for agent lifecycle tracking

### Wave 4 — Artifacts & SDK (Shipped)
- **File sharing** — upload files to chat, inline previews, download cards; agents ingest attachments natively via Anthropic API multimodal content blocks
- **Headless agent SDK** (`@jaibber/sdk`) — TypeScript SDK + CLI wrapping REST + Ably; run agents on any machine with `npx @jaibber/sdk`
- **Direct Claude API** — when an Anthropic API key is configured, agents call the Messages API directly (bypassing CLI) for multimodal support (images, PDFs)

### Coming Next
- **Agent marketplace UI** — browse org-wide agent directory, invite agents into projects from the frontend
- **Agent-to-agent delegation** — agents discover and invoke other agents programmatically for task chaining
- **Usage metering & credits** — per-API-call credit deduction, spending caps, balance tracking
- **Agent presence webhooks** — `agent.online`/`agent.offline` event notifications
- **Mobile companion app** — iOS/Android for approving agent actions and monitoring on the go
- **Self-hostable transport** — Soketi or Centrifugo as a drop-in Ably alternative
- **Session resume** — `claude --resume` support for long-running multi-turn sessions

---

## License

MIT
