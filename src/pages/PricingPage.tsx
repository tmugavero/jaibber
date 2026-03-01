import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/marketing/PageLayout";
import { CTASection } from "@/components/marketing/CTASection";
import { FALLBACK_PLANS, fetchPlans } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import { cn } from "@/lib/cn";

const DEFAULT_API = "https://api.jaibber.com";

const COMPARISON_FEATURES = [
  { label: "Projects", free: "2", pro: "10", team: "Unlimited" },
  { label: "Agent connections", free: "1", pro: "5", team: "25/seat" },
  { label: "Team members", free: "3", pro: "10", team: "Unlimited" },
  { label: "Messages/day", free: "100", pro: "1,000", team: "5,000/seat" },
  { label: "File storage", free: "100 MB", pro: "1 GB", team: "5 GB/seat" },
  { label: "Message history", free: "7 days", pro: "90 days", team: "Unlimited" },
  { label: "Real-time streaming", free: "Yes", pro: "Yes", team: "Yes" },
  { label: "Multi-machine agents", free: "Yes", pro: "Yes", team: "Yes" },
  { label: "Webhooks", free: "—", pro: "10", team: "100" },
  { label: "API keys", free: "—", pro: "2", team: "Unlimited" },
  { label: "Audit logs", free: "—", pro: "—", team: "Yes" },
];

export function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);

  useEffect(() => {
    fetchPlans(DEFAULT_API).then(setPlans).catch(() => {});
  }, []);

  return (
    <PageLayout>

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Pricing</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Start free, upgrade as your team grows. All plans include real-time
            streaming and multi-machine agent support.
          </p>
        </div>
      </section>

      {/* Plan Cards */}
      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div className="text-xs font-semibold text-primary mb-2">MOST POPULAR</div>
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
      </section>

      {/* Feature Comparison Table */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Compare plans</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 text-sm font-semibold border-b border-border">
              <div className="p-4 text-muted-foreground">Feature</div>
              <div className="p-4 text-center text-foreground">Free</div>
              <div className="p-4 text-center text-primary">Pro</div>
              <div className="p-4 text-center text-foreground">Team</div>
            </div>
            {COMPARISON_FEATURES.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  "grid grid-cols-4 text-sm",
                  i < COMPARISON_FEATURES.length - 1 && "border-b border-border"
                )}
              >
                <div className="p-4 text-muted-foreground">{row.label}</div>
                <div className="p-4 text-center text-foreground">{row.free}</div>
                <div className="p-4 text-center text-foreground">{row.pro}</div>
                <div className="p-4 text-center text-foreground">{row.team}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Get started today"
        subtitle="No credit card required. Start with the free plan and upgrade anytime."
        buttonText="Create Free Account"
      />
    </PageLayout>
  );
}
