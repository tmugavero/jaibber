# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend dev server (port 5174)
npm run dev

# TypeScript type check
npx tsc --noEmit

# Frontend production build
npm run build

# Full Tauri dev (starts Vite + Tauri window)
npm run tauri dev

# Full Tauri production build
npm run tauri build

# Rust compile check (faster than full build)
cd src-tauri && cargo check

# Rust build only
cd src-tauri && cargo build
```

There are no automated tests. No test runner is configured.

## Architecture

Jaibber is a **Tauri v2 desktop app + web client** — a Telegram-style group chat for humans to send prompts to Claude Code agents running on remote machines across any network. It is **account-based and server-backed**: every user has a Jaibber account, projects are shared workspaces, and all communication flows through Ably WebSocket pub/sub channels.

The desktop app runs agents (Claude Code execution); the web client is chat-only (no agent execution). Both share the same React frontend with platform detection (`isTauri`).

### High-Level Data Flow

```
User types prompt in ChatWindow
  → chatStore → useAbly → Ably channel jaibber:project:{projectId}
  → All project members receive message in real time
  → @mention routing: if @AgentName present, only that agent responds
  → If local machine is registered for that projectId:
      → Build conversation context (last 20 messages)
      → Prepend agent instructions (system prompt)
      → Tauri run_claude_stream(prompt, projectDir, ...) → bash -c 'claude --print ...'
      → stdout line-by-line → Tauri events → chatStore.appendChunk()
      → Chunks batched (200ms) → published to Ably → all members see streaming response
      → On done: chatStore.markDone() + Ably "response" with full text
```

### Boot Sequence (App.tsx)

1. **Schema version check** — if stored schema_version < 2, wipe all local data (migration)
2. **Load persisted auth** — read token/userId/username from tauri-plugin-store (desktop) or localStorage (web)
3. **Load settings from Rust** — getSettings() fetches anthropicApiKey/machineName/apiBaseUrl; falls back to JS store if apiBaseUrl missing (network-resilient)
4. **Validate token** — GET /api/auth/me; 401 → LoginScreen; network error → continue (offline mode)
5. **Load contacts from server** — GET /api/projects → contactStore
6. **Load local projects** — read local_projects from store → projectStore; migrate old projects lacking agentName/agentInstructions
7. **Load chat history** — chatPersistence → chatStore
8. **Load organizations** — GET /api/orgs → orgStore
9. **Render AppShell**

If no auth → render LoginScreen.

### Rust Backend (`src-tauri/src/`)

- **`lib.rs`** — App initialization; registers plugins (shell, store); registers 4 Tauri commands; builds `Arc<AppState>`
- **`state.rs`** — `AppSettings { anthropicApiKey, machineName, apiBaseUrl }` wrapped in `Arc<RwLock<AppSettings>>`
- **`error.rs`** — `JaibberError` enum; serialize to string for Tauri IPC; no `From` impl for Tauri store errors — use `.map_err(|e| JaibberError::Other(e.to_string()))`
- **`commands/settings_commands.rs`** — `get_settings`, `save_settings`; persist via tauri-plugin-store to `jaibber.json`
- **`commands/process_commands.rs`** — Two commands:
  - `run_claude(prompt, project_dir)` — one-shot execution, returns full stdout
  - `run_claude_stream(prompt, project_dir, response_id, system_prompt, conversation_context)` — streaming execution: spawns Claude CLI, reads stdout line-by-line via `tokio::spawn` + `BufReader::lines()`, emits `"claude-chunk"` Tauri events with `{responseId, chunk, done, error}`. Full prompt = system_prompt + conversation_context preamble + user prompt. `got_output` flag: treats process as success if any stdout was produced, regardless of exit code.

Both commands: source full shell env (bashrc/profile/nvm/zshrc) via `bash -c`, add AppData Claude path on Windows, export ANTHROPIC_API_KEY, run `claude --print --dangerously-skip-permissions '{prompt}'` in cwd=projectDir.

Tauri command registration: any new `#[tauri::command]` fn must be added to `.invoke_handler(tauri::generate_handler![...])` in `lib.rs`.

