import type { OrgAgent } from "@/types/org";

interface Props {
  agents: OrgAgent[];
  loading: boolean;
}

interface DeduplicatedAgent {
  clientId: string;
  username: string;
  agentName?: string;
  machineName?: string;
  projects: string[];
}

function deduplicateAgents(agents: OrgAgent[]): DeduplicatedAgent[] {
  const map = new Map<string, DeduplicatedAgent>();

  for (const entry of agents) {
    const key = entry.clientId;
    const username = entry.data?.username ?? "Unknown";
    const existing = map.get(key);

    if (existing) {
      if (entry.projectName && !existing.projects.includes(entry.projectName)) {
        existing.projects.push(entry.projectName);
      }
    } else {
      map.set(key, {
        clientId: key,
        username,
        agentName: (entry.data as Record<string, unknown> | null)?.agentName as string | undefined,
        machineName: (entry.data as Record<string, unknown> | null)?.machineName as string | undefined,
        projects: entry.projectName ? [entry.projectName] : [],
      });
    }
  }

  return Array.from(map.values());
}

function AgentCard({ agent }: { agent: DeduplicatedAgent }) {
  const displayName = agent.agentName || agent.username;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
          {initial}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-card animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
          {agent.machineName && (
            <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
              {agent.machineName}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {agent.projects.length > 0
            ? agent.projects.join(", ")
            : "No projects"}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs text-emerald-400 font-medium">Online</span>
        {agent.projects.length > 1 && (
          <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
            {agent.projects.length} projects
          </span>
        )}
      </div>
    </div>
  );
}

export function AgentFleetPanel({ agents, loading }: Props) {
  const deduplicated = deduplicateAgents(agents);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground">Agent Fleet</h2>
        {deduplicated.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {deduplicated.length} agent{deduplicated.length !== 1 ? "s" : ""} online
          </span>
        )}
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground animate-pulse">Loading agents...</div>
      ) : deduplicated.length === 0 ? (
        <div className="text-xs text-muted-foreground bg-muted/20 rounded-xl p-4 text-center">
          No agents connected. Register a project on a desktop machine to start an agent.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {deduplicated.map((agent) => (
            <AgentCard key={agent.clientId} agent={agent} />
          ))}
        </div>
      )}
    </section>
  );
}
