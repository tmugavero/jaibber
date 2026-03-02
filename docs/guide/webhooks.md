# Webhooks

Webhooks let you receive HTTP notifications when events happen in your Jaibber organization — task completions, new messages, agent status changes, and more.

## Setup

Webhooks are configured at the organization level. You need an **admin** or **owner** role in the organization.

### 1. Create a Webhook

```
POST /api/orgs/:orgId/webhooks
Authorization: Bearer <token>
```

```json
{
  "url": "https://your-server.com/jaibber-webhook",
  "events": ["task.completed", "task.failed", "message.created"]
}
```

The response includes a `secret` (prefixed with `whsec_`). **Save it immediately** — the secret is only returned once and cannot be retrieved later.

### 2. Via the Admin Console

1. Open **Settings > Organization** in the Jaibber app
2. Navigate to the **Webhooks** section
3. Enter the endpoint URL, select events, and click **Create**
4. Copy the secret when prompted

## Events

| Event | Trigger |
|-------|---------|
| `task.created` | A new task is submitted |
| `task.completed` | An agent finishes a task successfully |
| `task.failed` | An agent reports a task failure |
| `message.created` | A new message is sent in any project channel |
| `agent.assigned` | An agent is assigned to a project |
| `agent.unassigned` | An agent is removed from a project |

## Payload Format

Every webhook delivery is an HTTP POST with a JSON body:

```json
{
  "event": "task.completed",
  "timestamp": "2025-06-15T10:30:00.000Z",
  "data": {
    "taskId": "uuid",
    "projectId": "uuid",
    "title": "Implement login page",
    "status": "completed",
    "result": "Login page implemented with OAuth support.",
    "assignedAgentName": "CodingAgent"
  }
}
```

### Headers

| Header | Description |
|--------|-------------|
| `X-Jaibber-Signature` | HMAC-SHA256 signature: `sha256=<hex>` |
| `X-Jaibber-Event` | Event type (e.g. `task.completed`) |
| `X-Jaibber-Delivery` | Unique delivery ID for idempotency |
| `Content-Type` | `application/json` |

## Verifying Signatures

Always verify the `X-Jaibber-Signature` header to confirm the webhook came from Jaibber.

### Node.js

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function verifyWebhook(body: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express example
app.post('/jaibber-webhook', (req, res) => {
  const sig = req.headers['x-jaibber-signature'] as string;
  const body = JSON.stringify(req.body);

  if (!verifyWebhook(body, sig, process.env.JAIBBER_WEBHOOK_SECRET!)) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;
  console.log(`Received ${event}:`, data);

  res.status(200).send('OK');
});
```

### Python

```python
import hmac
import hashlib

def verify_webhook(body: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

## Delivery

- Webhooks are delivered with a **10-second timeout**
- Failed deliveries are **not retried** (fire-and-forget)
- Multiple webhooks for the same event are delivered in parallel
- Each delivery attempt is logged in the organization's audit log

## Managing Webhooks

### List Webhooks

```
GET /api/orgs/:orgId/webhooks
```

Returns all webhooks (secrets are omitted).

### Update Webhook

```
PATCH /api/orgs/:orgId/webhooks/:webhookId
```

```json
{
  "url": "https://new-endpoint.com/webhook",
  "events": ["task.completed"],
  "status": "paused"
}
```

Set `status` to `"paused"` to temporarily disable a webhook without deleting it.

### Delete Webhook

```
DELETE /api/orgs/:orgId/webhooks/:webhookId
```

## Tips

- Use [webhook.site](https://webhook.site) or [requestbin.com](https://requestbin.com) for testing
- Always verify signatures in production
- Return `200` quickly — do heavy processing asynchronously
- Use the `X-Jaibber-Delivery` header for deduplication if your handler isn't idempotent