If any Rust file calls `.emit()`, it must have `use tauri::Emitter;`.

### Frontend (`src/`)

**App entry:** `App.tsx` runs the boot sequence → renders `LoginScreen` or `AppShell`.

**Platform abstraction (`lib/platform.ts`):**
- `isTauri` — boolean, true in Tauri desktop, false in browser
- `storage` — unified get/set/delete/clear abstraction (tauri-plugin-store on desktop, localStorage on web)
- `getSettings()` / `saveSettings()` — Rust invoke on desktop, localStorage on web
- `runClaude()` / `runClaudeStream()` — Tauri-only, throws on web
- `listenEvent()` — Tauri event listener wrapper, no-op on web
- `openUrl()` — Tauri shell.open on desktop, window.open on web

**Stores (Zustand):**
- `authStore` — JWT token, userId, username; persisted to storage
- `settingsStore` — anthropicApiKey, machineName, apiBaseUrl; persisted via Rust saveSettings()
- `contactStore` — projects loaded from server (id → Contact with isOnline, role, ablyChannelName, onlineAgents[])
- `chatStore` — messages keyed by projectId; supports streaming (appendChunk → markDone), clearConversation
- `projectStore` — local registered projects (projectId → { projectDir, name, ablyChannelName, agentName, agentInstructions })
- `orgStore` — organizations, stats, agents; loaded from server

**Critical rule:** Inside `useEffect` or Ably subscribe callbacks, always call store actions via `useStore.getState().action()` — never destructure from the Zustand hook (stale closure).

**Ably channels (hooks/useAbly.ts):**
- `jaibber:presence` — global presence; each client enters with `{ userId, username, projectIds }`
- `jaibber:project:{projectId}` — one per project; all members send/receive here

**Per-project presence data:**
```typescript
{
  userId, username,
  isAgent: boolean,           // true if this connection has the project registered locally
  agentName?: string,         // e.g. "Coder", "Tester"
  agentInstructions?: string, // system prompt (visible to web clients via info panel)
  machineName?: string,       // e.g. "dev-server"
}
```

**Ably token auth:** `initAbly(apiBaseUrl, userId, getToken)` — uses authUrl pointing to `/api/ably/token`; clientId=userId UUID. The Ably API key is server-side only, never in the client.

**Message types on project channels:**
```typescript
type: "message"   // User prompt sent
type: "typing"    // Agent acknowledges, starting to process
type: "chunk"     // Streaming response chunk (batched every 200ms)
type: "response"  // Final complete response text (replaces streaming bubble)
type: "error"     // Agent error
type: "done"      // Legacy — treated same as "response"
```

**@mention routing (`lib/mentions.ts`):**
- `parseMentions(text)` — extracts `@AgentName` patterns, returns lowercase array
- In useAbly.ts: if mentions exist and none match this agent's name (case-insensitive), skip responding

**Connection-level identity:**
- `msg.connectionId === ably.connection.id` — used for skip logic on typing/chunk/response handlers
- NOT `payload.from === userId` — same user on different devices must still see agent responses
- `isMine = payload.from === userId` — only used for message sender attribution ("me" vs "them")

**Agent response flow (useAbly.ts):**
1. Incoming `"message"` with projectId matching a localProject → this machine is a responder
2. Parse @mentions; if targeted elsewhere → skip
3. Create streaming message bubble (status: "streaming")
4. Publish `"typing"` to Ably (includes responseId for bubble correlation)
5. Build conversation context: last 20 done messages, formatted as `User: text` / `Assistant (AgentName): text`
6. Call `runClaudeStream()` (returns immediately, spawns Rust process)
7. Listen for `"claude-chunk"` Tauri events filtered by responseId
8. Each chunk: `chatStore.appendChunk()` locally + accumulate in buffer
9. Flush buffer to Ably every 200ms as `"chunk"` messages
10. On done: `chatStore.markDone()` + Ably `"response"` with complete text + unlisten
11. On error: mark error + publish `"error"` message + unlisten

**`lib/chatPersistence.ts`** — debounced (1s) save/load of chat history to storage key `chat_messages`; skips in-flight messages (streaming/sending)

**`lib/ably.ts`** — `initAbly()` and `getAblyClient()`

