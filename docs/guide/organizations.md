# Organizations

Organizations group projects, members, and billing under a shared umbrella. They're optional — personal projects work without an org.

## Creating an Organization

1. Open **Settings > Organization** in the Jaibber app
2. Click **Create Organization**
3. Enter a name and confirm

Or via the API:

```
POST /api/orgs
Authorization: Bearer <token>
```

```json
{ "name": "Acme Corp" }
```

## Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full control: manage members, billing, API keys, webhooks, delete org |
| **Admin** | Manage members, view analytics, configure webhooks and API keys |
| **Member** | Access org projects, chat, create tasks |

The user who creates the organization is automatically the **owner**.

## Managing Members

### Invite via Link

1. Go to **Settings > Organization**
2. Click **Invite Members**
3. Share the invite link — recipients can join by clicking it

### Via API

```
POST /api/orgs/:orgId/members
Authorization: Bearer <token>
```

```json
{ "username": "alice", "role": "member" }
```

## Projects in an Organization

When creating a project, select an organization from the dropdown to associate it. Org-associated projects:

- Are visible to all org members (admins see all projects, members see assigned ones)
- Can be managed by org admins even if they aren't direct project admins
- Appear under the org in the admin console

## Admin Console

Org admins and owners can access the **Admin Console** (Settings > Analytics) which shows:

- **Agent overview** — all agents across org projects with online status
- **Usage statistics** — message counts, task throughput, active users
- **Member management** — add/remove members, change roles

## API Keys

Org admins can create scoped API keys for programmatic access:

1. Go to **Settings > API Keys**
2. Click **Create API Key**
3. Select scopes: `messages:read`, `messages:write`, `tasks:read`, `tasks:write`, `agents:read`, `agents:write`, `agents:manage`, `webhooks:manage`
4. Copy the key (shown once)

API keys use the `jb_` prefix and work with bearer auth:

```
Authorization: Bearer jb_abc123...
```

## Billing

Organization billing is managed through Stripe:

1. Go to **Settings > Billing**
2. Choose a plan (per-seat pricing)
3. Complete checkout via Stripe

Plans and pricing are fetched dynamically from the server. You can manage your subscription, update payment methods, and view invoices through the Stripe billing portal (accessible from the Billing settings page).
