import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PROJECT_COLORS, TOOLTIP_STYLE } from "@/lib/chartTheme";
import type { OrgStats } from "@/types/org";

interface Props {
  stats: OrgStats;
}

export function ProjectDistribution({ stats }: Props) {
  const byProject = Array.isArray(stats.byProject) ? stats.byProject : [];

  if (byProject.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">By Project</h3>
        <div className="flex items-center justify-center h-[240px] text-xs text-muted-foreground">
          No project data for this period
        </div>
      </div>
    );
  }

  const pieData = byProject.map((p) => ({
    name: p.projectName ?? "Unknown",
    value: (p.prompts ?? 0) + (p.responses ?? 0) + (p.errors ?? 0),
  }));
  const totalEvents = pieData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">By Project</h3>

      {/* Donut chart */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: 180, height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                stroke="none"
                isAnimationActive={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PROJECT_COLORS[i % PROJECT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-lg font-bold text-foreground">{totalEvents}</div>
            <div className="text-[10px] text-muted-foreground">events</div>
          </div>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="mt-4 space-y-2">
        {byProject.map((p, i) => (
          <div key={p.projectId} className="flex items-center gap-2 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length] }}
            />
            <span className="text-muted-foreground flex-1 truncate">{p.projectName ?? "Unknown"}</span>
            <span className="text-foreground font-medium tabular-nums">{(p.prompts ?? 0)}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium tabular-nums">{(p.responses ?? 0)}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-red-400 font-medium tabular-nums">{(p.errors ?? 0)}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border">
          <span className="ml-[18px]">prompts / responses / errors</span>
        </div>
      </div>
    </div>
  );
}