**`lib/plans.ts`** — Stripe plan types, fallback plans, `fetchPlans()` from server

**`lib/mentions.ts`** — `parseMentions()` utility for @mention extraction

### UI Components

| Component | Purpose |
|-----------|---------|
| `components/auth/LoginScreen.tsx` | Two-tab: credentials (register/login) + GitHub OAuth (open browser → paste token) |
| `components/layout/AppShell.tsx` | Main layout: ContactList sidebar + right panel (chat / settings / projects / admin / billing) |
| `components/contacts/ContactList.tsx` | Sidebar: project list with online indicator, settings/projects/admin/billing buttons |
| `components/contacts/ContactCard.tsx` | Per-project card: avatar, name, last message preview, online pulse |
| `components/chat/ChatWindow.tsx` | Header (with info panel + clear button) + message list + MessageInput |
| `components/chat/MessageBubble.tsx` | Text, sender name, timestamp, status icon (·/✓/✗), code block rendering |
| `components/chat/MessageInput.tsx` | Auto-expand textarea, Enter to send, disabled while streaming |
| `components/chat/TypingIndicator.tsx` | Animated bouncing dots |
| `components/projects/ProjectsPanel.tsx` | Register local projects (link to projectDir, configure agent name/instructions) or create new projects on server |
| `components/settings/SettingsPage.tsx` | Machine name, Anthropic API key, server URL (desktop only), sign out |
| `components/admin/AdminConsole.tsx` | Org stats, agent monitoring, member management (owner/admin only) |
| `components/billing/BillingPage.tsx` | Stripe billing plans, per-seat pricing, subscription management |
| `components/org/CreateOrgInline.tsx` | Inline form for creating a new organization |

**ChatWindow info panel:** Clicking the (?) button in the chat header shows a collapsible panel with:
- Project description
- Online agents: name, machine name, and full agent instructions (from Ably presence data)
- @mention usage tip

### Data Types

```typescript
// Message
{ id, conversationId /* = projectId */, sender: "me"|"them", senderName?, text, timestamp, status: "sending"|"sent"|"streaming"|"done"|"error" }

// AblyMessage (wire format on Ably channels)
{ from, fromUsername, projectId, text, messageId, type, responseId?, agentName?, mentions? }

// Contact
{ id /* projectId */, name, description, ablyChannelName, isOnline, lastSeen, role: "admin"|"member", onlineAgents: AgentInfo[] }

// AgentInfo (from presence data)
{ connectionId, agentName, machineName?, agentInstructions? }

// AppSettings
{ anthropicApiKey: string|null, machineName: string, apiBaseUrl: string }

// LocalProject
{ projectId, name, projectDir, ablyChannelName, agentName: string, agentInstructions: string }
```

### Port / Vite Configuration

Vite dev port is **5174** (not 1420 or 3000). Configured in `vite.config.ts` with `host: "127.0.0.1"` (explicit IPv4). `tauri.conf.json` `devUrl` must match. Do not change these without updating both files.

### Backend (jaibber-server)

The server lives at `C:\Users\tmuga\Code\jaibber-server` — a separate Next.js 15 repo deployed on Vercel.

