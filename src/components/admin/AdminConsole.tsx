import { useEffect, useState } from "react";
import { useOrgStore } from "@/stores/orgStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { CreateOrgInline } from "@/components/org/CreateOrgInline";
import { KpiCards } from "./KpiCards";
import { ActivityChart } from "./ActivityChart";
import { ProjectDistribution } from "./ProjectDistribution";
import { AgentFleetPanel } from "./AgentFleetPanel";
import { QuotaGauges } from "./QuotaGauges";
import { AuditFeed } from "./AuditFeed";

export function AdminConsole() {
  const { activeOrgId, orgs, stats, agents, loadingStats, loadingAgents, auditEntries, loadingAudit } = useOrgStore();
  const [range, setRange] = useState("7d");
  const [copiedId, setCopiedId] = useState(false);
  const { apiBaseUrl } = useSettingsStore((s) => s.settings);
  const token = useAuthStore((s) => s.token);
  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  useEffect(() => {
    if (!activeOrgId || !apiBaseUrl || !token) return;
    useOrgStore.getState().loadStats(apiBaseUrl, token, activeOrgId, range);
    useOrgStore.getState().loadAgents(apiBaseUrl, token, activeOrgId);
    useOrgStore.getState().loadAudit(apiBaseUrl, token, activeOrgId);
  }, [activeOrgId, apiBaseUrl, token, range]);

  if (!activeOrgId) {
    return <CreateOrgInline message="Create an organization to access the admin console." />;
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">Operations Console</h1>
            {activeOrg && (
              <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full capitalize">
                {activeOrg.plan}
              </span>
            )}
          </div>
          {activeOrg && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{activeOrg.name}</span>
              <span className="text-muted-foreground/40">·</span>
              <code className="text-[10px] text-muted-foreground font-mono bg-muted/30 px-1.5 py-0.5 rounded">
                {activeOrgId}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeOrgId!);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                title="Copy Org ID"
              >
                {copiedId ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          {(["1d", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                range === r
                  ? "bg-card shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "1d" ? "Today" : r === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 h-[130px] animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <KpiCards stats={stats} />
      ) : (
        <div className="text-xs text-muted-foreground">No usage data available.</div>
      )}

      {/* Charts Row: Activity Trends + Project Distribution */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <ActivityChart stats={stats} />
          </div>
          <div className="lg:col-span-2">
            <ProjectDistribution stats={stats} />
          </div>
        </div>
      )}

      {/* Agent Fleet */}
      <AgentFleetPanel agents={agents} loading={loadingAgents} />

      {/* Quotas + Audit Feed */}
      {activeOrg && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <QuotaGauges org={activeOrg} stats={stats} agentCount={agents.length} />
          <AuditFeed entries={auditEntries} loading={loadingAudit} org={activeOrg} />
        </div>
      )}
    </div>
  );
}
