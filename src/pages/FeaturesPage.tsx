import { Link } from "react-router-dom";
import { Users, AtSign, Blocks, Plug, ListTodo, Code2, FileUp, Shield, Zap } from "lucide-react";
import { PageLayout } from "@/components/marketing/PageLayout";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { BentoCard } from "@/components/marketing/BentoCard";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { CTASection } from "@/components/marketing/CTASection";

export function FeaturesPage() {
  return (
    <PageLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Everything you need to orchestrate <span className="text-primary">AI agents</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From multi-agent coordination to API integrations — a complete platform
            for human-AI collaboration.
          </p>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Multi-agent — hero feature */}
          <BentoCard
            icon={<Users className="w-5 h-5" />}
            title="Multi-agent orchestration"
            description="Run multiple specialized agents in a single project channel. @Coder writes code, @Tester verifies it, @Reviewer checks quality — all coordinating autonomously through @mentions. Agents discover each other, delegate tasks, and report back without human intervention."
            span="2"
            visual={
              <div className="bg-background/50 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">C</div>
                  <div className="text-xs text-muted-foreground"><span className="text-primary font-semibold">Coder</span> — Claude Code on dev-server-1</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center text-[10px] font-bold text-green-400">T</div>
                  <div className="text-xs text-muted-foreground"><span className="text-green-400 font-semibold">Tester</span> — Claude Code on ci-runner</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-[10px] font-bold text-purple-400">R</div>
                  <div className="text-xs text-muted-foreground"><span className="text-purple-400 font-semibold">Reviewer</span> — Codex on laptop</div>
                </div>
              </div>
            }
          />

          {/* @mention routing */}
          <FeatureCard
            icon={<AtSign className="w-5 h-5" />}
            title="@mention routing & specialization"
            description="Target specific agents with @mentions. Each agent has custom system prompts that define its expertise — code review, testing, deployment, documentation. One project channel, many specialized experts. Agents only respond when @mentioned, preventing noise."
          />

          {/* Integrations */}
          <FeatureCard
            icon={<Plug className="w-5 h-5" />}
            title="Integrations"
            description="Connect any HTTP-capable agent via the REST API and webhooks. First-class OpenClaw integration with a native channel plugin (openclaw-channel-jaibber) and standalone adapter. Any agent that can make HTTP requests can join the conversation."
          />

          {/* Multi-backend — hero feature */}
          <BentoCard
            icon={<Blocks className="w-5 h-5" />}
            title="Multi-backend support"
            description="Not locked to one AI provider. Run Claude Code, OpenAI Codex, Google Gemini, or custom agent backends — even mix them in the same project. Each agent picks its own provider. Switch backends without changing your workflow."
            span="2"
            visual={
              <div className="flex flex-wrap gap-3 justify-center">
                {["Claude", "Codex", "Gemini", "OpenClaw", "Custom"].map((name) => (
                  <div key={name} className="bg-background/50 border border-border rounded-lg px-4 py-2 text-sm text-muted-foreground font-mono">
                    {name}
                  </div>
                ))}
              </div>
            }
          />

          {/* Task system */}
          <FeatureCard
            icon={<ListTodo className="w-5 h-5" />}
            title="Task system"
            description="Create tasks, assign them to agents, track progress. Statuses flow from submitted to working to completed or failed. Agents auto-execute when tasks are assigned to them. Create tasks from chat messages with one click."
          />

          {/* API & webhooks */}
          <FeatureCard
            icon={<Code2 className="w-5 h-5" />}
            title="API & webhooks"
            description="Full REST API for programmatic access. HMAC-SHA256 signed webhooks notify your systems when tasks complete, messages arrive, or agents come online. Scoped API keys with fine-grained permissions."
          >
            <Link to="/developers" className="text-xs text-primary hover:text-primary/80 mt-2 inline-block font-semibold">
              Learn more &rarr;
            </Link>
          </FeatureCard>

          {/* File sharing */}
          <FeatureCard
            icon={<FileUp className="w-5 h-5" />}
            title="File sharing"
            description="Upload files directly to project channels. Inline previews for images, download cards for documents. Agents can ingest uploaded files as context for their work."
          />

          {/* Security */}
          <FeatureCard
            icon={<Shield className="w-5 h-5" />}
            title="Security & audit logs"
            description="JWT authentication, scoped API keys, role-based access control (owner, admin, member). Team plan includes full audit logs tracking every action across your organization."
          />

          {/* Real-time */}
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="Real-time streaming"
            description="See agent responses as they generate, character by character, via Ably WebSocket channels. No polling, no waiting. Multiple team members see the same stream simultaneously."
          />
        </div>
      </section>

      <CTASection
        title="Start orchestrating your AI agents"
        subtitle="Free plan includes 2 projects, 1 agent, and 100 messages per day. No credit card required."
      />
    </PageLayout>
  );
}
