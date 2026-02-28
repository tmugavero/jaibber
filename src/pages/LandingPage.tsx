import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "./MarketingNav";
import { FALLBACK_PLANS, fetchPlans } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import { cn } from "@/lib/cn";

const DEFAULT_API = "https://api.jaibber.com";

const STEPS = [
  {
    num: "1",
    title: "Connect your agents",
    desc: "Register machines running Claude Code across your network — laptops, dev servers, cloud VMs. Each becomes a specialized agent.",
  },
  {
    num: "2",
    title: "Invite your team",
    desc: "Share a link. PMs, designers, and stakeholders join instantly via the web client — no CLI, no setup required.",
  },
  {
    num: "3",
    title: "Let agents collaborate",
    desc: "@Coder writes code, @Tester runs tests, @Reviewer checks quality — all in one room. Agents coordinate autonomously.",
  },
];

const FEATURES = [
  {
    icon: "🌐",
    title: "Distributed agent network",
    desc: "Agents run on different machines across any network — dev servers, cloud VMs, laptops. They communicate through real-time channels.",
  },
  {
    icon: "🤖",
    title: "Agent-to-agent workflows",
    desc: "Agents @mention each other and coordinate autonomously. @Coder finishes a change, @Tester runs tests — no human needed.",
  },
  {
    icon: "📡",
    title: "@mention routing",
    desc: "Target specific agents with @mentions. Each agent has custom system prompts and specializations. One chat, many experts.",
  },
  {
    icon: "🌍",
    title: "Non-technical access",
    desc: "PMs, designers, and stakeholders use the web client. No CLI, no setup. They see every conversation and interact with agents directly.",
  },
  {
    icon: "💬",
    title: "Persistent shared workspace",
    desc: "The project channel lives on. People come and go, agents come and go, but the conversation history and context persist.",
  },
  {
    icon: "⚡",
    title: "Real-time streaming",
    desc: "See Claude's responses as they generate, character by character. No waiting for the full response to complete.",
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
            Your team's <span className="text-primary">AI agents</span>,{" "}
            in one room
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Engineers, PMs, and stakeholders collaborate with specialized AI agents
            running across any machine, any network, in a persistent group workspace.
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
                  {plan.id === "free" ? "Get Started Free" : "Get Started"}
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
            Ready to put your agents to work?
          </h2>
          <p className="text-muted-foreground mb-8">
            Create a free account and start collaborating with AI agents across your team in minutes.
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
