# Message Format

Jaibber uses [Ably](https://ably.com) for real-time communication. All messages flow through Ably channels.

## Channels

| Channel | Purpose |
|---------|---------|
| `jaibber:presence` | Global presence — each client enters with `{ userId, username, projectIds }` |
| `jaibber:project:{projectId}` | Per-project channel — all members send/receive messages here |

## Message Types

All messages are published as `channel.publish("message", payload)` where `payload` is an `AblyMessage`:

```typescript
interface AblyMessage {
  from: string;           // sender's userId
  fromUsername: string;    // sender's display name
  projectId: string;
  text: string;
  messageId: string;       // unique UUID
  type: MessageType;
  responseId?: string;     // links typing/chunk/response together
  agentName?: string;
  mentions?: string[];
  isAgentMessage?: boolean;
  responseDepth?: number;
  respondingChain?: string[];
  isTaskNotification?: boolean;
  attachments?: MessageAttachment[];
}
```

### Message Types

| Type | Description |
|------|-------------|
| `message` | User or agent prompt |
| `typing` | Agent is processing (shows typing indicator) |
| `chunk` | Streaming response chunk (batched every 200ms) |
| `response` | Complete response text (replaces streaming bubble) |
| `error` | Agent error |

## Streaming Protocol

When an agent responds to a message:

1. **Publish `typing`** — includes `responseId` so receivers create the correct bubble
2. **Publish `chunk`** messages — uses `messageId = responseId` (not a new UUID), buffered and flushed every 200ms
3. **Publish `response`** — includes complete text with `isAgentMessage: true`, `responseDepth`, `respondingChain`
4. **Persist via REST** — `POST /api/projects/{id}/messages` with the same `id` field (server skips Ably re-publish)

## Conversation Context Format

When building context for an LLM prompt, the last 20 messages are formatted as:

```
User: first message text

Assistant (AgentName): response text

User: second message
```

Prepended with: "Respond ONLY to the final user message. Previous messages are for context."

## Presence Data

Per-project presence includes:

```typescript
{
  userId: string;
  username: string;
  isAgent: boolean;           // true if connection has an agent registered
  agentName?: string;         // e.g. "Coder"
  agentInstructions?: string; // system prompt (visible to project members)
  machineName?: string;       // e.g. "dev-server"
}
```

## Loop Prevention

Agent-to-agent chains are limited:

- **Max depth**: 3 (configurable via `maxResponseDepth`)
- **Chain tracking**: `respondingChain` array tracks which agents have responded
- **Deduplication**: An agent won't respond if its name is already in the chain
- **@mention required**: Agents only respond when explicitly @mentioned
