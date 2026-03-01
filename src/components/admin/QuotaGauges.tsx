import type { Org, OrgStats } from "@/types/org";

interface Props {
  org: Org;
  stats: OrgStats | null;
  agentCount: number;
}

function QuotaGauge({ label, current, max, unit }: { label: string; current: number; max: number; unit?: string }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const color =
    pct > 90 ? "hsl(346, 84%, 53%)" : pct > 70 ? "hsl(32, 85%, 55%)" : "hsl(152, 68%, 40%)";
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const dashoffset = circumference * (1 - pct / 100);

  const displayCurrent = unit === "MB"
    ? `${Math.round(current / (1024 * 1024))}`
    : current.toString();
  const displayMax = unit === "MB"
    ? `${Math.round(max / (1024 * 1024))}`
    : max.toString();

  return (
    <div className="flex flex-col items-center">
      <svg width={84} height={84} viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="hsl(209, 34%, 16%)" strokeWidth="5" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform="rotate(-90 42 42)"
          className="transition-all duration-700"
        />
        <text x="42" y="38" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
          {displayCurrent}
        </text>
        <text x="42" y="52" textAnchor="middle" fill="hsl(209, 20%, 56%)" fontSize="9">
          /{displayMax}{unit ? ` ${unit}` : ""}
        </text>
      </svg>
      <div className="text-xs text-muted-foreground mt-1 text-center">{label}</div>
    </div>
  );
}

export function QuotaGauges({ org, stats, agentCount }: Props) {
  const todayPrompts = stats ? (stats.totalPrompts ?? 0) + (stats.totalResponses ?? 0) : 0;
  const storageBytes = stats?.storageUsedBytes ?? 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Resource Quotas</h3>
        <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full capitalize">
          {org.plan} plan
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        <QuotaGauge label="Projects" current={0} max={org.maxProjects} />
        <QuotaGauge label="Members" current={0} max={org.maxMembers} />
        <QuotaGauge label="Agents" current={agentCount} max={org.maxAgents} />
        <QuotaGauge label="Msgs/Day" current={todayPrompts} max={org.maxMessagesPerDay} />
        <QuotaGauge label="Storage" current={storageBytes} max={org.maxStorageBytes} unit="MB" />
      </div>
    </div>
  );
}
