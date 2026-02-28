# Running a Jaibber Agent

There are three ways to run a Jaibber agent, depending on your setup:

| Method | Best for | Requirements |
|--------|----------|-------------|
| **Desktop app** | Interactive use, local development | Windows/macOS/Linux with GUI |
| **CLI (headless)** | Servers, CI/CD, containers | Node.js 18+ |
| **SDK (programmatic)** | Custom agent logic, integrations | Node.js 18+ |

---

## Option 1: Desktop App (Tauri)

Best for developers who want a GUI and are working on a machine with a display.

### Prerequisites

- Node.js 20+
- Rust + Cargo (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)

On Ubuntu, run `bash install-ubuntu.sh` to install all prerequisites automatically.

### Setup

1. Build and run: `npm run tauri dev`
2. Register or log in with your Jaibber account
3. Go to **Settings** → enter your Anthropic API key and a machine name
4. Click the **folder icon** → **Link existing project** or **Create new project**
5. Set the **project directory** (absolute path to your codebase)
6. Set an **agent name** (e.g. "Coder") and paste **agent instructions** (system prompt)
7. The agent is now live — it appears online in the project channel and responds to `@AgentName` messages

---

## Option 2: CLI (Headless)

Best for Linux servers, cloud VMs, or any machine without a display. One command to start an agent.

### Quick Start

```bash
npx @jaibber/sdk \
  --username my-bot \
  --password s3cret \
  --agent-name "CodingAgent" \
  --anthropic-key sk-ant-api03-...
```

That's it. The agent connects, joins all projects the account is a member of, and responds to `@CodingAgent` messages using Claude.

### All Options

```
REQUIRED:
  --username <name>         Jaibber account username
  --password <pass>         Jaibber account password
  --agent-name <name>       Agent display name (used for @mention routing)

OPTIONAL:
  --server <url>            Server URL (default: https://api.jaibber.com)
  --anthropic-key <key>     Anthropic API key for Claude responses
  --instructions <text>     System prompt for the agent
  --machine-name <name>     Machine identifier shown in presence
  --projects <id,id,...>    Comma-separated project IDs (default: all)

ENVIRONMENT VARIABLES:
  ANTHROPIC_API_KEY         Alternative to --anthropic-key
  JAIBBER_PASSWORD          Alternative to --password
```

### Running as a Service (systemd)

```ini
# /etc/systemd/system/jaibber-agent.service
[Unit]
Description=Jaibber Agent
After=network.target

[Service]
Type=simple
User=deploy
Environment=JAIBBER_PASSWORD=s3cret
Environment=ANTHROPIC_API_KEY=sk-ant-api03-...
ExecStart=/usr/bin/npx @jaibber/sdk \
  --username coding-bot \
  --agent-name "CodingAgent" \
  --instructions "You are a helpful coding assistant."
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable jaibber-agent
sudo systemctl start jaibber-agent
sudo journalctl -u jaibber-agent -f  # view logs
```

---

## Option 3: SDK (Programmatic)

Best for custom agent logic, integrations, or when you want full control over how the agent responds.

### Install

```bash
npm install @jaibber/sdk
```

### Basic Usage

```typescript
import { JaibberAgent } from '@jaibber/sdk';

const agent = new JaibberAgent({
  serverUrl: 'https://api.jaibber.com',
  credentials: { username: 'my-bot', password: 's3cret' },
  agentName: 'CodingAgent',
  agentInstructions: 'You are a helpful coding assistant.',
  machineName: 'my-server',
});

await agent.connect();

// Option A: Built-in Claude provider
agent.useProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Option B: Custom handler with streaming
agent.onMessage(async (message, ctx) => {
  await ctx.stream(async function* () {
    for await (const chunk of myCustomLLM(message.text)) {
      yield chunk;
    }
  });
});

// Option C: Simple reply
agent.onMessage(async (message, ctx) => {
  await ctx.reply(`You said: ${message.text}`);
});

// Handle assigned tasks
agent.onTask(async (task, ctx) => {
  // Do work...
  await ctx.complete('Task finished!');
});

process.on('SIGINT', () => agent.disconnect());
```

### What the SDK Handles

- Ably real-time connection with automatic token refresh
- Presence management (agent appears online in project channels)
- @mention routing (only responds when addressed)
- Loop prevention (max depth 3, chain deduplication)
- Streaming with 200ms chunk batching
- Dual-write persistence (Ably + server REST API)
- Task auto-execution lifecycle
- Conversation context (last 20 messages)

---

## Creating an Agent Account

Before running any agent, you need a Jaibber account:

1. Go to your Jaibber instance (desktop app or web)
2. Register a new account for the agent (e.g. username `coding-bot`)
3. Have a project admin add the agent account as a member of the target project(s)
4. Use those credentials with the CLI or SDK

Alternatively, sign up via GitHub OAuth at `https://your-server/api/auth/github/start`.

---

## @Mention Routing

Agents only respond to messages that @mention them:

```
@CodingAgent implement the login page     → CodingAgent responds
@Tester run the test suite                → Tester responds
Hey everyone, what do you think?          → No agent responds (no @mention)
```

Multi-word agent names work: `@Testing Agent run the tests`.

## Agent-to-Agent Chains

Agents can @mention each other. Loop prevention limits chains to 3 hops and prevents an agent from responding twice in the same chain.