Key endpoints:
- `POST /api/auth/register` — username/password registration
- `POST /api/auth/token` — login → JWT
- `GET /api/auth/me` — validate token
- `GET /api/auth/github/start` + `/callback` — GitHub OAuth → show JWT on page for copy-paste
- `GET /api/projects` — list projects user is member of
- `POST /api/projects` — create project; auto-generates UUID and Ably channel name
- `GET/PATCH/DELETE /api/projects/[id]` — project CRUD (admin required for write)
- `POST /api/projects/[id]/members` — add user to project
- `DELETE /api/projects/[id]/members/[userId]` — remove member (cannot remove last admin)
- `POST /api/projects/[id]/tasks` — create task; `GET` for paginated list (filter by status/agent)
- `PATCH /api/tasks/[taskId]` — update task status/priority/assignment; `DELETE` to remove
- `POST /api/projects/[id]/messages` — send/persist message; `GET` for paginated history
- `POST /api/orgs/[id]/webhooks` — create webhook (returns secret once); `GET` to list (secrets omitted)
- `PATCH/DELETE /api/orgs/[id]/webhooks/[webhookId]` — update or remove webhook
- `POST /api/ably/token` — issue scoped Ably TokenRequest (clientId=userId, scoped to user's project channels)
- `GET/POST /api/orgs` — organization CRUD
- `GET /api/orgs/[id]/stats` — usage statistics
- `GET /api/orgs/[id]/agents` — agent listing
- `POST /api/stripe/checkout` — Stripe checkout session creation
- `GET /api/stripe/plans` — dynamic plan/pricing fetch

Database: Neon Postgres; tables: `users`, `projects`, `projectMembers`, `orgs`, `orgMembers`, `tasks`, `webhooks`, `agents`, `agentProjectAssignments`, `apiKeys`, `messages`, `usageEvents`, `auditLog`, `orgInvites`, `projectInvites`
Auth: HS256 JWT (7-day TTL), bcryptjs password hashing (12 rounds); dual auth (JWT sessions + API keys with scope-based access)

### Task System (Wave 3A)

Task statuses: `submitted` → `working` → `completed` | `failed` | `input-required` | `cancelled`. Priorities: `low`, `medium`, `high`, `urgent`.

Frontend: `stores/taskStore.ts` (Zustand, keyed by projectId), `lib/taskApi.ts`, `components/tasks/` (TaskListPanel, TaskCard, TaskDetailPanel, CreateTaskForm). ChatWindow has Chat/Tasks tabs; MessageBubble has "create task from message" button. Real-time sync via Ably task events. Auto-execution: if assigned agent matches local agent, picks up task, runs Claude, updates status.

### Webhook Notifications (Wave 3B)

Webhook table: `id`, `orgId`, `url`, `events` (text[]), `secret`, `status` (active/paused), `createdBy`, `createdAt`.

Dispatch library (`lib/webhooks.ts`):
- `generateWebhookSecret()` — `whsec_` prefix + 32 random bytes hex
- `dispatchWebhookEvent(orgId, event, data, projectId?)` — fire-and-forget (same pattern as `logAudit()`)
- Queries active webhooks via Postgres array contains (`@>`), signs with HMAC-SHA256
- Headers: `X-Jaibber-Signature: sha256={hex}`, `X-Jaibber-Event`, `X-Jaibber-Delivery`
- 10s timeout; `Promise.allSettled` for parallel delivery; audit logs each attempt

Events wired: `task.created`, `task.completed`, `task.failed`, `message.created`
Events defined but deferred: `agent.online`, `agent.offline` (requires Ably presence webhook config)

API key scopes: `messages:read/write`, `tasks:read/write`, `agents:read/write/manage`, `webhooks:manage`

Frontend: Org ID displayed with copy button in AdminConsole header for webhook setup

### Key Patterns to Remember

- `@radix-ui/react-badge` does not exist as a package — use plain styled spans
- Ably v2: `presence.get()` returns a Promise (no error-first callback)
- Zustand in callbacks: always `useStore.getState().action()`, never destructure
- Tauri store errors: `.map_err(|e| JaibberError::Other(e.to_string()))` — no `From` impl
- Tauri v2: `use tauri::Emitter;` required in any file calling `.emit()`
- Frontend path alias `@/` → `src/` (tsconfig.json + vite.config.ts)
- No router — active view controlled by state in AppShell
- TailwindCSS + shadcn/ui; shadcn config in `components.json`
- `serde_json::json!` macro: use `null` (not `null::<Type>`) for null values
- Rust streaming: `tokio::spawn` for background stdout reading; `got_output` flag to handle exit code 127 with valid output
- Connection-level skip logic: `msg.connectionId === ably.connection.id`, not `payload.from === userId`
- Conversation context format: `User: text` / `Assistant (AgentName): text` with "Respond ONLY to the final user message" preamble
- Ably chunk batching: 200ms timer to avoid rate limits; final `"response"` message contains complete text for remote bubble replacement
- Agent instructions textarea: `rows={8}`, `resize-y`, supports markdown — content is prepended to every Claude invocation as system prompt
