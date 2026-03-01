import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { CHART_COLORS, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "@/lib/chartTheme";
import type { OrgStats } from "@/types/org";

interface Props {
  stats: OrgStats;
}

export function ActivityChart({ stats }: Props) {
  const byDay = Array.isArray(stats.byDay) ? stats.byDay : [];

  if (byDay.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Activity Trends</h3>
        <div className="flex items-center justify-center h-[240px] text-xs text-muted-foreground">
          No activity data for this period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Activity Trends</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={byDay} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="gradPrompts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradResponses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.3} />
              <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradErrors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.destructive} stopOpacity={0.3} />
              <stop offset="100%" stopColor={CHART_COLORS.destructive} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            tickFormatter={(d: string) => {
              try { return format(parseISO(d), "MMM d"); } catch { return d?.slice(5) ?? ""; }
            }}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
          />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(d) => {
              try { return format(parseISO(String(d)), "MMM d, yyyy"); } catch { return String(d); }
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "hsl(209, 20%, 56%)" }}
          />
          <Area
            type="monotone"
            dataKey="prompts"
            name="Prompts"
            stroke={CHART_COLORS.primary}
            fill="url(#gradPrompts)"
            strokeWidth={2}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="responses"
            name="Responses"
            stroke={CHART_COLORS.accent}
            fill="url(#gradResponses)"
            strokeWidth={2}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="errors"
            name="Errors"
            stroke={CHART_COLORS.destructive}
            fill="url(#gradErrors)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
