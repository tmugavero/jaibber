import { useState, useEffect } from "react";
import { useOrgStore } from "@/stores/orgStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { CreateOrgInline } from "@/components/org/CreateOrgInline";
import { FALLBACK_PLANS, fetchPlans } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import { cn } from "@/lib/cn";

export function BillingPage() {
  const activeOrg = useOrgStore((s) => s.orgs.find((o) => o.id === s.activeOrgId));
  const { apiBaseUrl } = useSettingsStore((s) => s.settings);
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});

  // Fetch live plans from Stripe
  useEffect(() => {
    if (!apiBaseUrl) return;
    fetchPlans(apiBaseUrl)
      .then(setPlans)
      .catch(() => {}); // Keep fallback on error
  }, [apiBaseUrl]);

  const handleUpgrade = async (plan: Plan) => {
    if (!activeOrg || !apiBaseUrl || !token) return;
    setLoading(plan.id);
    setError(null);
    try {
      const quantity = plan.perSeat ? Math.max(1, seatCounts[plan.id] || 1) : 1;
      const res = await fetch(`${apiBaseUrl}/api/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId: activeOrg.id, plan: plan.id, quantity }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      window.open(data.url, "_blank");
    } catch (e) {
      setError(`Network error: ${e}`);
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    if (!activeOrg || !apiBaseUrl || !token) return;
    setLoading("portal");
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/billing/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId: activeOrg.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      window.open(data.url, "_blank");
    } catch (e) {
      setError(`Network error: ${e}`);
    } finally {
      setLoading(null);
    }
  };

  if (!activeOrg) {
    return <CreateOrgInline message="Create an organization to manage billing." />;
  }

  const currentPlan = activeOrg.plan || "free";

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-full">
      <h1 className="text-xl font-semibold text-foreground">Billing</h1>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">{activeOrg.name}</div>
            <div className="text-xs text-muted-foreground">
              Current plan: <span className="text-primary font-medium capitalize">{currentPlan}</span>
            </div>
          </div>
          {currentPlan !== "free" && (
            <button
              onClick={handleManage}
              disabled={loading === "portal"}
              className="text-xs text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-lg px-3 py-1.5"
            >
              {loading === "portal" ? "Opening..." : "Manage Subscription"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const seats = seatCounts[plan.id] || 1;
          return (
            <div
              key={plan.id}
              className={cn(
                "bg-card border rounded-xl p-5 flex flex-col",
                plan.recommended ? "border-primary shadow-lg shadow-primary/10" : "border-border",
              )}
            >
              {plan.recommended && (
                <div className="text-xs font-semibold text-primary mb-2">RECOMMENDED</div>
              )}
              <div className="text-lg font-bold text-foreground">{plan.name}</div>
              <div className="mt-1 mb-4">
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-2 flex-1 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">+</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Seat picker for per-seat plans */}
              {plan.perSeat && !isCurrent && plan.id !== "free" && (
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs text-muted-foreground">Seats:</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={seats}
                    onChange={(e) => setSeatCounts({ ...seatCounts, [plan.id]: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-16 bg-muted/40 border border-input rounded-lg px-2 py-1 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  {plan.priceAmount != null && (
                    <span className="text-xs text-muted-foreground">
                      = ${((plan.priceAmount / 100) * seats).toFixed(0)}/mo
                    </span>
                  )}
                </div>
              )}

              {isCurrent ? (
                <div className="text-xs text-center text-muted-foreground border border-border rounded-xl py-2.5 font-medium">
                  Current Plan
                </div>
              ) : plan.id === "free" ? (
                <div className="text-xs text-center text-muted-foreground py-2.5" />
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={loading === plan.id}
                  className={cn(
                    "w-full rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50",
                    plan.recommended
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-primary text-primary hover:bg-primary/10",
                  )}
                >
                  {loading === plan.id ? "Loading..." : `Upgrade to ${plan.name.replace("Jaibber ", "")}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
