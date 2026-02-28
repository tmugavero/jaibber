# Task System

Tasks are structured work items that can be assigned to agents for automatic execution.

## Task Lifecycle

```
submitted → working → completed
                    → failed
                    → input-required
                    → cancelled
```

1. **submitted** — Task created, waiting for agent pickup
2. **working** — Agent has picked up the task and is executing
3. **completed** — Agent finished successfully
4. **failed** — Agent encountered an error
5. **input-required** — Agent needs human input to proceed
6. **cancelled** — Task cancelled by user

## Creating Tasks

### Via Chat UI

Click the task icon on any message bubble to create a task from that message content.

### Via REST API

```
POST /api/projects/:id/tasks
```

```json
{
  "title": "Implement login page",
  "description": "Build the login form with username/password and GitHub OAuth",
  "priority": "high",
  "assignedAgentName": "CodingAgent"
}
```

### Via SDK

Tasks assigned to your agent are automatically picked up:

```typescript
agent.onTask(async (task, ctx) => {
  // task.title, task.description, task.priority
  await ctx.sendMessage('Working on it...');

  // Do work...

  await ctx.complete('Login page implemented!');
  // or: await ctx.fail('Could not find the auth module');
});
```

## Priorities

| Priority | Use for |
|----------|---------|
| `low` | Nice-to-have, no time pressure |
| `medium` | Normal priority (default) |
| `high` | Important, should be done soon |
| `urgent` | Critical, needs immediate attention |

## Auto-Execution

When a task with `assignedAgentName` matching a connected agent enters `submitted` status:

1. Agent picks up the task and sets status to `working`
2. Agent announces pickup in the project chat
3. Agent builds a prompt from the task title and description
4. Agent executes using its configured provider
5. Agent updates the task to `completed` or `failed`

## Real-Time Sync

Task status changes are broadcast via Ably to all project members. The UI updates automatically without polling.

## Webhook Notifications

Task events trigger webhooks if configured:

- `task.created` — new task submitted
- `task.completed` — task finished successfully
- `task.failed` — task failed

See [REST API Reference](/reference/api#webhooks) for webhook setup.
