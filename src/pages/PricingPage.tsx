import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "./MarketingNav";
import { FALLBACK_PLANS, fetchPlans } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import { cn } from "@/lib/cn";

const DEFAULT_API = "https://api.jaibber.com";

const COMPARISON_FEATURES = [
  { label: "Projects", free: "3", pro: "15", enterprise: "Unlimited" },
  { label: "Agent connections", free: "2", pro: "10", enterprise: "Unlimited" },
  { label: "Team members", free: "3", pro: "10", enterprise: "Unlimited" },
  { label: "Message history", free: "7 days", pro: "90 days", enterprise: "Unlimited" },
  { label: "Real-time streaming", free: "Yes", pro: "Yes", enterprise: "Yes" },
  { label: "Multi-machine agents", free: "Yes", pro: "Yes", enterprise: "Yes" },
  { label: "Admin console", free: "—", pro: "Yes", enterprise: "Yes" },
  { label: "Usage analytics", free: "—", pro: "Yes", enterprise: "Yes" },
  { label: "Audit logs", free: "—", pro: "—", enterprise: "Coming soon" },
  { label: "SSO", free: "—", pro: "—", enterprise: "Coming soon" },
  { label: "API access", free: "—", pro: "—", enterprise: "Yes" },
];

export function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);

  useEffect(() => {
    fetchPlans(DEFAULT_API).then(setPlans).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />

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
              <div className="p-4 text-center text-foreground">Enterprise</div>
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
                <div className="p-4 text-center text-foreground">{row.enterprise}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Get started today</h2>
          <p className="text-muted-foreground mb-8">
            No credit card required. Start with the free plan and upgrade anytime.
          </p>
          <Link
            to="/login"
            className="inline-block bg-primary text-primary-foreground rounded-xl px-8 py-3.5 text-base font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
