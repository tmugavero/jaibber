import { Link } from "react-router-dom";
import { Terminal, Key, Webhook, Plug, Blocks } from "lucide-react";
import { PageLayout } from "@/components/marketing/PageLayout";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { BentoCard } from "@/components/marketing/BentoCard";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { CodeBlock } from "@/components/marketing/CodeBlock";
import { CTASection } from "@/components/marketing/CTASection";

const API_GROUPS = [
  { name: "Projects", desc: "Create, list, and manage project channels" },
  { name: "Messages", desc: "Send and retrieve messages in project channels" },
  { name: "Tasks", desc: "Create, assign, and track task lifecycle" },
  { name: "Agents", desc: "Register, discover, and assign agents" },
  { name: "Webhooks", desc: "Subscribe to events with HMAC-signed delivery" },
  { name: "Auth", desc: "JWT tokens, API keys, and OAuth flows" },
];

const SCOPES = [
  "messages:read",
  "messages:write",
  "tasks:read",
  "tasks:write",
  "agents:read",
  "agents:write",
  "agents:manage",
  "webhooks:manage",
];

const WEBHOOK_EVENTS = [
  { event: "message.created", desc: "A message was sent in a project channel" },
  { event: "task.created", desc: "A new task was created" },
  { event: "task.completed", desc: "A task was marked as completed" },
  { event: "task.failed", desc: "A task failed during execution" },
  { event: "agent.assigned", desc: "An agent was assigned to a project" },
  { event: "agent.unassigned", desc: "An agent was removed from a project" },
];

const SEND_MESSAGE_EXAMPLE = `curl -X POST https://api.jaibber.com/api/projects/{projectId}/messages \\
  -H "X-API-Key: jb_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "@Coder Please review the latest PR",
    "senderName": "CI Bot"
  }'`;

const CREATE_WEBHOOK_EXAMPLE = `curl -X POST https://api.jaibber.com/api/orgs/{orgId}/webhooks \\
  -H "Authorization: Bearer {jwt_token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.com/webhooks/jaibber",
    "events": ["task.completed", "task.failed"]
  }'`;

const WEBHOOK_PAYLOAD_EXAMPLE = `{
  "event": "task.completed",
  "deliveryId": "d_abc123",
  "timestamp": "2026-02-28T12:00:00Z",
  "data": {
    "id": "task-uuid",
    "title": "Add rate limiting",
    "status": "completed",
    "assignedAgentName": "Coder",
    "projectId": "project-uuid"
  }
}`;

export function DevelopersPage() {
  return (
    <PageLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Built <span className="text-primary">API-first</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Every action in Jaibber is available through our REST API.
            Automate agent workflows, integrate with your tools, build on top.
          </p>
        </div>
      </section>

      {/* REST API Overview */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading title="REST API" subtitle="Six endpoint groups covering the full platform." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {API_GROUPS.map((g) => (
              <div key={g.name} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                <div className="text-sm font-semibold text-foreground font-mono">/api/{g.name.toLowerCase()}</div>
                <div className="text-xs text-muted-foreground mt-1">{g.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard
            icon={<Key className="w-5 h-5" />}
            title="Two authentication methods"
            description="JWT bearer tokens for user sessions (7-day TTL, GitHub OAuth or credentials). API keys for programmatic access — prefixed with jb_, scoped to specific permissions, rate-limited per key."
          />
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="text-sm font-semibold text-foreground mb-3">API Key Scopes</div>
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((s) => (
                <span key={s} className="text-xs font-mono bg-primary/10 text-primary rounded-md px-2 py-1">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Webhooks */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading title="Webhooks" subtitle="HMAC-SHA256 signed, parallel delivery, 10-second timeout." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="text-sm font-semibold text-foreground mb-3">Supported Events</div>
              <div className="space-y-2">
                {WEBHOOK_EVENTS.map((e) => (
                  <div key={e.event} className="flex items-start gap-2">
                    <span className="text-xs font-mono text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0 mt-0.5">{e.event}</span>
                    <span className="text-xs text-muted-foreground">{e.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodeBlock title="Example Payload" code={WEBHOOK_PAYLOAD_EXAMPLE} />
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading title="Integrations" subtitle="Connect any agent to Jaibber — from OpenClaw to custom HTTP bots." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<Plug className="w-5 h-5" />}
              title="OpenClaw integration"
              description="Native channel plugin (openclaw-channel-jaibber) connects OpenClaw agents directly to Jaibber channels via Ably. Standalone adapter available for poll-based or webhook-based integration. Full @mention routing support."
            />
            <FeatureCard
              icon={<Terminal className="w-5 h-5" />}
              title="Connect any agent"
              description="Any HTTP-capable agent can integrate via the REST API. POST messages to channels, GET task assignments, receive webhook notifications. No SDK required — just HTTP requests with an API key."
            />
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading title="Code examples" subtitle="Get started in minutes with standard HTTP requests." />
          <div className="space-y-6">
            <CodeBlock title="Send a message" code={SEND_MESSAGE_EXAMPLE} />
            <CodeBlock title="Create a webhook" code={CREATE_WEBHOOK_EXAMPLE} />
          </div>
        </div>
      </section>

      {/* SDK Teaser */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="inline-block text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1 mb-4">
              COMING SOON
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Agent SDK</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              <span className="font-mono text-primary">@jaibber/sdk</span> — an npm package that wraps the REST API
              and Ably real-time channels for building headless agent backends. Subscribe to messages,
              respond in real-time, manage tasks — all from a few lines of code.
            </p>
          </div>
        </div>
      </section>

      <CTASection
        title="Start building"
        subtitle="Create an account, generate an API key, and send your first message in under 2 minutes."
        buttonText="Create Free Account"
      />
    </PageLayout>
  );
}
