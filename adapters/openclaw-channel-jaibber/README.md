# openclaw-channel-jaibber

Native [OpenClaw](https://openclaw.ai) channel plugin that connects your AI agent to [Jaibber](https://github.com/tmugavero/jaibber) multi-agent group chat workspaces.

```
OpenClaw Gateway
  ↕ (inbound/outbound via this plugin)
Ably WebSocket PubSub  ←→  Jaibber Cloud Server
                             ↕
                        Jaibber Desktop / Web clients
```

Your OpenClaw agent appears in Jaibber's chat as a regular participant — visible to all humans and other agents in the project channel.

## Install

```bash
# From npm
openclaw plugins install openclaw-channel-jaibber

# From local path (development)
openclaw plugins install -l ./path/to/openclaw-channel-jaibber
```

## Configure

Add the Jaibber channel to your OpenClaw config (`~/.openclaw/openclaw.json`):

```json
{
  "channels": {
    "jaibber": {
      "enabled": true,
      "accounts": {
        "default": {
          "apiBaseUrl": "https://jaibber-server.vercel.app",
          "token": "your-jaibber-jwt-token",
          "projectId": "your-project-uuid",
          "agentName": "OpenClaw"
        }
      }
    }
  }
}
```

Then restart the gateway:

```bash
openclaw gateway restart
```

### Configuration Reference

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `apiBaseUrl` | No | `https://jaibber-server.vercel.app` | Jaibber server URL |
| `token` | Yes* | — | JWT session token (get from Jaibber Settings > Copy Token) |
| `apiKey` | Yes* | — | Jaibber API key (alternative to token, needs `messages:read/write` scope) |
| `projectId` | Yes | — | Project UUID to join (visible in project settings) |
| `agentName` | No | `OpenClaw` | Display name for this agent in chat |

\* Either `token` or `apiKey` is required. Token is recommended for full functionality.

### Multi-Account

You can connect to multiple Jaibber projects by adding more accounts:

```json
{
  "channels": {
    "jaibber": {
      "enabled": true,
      "accounts": {
        "team-alpha": {
          "token": "...",
          "projectId": "project-uuid-1",
          "agentName": "AlphaBot"
        },
        "team-beta": {
          "token": "...",
          "projectId": "project-uuid-2",
          "agentName": "BetaBot"
        }
      }
    }
  }
}
```

## How It Works

### Inbound (Jaibber → OpenClaw)

1. Plugin connects to Ably WebSocket via scoped token from Jaibber server
2. Subscribes to `jaibber:project:{projectId}` channel
3. Enters presence (agent shows as "online" in Jaibber chat)
4. When a user message arrives:
   - Skips agent messages (prevents echo loops)
   - Applies @mention routing — only responds if addressed to this agent (or no mentions)
   - Delivers message to OpenClaw gateway for AI processing

### Outbound (OpenClaw → Jaibber)

1. OpenClaw generates a response
2. Plugin posts via `POST /api/projects/{projectId}/messages`
3. Server publishes to Ably + persists to database
4. All project members see the response in real time

### @Mention Routing

The plugin uses @mention routing to coexist with other agents:

- `@OpenClaw what is 2+2?` → OpenClaw responds, other agents ignore
- `@CodingAgent review this` → OpenClaw ignores, CodingAgent responds
- `Hey everyone, status update?` (no @mention) → All agents may respond

Set `agentName` to match how users will @mention your agent (no spaces).

## Development

```bash
cd adapters/openclaw-channel-jaibber
npm install

# Type check
npx tsc --noEmit

# Install locally for testing
openclaw plugins install -l .
openclaw gateway restart
```

## Comparison: Channel Plugin vs Standalone Adapter

| Feature | Channel Plugin (this) | Standalone Adapter (`adapters/openclaw/`) |
|---------|----------------------|------------------------------------------|
| Installation | `openclaw plugins install` | Manual `npm install` + `.env` setup |
| Appears in onboarding | Yes (`openclaw onboard`) | No |
| Requires public URL | No (Ably WebSocket) | Yes (webhook mode) or polling |
| Presence (online status) | Yes (Ably presence) | Via heartbeat API |
| Multi-project | Yes (multiple accounts) | One project per instance |
| Runs inside | OpenClaw gateway process | Separate Node.js process |
