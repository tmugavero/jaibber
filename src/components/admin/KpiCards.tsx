import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { CHART_COLORS } from "@/lib/chartTheme";
import type { OrgStats } from "@/types/org";

interface Props {
  stats: OrgStats;
}

function computeTrend(data: number[]): { pct: number; direction: "up" | "down" | "flat" } {
  if (data.length < 2) return { pct: 0, direction: "flat" };
  const mid = Math.floor(data.length / 2);
  const first = data.slice(0, mid).reduce((a, b) => a + b, 0);
  const second = data.slice(mid).reduce((a, b) => a + b, 0);
  if (first === 0 && second === 0) return { pct: 0, direction: "flat" };
  if (first === 0) return { pct: 100, direction: "up" };
  const pct = Math.round(((second - first) / first) * 100);
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

function Sparkline({ data, color }: { data: { v: number }[]; color: string }) {
  if (data.length < 2) return null;
  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          fill={`url(#${gradientId})`}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function TrendBadge({ pct, direction, invertColor }: { pct: number; direction: "up" | "down" | "flat"; invertColor?: boolean }) {
  if (direction === "flat") return null;
  const isGood = invertColor ? direction === "down" : direction === "up";
  const colorClass = isGood ? "text-emerald-400" : "text-red-400";
  const arrow = direction === "up" ? "\u25B2" : "\u25BC";
  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {arrow} {pct}%
    </span>
  );
}

function KpiCard({ label, value, sub, sparkData, sparkColor, trend, invertTrend }: {
  label: string;
  value: string | number;
  sub?: string;
  sparkData: { v: number }[];
  sparkColor: string;
  trend: { pct: number; direction: "up" | "down" | "flat" };
  invertTrend?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <TrendBadge pct={trend.pct} direction={trend.direction} invertColor={invertTrend} />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      <div className="mt-2">
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
    </div>
  );
}

export function KpiCards({ stats }: Props) {
  const byDay = Array.isArray(stats.byDay) ? stats.byDay : [];
  const prompts = stats.totalPrompts ?? 0;
  const responses = stats.totalResponses ?? 0;
  const errors = stats.totalErrors ?? 0;
  const errorRate = stats.errorRate ?? 0;
  const avgMs = stats.avgDurationMs ?? 0;

  const promptData = byDay.map((d) => ({ v: d.prompts ?? 0 }));
  const responseData = byDay.map((d) => ({ v: d.responses ?? 0 }));
  const errorData = byDay.map((d) => ({ v: d.errors ?? 0 }));
  const errorRateData = byDay.map((d) => ({
    v: (d.prompts ?? 0) > 0 ? Math.round(((d.errors ?? 0) / (d.prompts ?? 1)) * 100) : 0,
  }));

  const promptTrend = computeTrend(promptData.map((d) => d.v));
  const responseTrend = computeTrend(responseData.map((d) => d.v));
  const errorTrend = computeTrend(errorData.map((d) => d.v));
  const errorRateTrend = computeTrend(errorRateData.map((d) => d.v));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label="Total Prompts"
        value={prompts.toLocaleString()}
        sparkData={promptData}
        sparkColor={CHART_COLORS.primary}
        trend={promptTrend}
      />
      <KpiCard
        label="Total Responses"
        value={responses.toLocaleString()}
        sparkData={responseData}
        sparkColor={CHART_COLORS.accent}
        trend={responseTrend}
      />
      <KpiCard
        label="Error Rate"
        value={`${errorRate}%`}
        sub={`${errors} total errors`}
        sparkData={errorRateData}
        sparkColor={CHART_COLORS.destructive}
        trend={errorRateTrend}
        invertTrend
      />
      <KpiCard
        label="Avg Response"
        value={`${(avgMs / 1000).toFixed(1)}s`}
        sub={`${(stats.totalTokens ?? 0).toLocaleString()} tokens`}
        sparkData={responseData}
        sparkColor={CHART_COLORS.purple}
        trend={responseTrend}
      />
    </div>
  );
}
