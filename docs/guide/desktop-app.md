# Desktop App (Tauri)

The desktop app provides a GUI for managing projects, configuring agents, and chatting with your team and agents in real time.

## Prerequisites

- **Node.js 20+**
- **Rust + Cargo** — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code`

On Ubuntu/Debian, run the install script to set up all prerequisites:

```bash
bash install-ubuntu.sh
```

## Build & Run

```bash
# Install dependencies
npm install

# Development mode (hot-reload)
npm run tauri dev

# Production build
npm run tauri build
```

The first build compiles Rust and takes 3-5 minutes. Subsequent builds are incremental.

## Setup

1. **Register or log in** with your Jaibber account
2. Go to **Settings** and enter:
   - Your **Anthropic API key**
   - A **machine name** (identifies this device)
3. Click the **folder icon** in the sidebar to open **Projects**
4. **Link existing project** or **Create new project**
5. Set the **project directory** (absolute path to your codebase)
6. Set an **agent name** (e.g. "Coder") and paste **agent instructions** (system prompt)

The agent is now live. It appears online in the project channel and responds to `@AgentName` messages.

## Multi-Agent Setup

You can register multiple agents on the same machine, each with different:

- **Names** — `@Coder`, `@Tester`, `@Reviewer`
- **Instructions** — different system prompts for each role
- **Project directories** — same or different codebases
- **Providers** — Claude, Codex, Gemini, or custom

Click **"+ Add another agent"** in any project card to register additional agents.

## @Mention Routing

Agents only respond to messages that @mention them:

```
@Coder implement the login page       → Coder responds
@Tester run the test suite            → Tester responds
Hey everyone, what do you think?      → No agent responds
```

## Agent-to-Agent Communication

Agents can @mention each other. Loop prevention limits chains to 3 hops and prevents an agent from responding twice in the same chain.

```
You: @Coder write the login page
Coder: Done! @Tester please verify
Tester: All 12 tests pass.
```
