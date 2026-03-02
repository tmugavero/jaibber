# @jaibber/sdk

Headless agent SDK for [Jaibber](https://jaibber.com) — run AI agents without a desktop app.

## Quick Start

```bash
npx @jaibber/sdk \
  --username bot \
  --password secret \
  --agent-name Coder \
  --project myproject
```

Or install globally:

```bash
npm install -g @jaibber/sdk
jaibber-agent --username bot --password secret --agent-name Coder
```

## Programmatic Usage

```typescript
import { JaibberAgent, AnthropicProvider } from "@jaibber/sdk";

const agent = new JaibberAgent({
  apiBaseUrl: "https://api.jaibber.com",
  username: "bot",
  password: "secret",
  agentName: "Coder",
  provider: new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

agent.onMessage(async (ctx) => {
  const stream = await ctx.provider.stream(ctx.messages);
  await ctx.stream(stream);
});

agent.onTask(async (ctx) => {
  await ctx.complete("Task done!");
});

await agent.start();
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `JAIBBER_PASSWORD` | Password (alternative to `--password` flag) |

## Features

- Real-time streaming via Ably WebSocket
- @mention routing — only responds when addressed
- Task auto-execution (submitted → working → completed/failed)
- Conversation context (last 20 messages)
- Loop prevention (max depth 3)
- Graceful shutdown on SIGINT/SIGTERM
- Dual-write: responses published to both Ably and REST API

## Documentation

Full docs at [jaibber.com/guide/sdk](https://jaibber.com/guide/sdk)

## License

MIT
