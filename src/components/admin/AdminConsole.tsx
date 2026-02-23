import { useEffect, useState } from "react";
import { useOrgStore } from "@/stores/orgStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import type { OrgAgent } from "@/types/org";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function AgentCard({ agent }: { agent: OrgAgent }) {
  const username = agent.data?.username ?? "Unknown";
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
          {username.charAt(0).toUpperCase()}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-card" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{username}</div>
        <div className="text-xs text-muted-foreground truncate">{agent.projectName}</div>
      </div>
      <div className="text-xs text-emerald-400 font-medium">Online</div>
    </div>
  );
}

function UsageBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{value}</span>
      </div>
      <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AdminConsole() {
  const { activeOrgId, stats, agents, loadingStats, loadingAgents } = useOrgStore();
  const [range, setRange] = useState("7d");
  const { apiBaseUrl } = useSettingsStore((s) => s.settings);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!activeOrgId || !apiBaseUrl || !token) return;
    useOrgStore.getState().loadStats(apiBaseUrl, token, activeOrgId, range);
    useOrgStore.getState().loadAgents(apiBaseUrl, token, activeOrgId);
  }, [activeOrgId, apiBaseUrl, token, range]);

  if (!activeOrgId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p className="text-sm">Create or join an organization to see the admin console.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Operations Console</h1>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          {(["1d", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                range === r ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "1d" ? "Today" : r === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Fleet */}
      <section>
        <h2 className="text-sm font-medium text-foreground mb-3">Agent Fleet</h2>
        {loadingAgents ? (
          <div className="text-xs text-muted-foreground animate-pulse">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="text-xs text-muted-foreground bg-muted/20 rounded-xl p-4 text-center">
            No agents connected. Register a project on a desktop machine to start an agent.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent, i) => (
              <AgentCard key={`${agent.connectionId}-${i}`} agent={agent} />
            ))}
          </div>
        )}
      </section>

      {/* Usage Stats */}
      <section>
        <h2 className="text-sm font-medium text-foreground mb-3">Usage Stats</h2>
        {loadingStats ? (
          <div className="text-xs text-muted-foreground animate-pulse">Loading stats...</div>
        ) : !stats ? (
          <div className="text-xs text-muted-foreground">No data available.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard label="Prompts" value={stats.totalPrompts} />
              <StatCard label="Responses" value={stats.totalResponses} />
              <StatCard label="Errors" value={stats.totalErrors} sub={`${stats.errorRate}% error rate`} />
              <StatCard label="Avg Response" value={`${(stats.avgDurationMs / 1000).toFixed(1)}s`} />
            </div>

            {/* Per-project breakdown */}
            {stats.byProject.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground">By Project</h3>
                {stats.byProject.map((p) => {
                  const total = p.prompts + p.responses + p.errors;
                  return (
                    <UsageBar
                      key={p.projectId}
                      label={p.projectName ?? "Unknown"}
                      value={p.prompts}
                      max={Math.max(total, 1)}
                    />
                  );
                })}
              </div>
            )}

            {/* Per-day chart (simple text-based) */}
            {stats.byDay.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4 mt-3">
                <h3 className="text-xs font-medium text-muted-foreground mb-3">Daily Activity</h3>
                <div className="flex items-end gap-1 h-24">
                  {stats.byDay.map((day) => {
                    const maxDay = Math.max(...stats.byDay.map((d) => d.prompts + d.responses), 1);
                    const total = day.prompts + day.responses;
                    const pct = (total / maxDay) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-primary/80 rounded-t min-h-[2px] transition-all"
                          style={{ height: `${pct}%` }}
                          title={`${day.date}: ${total} events`}
                        />
                        <div className="text-[9px] text-muted-foreground truncate w-full text-center">
                          {day.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
