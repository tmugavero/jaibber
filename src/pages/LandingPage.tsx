import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "./MarketingNav";
import { FALLBACK_PLANS, fetchPlans } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import { cn } from "@/lib/cn";

const DEFAULT_API = "https://jaibber-server.vercel.app";

const STEPS = [
  {
    num: "1",
    title: "Install the desktop agent",
    desc: "Download Jaibber for your dev machine. Configure your Anthropic API key and connect to your team's server.",
  },
  {
    num: "2",
    title: "Create a project",
    desc: "Link a project to your local codebase. Jaibber watches the project channel and runs Claude Code on incoming prompts.",
  },
  {
    num: "3",
    title: "Chat as a team",
    desc: "Your whole team sees every prompt and response in real time. Collaborate on code through shared AI conversations.",
  },
];

const FEATURES = [
  {
    icon: "🖥️",
    title: "Multi-machine agents",
    desc: "Run Claude Code on any computer — laptops, servers, cloud VMs. Each machine registers as an agent for its projects.",
  },
  {
    icon: "⚡",
    title: "Real-time streaming",
    desc: "See Claude's responses as they generate, character by character. No waiting for the full response to complete.",
  },
  {
    icon: "👥",
    title: "Team collaboration",
    desc: "Multiple users in every project channel. Everyone sees the prompts, responses, and can jump in at any time.",
  },
  {
    icon: "🏢",
    title: "Organization management",
    desc: "Create orgs with roles (owner, admin, member). Manage teams, set permissions, and control access to projects.",
  },
  {
    icon: "📊",
    title: "Usage analytics",
    desc: "Track prompts, responses, error rates, and response times. Per-project breakdowns and daily activity charts.",
  },
  {
    icon: "🔒",
    title: "Secure by design",
    desc: "Ably WebSocket transport with scoped tokens. API keys stay on the server. No secrets in the client.",
  },
];

export function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);

  useEffect(() => {
    fetchPlans(DEFAULT_API).then(setPlans).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Team chat for your{" "}
            <span className="text-primary">Claude Code</span> agents
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Connect Claude Code agents running on any machine into shared project
            channels. Your team sees every prompt and response in real time.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="bg-primary text-primary-foreground rounded-xl px-8 py-3.5 text-base font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Get Started Free
            </Link>
            <Link
              to="/pricing"
              className="border border-border rounded-xl px-8 py-3.5 text-base font-semibold text-foreground hover:bg-muted/40 transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything your team needs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            Start free with up to 3 projects. Upgrade when your team grows.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "bg-card border rounded-xl p-6 flex flex-col",
                  plan.recommended
                    ? "border-primary shadow-lg shadow-primary/10"
                    : "border-border"
                )}
              >
                {plan.recommended && (
                  <div className="text-xs font-semibold text-primary mb-2">RECOMMENDED</div>
                )}
                <div className="text-lg font-bold text-foreground">{plan.name}</div>
                <div className="mt-1 mb-4">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">+</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={cn(
                    "w-full rounded-xl py-2.5 text-sm font-semibold text-center transition-all block",
                    plan.recommended
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-primary text-primary hover:bg-primary/10"
                  )}
                >
                  {plan.id === "free" ? "Get Started" : `Start with ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to connect your team with AI?
          </h2>
          <p className="text-muted-foreground mb-8">
            Create a free account and start chatting with Claude Code agents in minutes.
          </p>
          <Link
            to="/login"
            className="inline-block bg-primary text-primary-foreground rounded-xl px-8 py-3.5 text-base font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
