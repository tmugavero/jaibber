# Jaibber

**A Telegram-style desktop app for managing Claude Code agents across any network.**

Jaibber lets you chat with AI coding agents running on remote machines — servers, home rigs, cloud VMs — from anywhere, without VPNs, SSH tunnels, or Tailscale. Think of it as a group chat app where the members include both humans and Claude Code agents, each working in their own project codebase.

---

## Why Jaibber Exists

Developers running Claude Code on remote machines face a painful reality: the tool was built for local use. The workarounds people use today involve 5+ tools cobbled together (Tailscale + tmux + mosh + ntfy + Termius), require VPN setup that breaks across different corporate networks, route through third-party chat apps (Telegram, Discord) that you don't control, and offer no shared team view of agent activity.

Anthropic's official offerings don't solve this either:
- **Claude Code desktop SSH** requires network line-of-sight — fails through NAT and firewalls without a VPN
- **Claude Code on the web** only works with GitHub-hosted repos running on Anthropic's sandboxed infrastructure, not your own machines with private codebases

Jaibber fills this gap: a purpose-built desktop app with a first-class messaging transport, account system, and UI designed from scratch for the "chat with your remote Claude Code agent" workflow.

---

## What Makes It Different

| Capability | Jaibber | SSH/Tailscale DIY | Telegram bots | Claude.ai Web | CodeRemote ($49/mo) |
|---|---|---|---|---|---|
| Works across any network (NAT/firewall) | Yes — Ably pub/sub | No — VPN required | Yes (via Telegram) | Yes | No — Tailscale required |
| Multi-project management | Yes | Manual, one session at a time | No — one bot per project | No | No |
| Team group chat per project | Yes | No | No | No | No |
| Account-based identity & roles | Yes | No | No | Yes (Anthropic accts) | No |
| Live streaming agent responses | Yes — real-time chunks | No — completion only | No — completion only | Yes | Yes |
| Your own machines & private codebases | Yes | Yes | Yes | No — cloud sandboxes only | Yes |
| Dedicated desktop UI | Yes — Tauri native | No | No — Telegram/Discord | No — browser only | No — web UI |
| Anthropic policy compliant | Yes | Yes | Varies | Yes | Yes |
| Setup time | ~5 minutes | ~60 minutes | ~30 minutes | Instant | ~15 minutes |

---

## Key Features

