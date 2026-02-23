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

Jaibber is a **Tauri v2 desktop app** — a Telegram-style group chat for humans to send prompts to Claude Code agents running on remote machines across any network. It is **account-based and server-backed** (v2): every user has a Jaibber account, projects are shared workspaces, and all communication flows through Ably WebSocket pub/sub channels.

### High-Level Data Flow

```
User types prompt in ChatWindow
  → chatStore → useAbly → Ably channel jaibber:project:{projectId}
  → All project members receive message in real time
  → If local machine is registered for that projectId:
      → Tauri run_claude(prompt, projectDir) → bash -c 'claude --print ...'
      → Response chunks published back via Ably → streaming render in MessageBubble
      → All members see the streamed response
```

### Boot Sequence (App.tsx)

1. **Schema version check** — if stored schema_version < 2, wipe all local data (migration)
2. **Load persisted auth** — read token/userId/username from tauri-plugin-store
3. **Load settings from Rust** — getSettings() fetches anthropicApiKey/machineName/apiBaseUrl; falls back to JS store if apiBaseUrl missing (network-resilient)
4. **Validate token** — GET /api/auth/me; 401 → LoginScreen; network error → continue (offline mode)
5. **Load contacts from server** — GET /api/projects → contactStore
6. **Load local projects** — read local_projects from store → projectStore
7. **Load chat history** — chatPersistence → chatStore
8. **Render AppShell**

If no auth → render LoginScreen.

### Rust Backend (`src-tauri/src/`)

- **`lib.rs`** — App initialization; registers plugins (shell, store, notification, process); registers 3 Tauri commands; builds `Arc<AppState>`
- **`state.rs`** — `AppSettings { anthropicApiKey, machineName, apiBaseUrl }` wrapped in `Arc<RwLock<AppSettings>>`. No ablyApiKey, no myHandle, no mode.
- **`error.rs`** — `JaibberError` enum; serialize to string for Tauri IPC; no `From` impl for Tauri store errors — use `.map_err(|e| JaibberError::Other(e.to_string()))`
- **`commands/settings_commands.rs`** — `get_settings`, `save_settings`; persist via tauri-plugin-store to `jaibber.json`
- **`commands/process_commands.rs`** — `run_claude(prompt, project_dir)`: sources full shell env (bashrc/profile/nvm/zshrc) via `bash -c`, adds AppData Claude path on Windows, exports ANTHROPIC_API_KEY, spawns `claude --print --dangerously-skip-permissions '{prompt}'` in cwd=projectDir, returns stdout

Tauri command registration: any new `#[tauri::command]` fn must be added to `.invoke_handler(tauri::generate_handler![...])` in `lib.rs`.

If any Rust file calls `.emit()`, it must have `use tauri::Emitter;`.

### Frontend (`src/`)

**App entry:** `App.tsx` runs the boot sequence → renders `LoginScreen` or `AppShell`.

**Stores (Zustand):**
- `authStore` — JWT token, userId, username; persisted to tauri-plugin-store
- `settingsStore` — anthropicApiKey, machineName, apiBaseUrl; persisted via Rust saveSettings()
- `contactStore` — projects loaded from server (id → Contact with isOnline, role, ablyChannelName)
- `chatStore` — messages keyed by projectId; supports streaming (appendChunk → markDone)
- `projectStore` — local registered projects (projectId → { projectDir, name, ablyChannelName })

**Critical rule:** Inside `useEffect` or Ably subscribe callbacks, always call store actions via `useStore.getState().action()` — never destructure from the Zustand hook (stale closure).

**Ably channels (hooks/useAbly.ts):**
- `jaibber:presence` — global presence; each client enters with `{ userId, username, projectIds }`
- `jaibber:project:{projectId}` — one per project; all members send/receive here

**Ably token auth:** `initAbly(apiBaseUrl, userId, getToken)` — uses authUrl pointing to `/api/ably/token`; clientId=userId UUID. The Ably API key is server-side only, never in the client.

**Message types on project channels:**
```typescript
type: "message"   // User prompt sent
type: "typing"    // Agent acknowledges, starting to process
type: "response"  // Agent partial/full response chunk
type: "error"     // Agent error
```

**Agent logic:** If incoming message's projectId exists in `projectStore.projects` (local machine is registered for that project), call `runClaude(prompt, projectDir)` and publish response chunks back to the channel.

**`lib/tauri.ts`** — typed wrappers for `invoke()` calls: `getSettings()`, `saveSettings()`, `runClaude()`

**`lib/chatPersistence.ts`** — debounced (1s) save/load of chat history to tauri-plugin-store key `chat_messages`; skips in-flight messages (streaming/sending)

**`lib/ably.ts`** — `initAbly()` and `getAblyClient()`

### UI Components

| Component | Purpose |
|-----------|---------|
| `components/auth/LoginScreen.tsx` | Two-tab: credentials (register/login) + GitHub OAuth (open browser → paste token) |
| `components/layout/AppShell.tsx` | Main layout: ContactList sidebar + right panel (chat / settings / projects) |
| `components/contacts/ContactList.tsx` | Sidebar: project list with online indicator, settings button, projects folder button |
| `components/contacts/ContactCard.tsx` | Per-project card: avatar, name, last message preview, online pulse |
| `components/chat/ChatWindow.tsx` | Header + message list (ScrollArea) + MessageInput |
| `components/chat/MessageBubble.tsx` | Text, sender, timestamp, status icon (·/✓/✗), code block rendering |
| `components/chat/MessageInput.tsx` | Auto-expand textarea, Enter to send, disabled while streaming |
| `components/chat/TypingIndicator.tsx` | Animated bouncing dots |
| `components/projects/ProjectsPanel.tsx` | Register local projects (link projectId to projectDir) or create new projects on server |
| `components/settings/SettingsPage.tsx` | Machine name, Anthropic API key, server URL, sign out |

### Data Types

```typescript
// Message
{ id, conversationId /* = projectId */, sender: "me"|"them", senderName?, text, timestamp, status: "sending"|"sent"|"streaming"|"done"|"error" }

// Contact
{ id /* projectId */, name, description, ablyChannelName, isOnline, lastSeen, role: "admin"|"member" }

// AppSettings
{ anthropicApiKey: string|null, machineName: string, apiBaseUrl: string }

// LocalProject
{ projectId, name, projectDir, ablyChannelName }
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
- `POST /api/ably/token` — issue scoped Ably TokenRequest (clientId=userId, scoped to user's project channels)

Database: Neon Postgres; tables: `users`, `projects`, `projectMembers`
Auth: HS256 JWT (7-day TTL), bcryptjs password hashing (12 rounds)

### Key Patterns to Remember

- `@radix-ui/react-badge` does not exist as a package — use plain styled spans
- Ably v2: `presence.get()` returns a Promise (no error-first callback)
- Zustand in callbacks: always `useStore.getState().action()`, never destructure
- Tauri store errors: `.map_err(|e| JaibberError::Other(e.to_string()))` — no `From` impl
- Tauri v2: `use tauri::Emitter;` required in any file calling `.emit()`
- Frontend path alias `@/` → `src/` (tsconfig.json + vite.config.ts)
- No router — active view controlled by state in AppShell
- TailwindCSS + shadcn/ui; shadcn config in `components.json`
