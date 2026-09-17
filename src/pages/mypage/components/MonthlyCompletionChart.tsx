import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthlyDatum = { label: string; count: number };

/** 완료 강조 색(blue). */
const ACCENT = "#3b82f6";

function CompletionTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold" style={{ color: ACCENT }}>
        {payload[0]?.value}건 완료
      </p>
    </div>
  );
}

/**
 * 월별 조치 완료 — 부드러운 곡선(monotone) + 그라데이션 area(완료 색상).
 * 최고점에는 강조 포인트를 표시합니다.
 */
export default function MonthlyCompletionChart({
  data,
}: {
  data: MonthlyDatum[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        완료한 조치가 없습니다.
      </p>
    );
  }

  const peak = data.reduce((m, d) => (d.count > m.count ? d : m), data[0]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 24, right: 20, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="completionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          padding={{ left: 16, right: 16 }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip content={<CompletionTooltip />} cursor={{ stroke: ACCENT, strokeDasharray: "3 3" }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#completionFill)"
          dot={false}
          activeDot={{ r: 5, fill: ACCENT, stroke: "var(--card)", strokeWidth: 2 }}
        />
        <ReferenceDot
          x={peak.label}
          y={peak.count}
          r={5}
          fill={ACCENT}
          stroke="var(--card)"
          strokeWidth={2}
          isFront
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