### Cross-Network Real-Time Messaging
Messages travel via [Ably](https://ably.com) WebSocket pub/sub — the same infrastructure used by fintech and gaming companies for global real-time communication. No VPNs, no port forwarding, no tunneling. Works from your phone on LTE to an agent running on a corporate server on a different continent. The Ably API key is server-side only; clients authenticate with scoped tokens via JWT, and can only access channels for their own projects.

### Multi-Project Group Chat
Each project gets its own dedicated Ably channel (`jaibber:project:{id}`). All team members are added to the channel and see every message — human prompts and Claude's responses alike. One Jaibber instance manages N projects simultaneously, each pointing to a different codebase on the local filesystem.

### Local Agent Execution
When a message arrives for a project registered on your machine, Jaibber automatically invokes Claude Code locally (`claude --print --dangerously-skip-permissions`) in the correct project directory, with the full shell environment sourced (nvm, PATH, zshrc, bashrc, ANTHROPIC_API_KEY). The agent response streams back to all channel members in real time. The Claude CLI runs under your own subscription — Jaibber is purely a messaging relay, not an API proxy.

### Account System with Role-Based Access
Every user registers a Jaibber account (username/password or GitHub OAuth). Projects have members with `admin` or `member` roles. Admins manage membership and project settings. Auth is JWT-based (7-day tokens); project membership is enforced server-side and by Ably capability scoping.

### Streaming Response Rendering
Claude's response appears character-by-character as it arrives, with a live typing indicator — just like receiving a real-time message from a person. Code blocks are detected and rendered in monospace. Message status indicators track: sending → sent → streaming → done.

### Persistent Chat History
Messages are saved to the local filesystem (via tauri-plugin-store) with 1-second debouncing. Chat history survives app restarts. In-flight (streaming/sending) messages are excluded from persistence until complete.

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
│  (local Claude Code invocation, OS storage)  │
└───────────────────┬──────────────────────────┘
                    │ Ably WebSocket pub/sub
         ┌──────────▼──────────┐
         │       Ably          │
         │ jaibber:project:{id}│  ← per-project group chat
         │ jaibber:presence    │  ← global online status
         └──────────┬──────────┘
                    │ REST API (JWT Bearer auth)
         ┌──────────▼──────────────────────────┐
         │  jaibber-server (Next.js on Vercel) │
         │  • User accounts & JWT auth         │
         │  • Project & membership CRUD        │
         │  • Ably token issuance (scoped)     │
         │  • Neon Postgres database           │
         └─────────────────────────────────────┘
```

**Frontend:** React 19 + TypeScript + Zustand state management + Ably JS SDK v2 + Tauri v2 plugins

**Backend:** Next.js 15 App Router, Drizzle ORM, Neon serverless Postgres, jose JWT, bcryptjs, Ably REST SDK

**Desktop shell:** Tauri v2 (Rust) — handles local Claude Code invocation, settings persistence (tauri-plugin-store), OS integration

**Transport:** Ably WebSocket pub/sub — token auth (scoped per user's project channels), 1-hour TTL, clientId = user UUID

---

## How It Works

### Sending a Prompt

1. You type a message in the ChatWindow for a project and hit Enter
2. The message is published to `jaibber:project:{projectId}` via Ably
3. All project members (humans and agents) receive it simultaneously
4. Any machine with that project registered locally detects it, invokes `claude --print` in the project directory, and begins streaming the response back
5. The response chunks appear in everyone's ChatWindow in real time

### Agent Response Flow

```
User message → Ably channel → all members receive
                                    ↓
                    [machines registered for this project]
                                    ↓
                    Tauri: run_claude(prompt, projectDir)
                                    ↓
                    bash -c 'ANTHROPIC_API_KEY=... claude --print ...'
                                    ↓
                    stdout → Ably response publish
                                    ↓
                    All members see streamed response
```

### Project Membership

Projects are server-side entities. Any Jaibber user can be added to a project as admin or member. "Registering" a project locally means pointing a local filesystem path at a server project ID — that machine will then act as the Claude Code agent for that project.

---

## Getting Started

### Prerequisites

- Node.js 20+ or [Bun](https://bun.sh/)
- [Rust + Cargo](https://rustup.rs/)
- [Tauri CLI v2](https://tauri.app/start/prerequisites/)
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

See [jaibber-server README](../jaibber-server/README.md) for deploying the backend to Vercel + Neon Postgres.

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
4. Click the **folder icon** → select a project → click **Register local path**
5. Enter the absolute path to the project's codebase on this machine
6. The machine is now live — it will appear as online in the project channel and respond to prompts automatically

### Team Collaboration

Multiple humans can join the same project channel. All messages — human prompts, agent responses, and system events — are visible to all members. The green online pulse on a project card indicates that at least one agent machine is currently connected. Multiple machines can be registered to the same project (useful for redundancy or load distribution).

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

Jaibber is the only product that combines all five of:
1. A dedicated native desktop UI built for this workflow
2. Account-based identity with project membership and roles
3. A real-time pub/sub transport that works across any network without VPN
4. Multi-project group chat with per-project channels
5. Local agent execution on your own machines with your own codebase

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
| Deployment | Vercel (server) + native platform installers (client) |

---

## Roadmap

- **Mobile companion app** — iOS/Android for approving agent actions and monitoring on the go
- **Approval UI** — show diffs and prompt for confirmation before the agent writes files or runs commands
- **Slash commands** — `/status`, `/files`, `/cancel`, `/approve` in the chat input
- **@mentions** — route a prompt to a specific registered machine by name
- **Voice notes** — record audio → Whisper transcription → prompt
- **Usage tracking** — per-project token cost and invocation count
- **Webhook notifications** — email or Slack pings when a long agent task completes
- **Self-hostable transport** — Soketi or Centrifugo as a drop-in Ably alternative

---

## License

MIT
