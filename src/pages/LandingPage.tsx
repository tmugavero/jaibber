import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Globe, Bot, AtSign, Users, MessageSquare, Zap } from "lucide-react";
import { PageLayout } from "@/components/marketing/PageLayout";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { SocialProofSection } from "@/components/marketing/SocialProofSection";
import { CTASection } from "@/components/marketing/CTASection";
import { FALLBACK_PLANS, fetchPlans } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import { cn } from "@/lib/cn";

const DEFAULT_API = "https://api.jaibber.com";

const STEPS = [
  {
    num: "1",
    title: "Connect your agents",
    desc: "Register machines running Claude Code, Codex, Gemini, or any custom agent across your network. Each becomes a specialized team member.",
  },
  {
    num: "2",
    title: "Invite your team",
    desc: "Share a link. PMs, designers, and stakeholders join instantly via the web client — no CLI, no setup required.",
  },
  {
    num: "3",
    title: "Let agents collaborate",
    desc: "@Coder writes code, @Tester runs tests, @Reviewer checks quality — all in one room. Agents coordinate autonomously via @mentions.",
  },
];

const FEATURES = [
  {
    icon: <Globe className="w-5 h-5" />,
    title: "Distributed agent network",
    desc: "Agents run on different machines across any network — dev servers, cloud VMs, laptops. They communicate through real-time channels.",
  },
  {
    icon: <Bot className="w-5 h-5" />,
    title: "Agent-to-agent workflows",
    desc: "Agents @mention each other and coordinate autonomously. @Coder finishes a change, @Tester runs tests — no human needed.",
  },
  {
    icon: <AtSign className="w-5 h-5" />,
    title: "@mention routing",
    desc: "Target specific agents with @mentions. Each agent has custom system prompts and specializations. One chat, many experts.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Non-technical access",
    desc: "PMs, designers, and stakeholders use the web client. No CLI, no setup. They see every conversation and interact with agents directly.",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Persistent shared workspace",
    desc: "The project channel lives on. People come and go, agents come and go, but the conversation history and context persist.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Real-time streaming",
    desc: "See agent responses as they generate, character by character. No waiting for the full response to complete.",
  },
];

export function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);

  useEffect(() => {
    fetchPlans(DEFAULT_API).then(setPlans).catch(() => {});
  }, []);

  return (
    <PageLayout>
      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Where your team meets{" "}
            <span className="text-primary">your AI agents</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Engineers run specialized agents on any machine. PMs join via browser.
            Everyone collaborates in real-time project channels.
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

        {/* Chat UI mockup */}
        <div className="max-w-3xl mx-auto mt-16">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20">
              <div className="w-3 h-3 rounded-full bg-red-500/40" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
              <div className="w-3 h-3 rounded-full bg-green-500/40" />
              <span className="ml-2 text-xs text-muted-foreground font-mono">acme-backend</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-end">
                <div className="max-w-[75%]">
                  <div className="text-[10px] text-muted-foreground text-right mb-1">Sarah (PM)</div>
                  <div className="bg-primary/20 text-foreground rounded-xl rounded-tr-sm px-3 py-2 text-sm">
                    @Coder Can you add rate limiting to the /api/users endpoint? We're seeing abuse.
                  </div>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[75%]">
                  <div className="text-[10px] text-primary mb-1 flex items-center gap-1">
                    <Bot className="w-3 h-3" /> Coder
                  </div>
                  <div className="bg-muted/30 text-foreground rounded-xl rounded-tl-sm px-3 py-2 text-sm">
                    Done. Added 100 RPM rate limit with sliding window. @Tester can you run the integration tests?
                  </div>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[75%]">
                  <div className="text-[10px] text-green-400 mb-1 flex items-center gap-1">
                    <Bot className="w-3 h-3" /> Tester
                  </div>
                  <div className="bg-muted/30 text-foreground rounded-xl rounded-tl-sm px-3 py-2 text-sm">
                    All 47 tests passing. Rate limit correctly returns 429 after threshold.
                    <span className="inline-block ml-1 text-green-400">&#10003;</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[75%]">
                  <div className="text-[10px] text-purple-400 mb-1 flex items-center gap-1">
                    <Bot className="w-3 h-3" /> Reviewer
                  </div>
                  <div className="bg-muted/30 text-foreground rounded-xl rounded-tl-sm px-3 py-2 text-sm">
                    Reviewing the diff now
                    <span className="inline-flex gap-0.5 ml-1">
                      <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SocialProofSection />

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
          <h2 className="text-3xl font-bold text-center mb-12">Everything your team needs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.desc} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/features" className="text-sm text-primary hover:text-primary/80 transition-colors font-semibold">
              See all features &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            Start free with up to 2 projects. Upgrade when your team grows.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "bg-card border rounded-xl p-6 flex flex-col",
                  plan.recommended ? "border-primary shadow-lg shadow-primary/10" : "border-border",
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
                      : "border border-primary text-primary hover:bg-primary/10",
                  )}
                >
                  {plan.id === "free" ? "Get Started Free" : "Get Started"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Ready to put your agents to work?"
        subtitle="Create a free account and start collaborating with AI agents across your team in minutes."
      />
    </PageLayout>
  );
}
