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

export type TrendDatum = { label: string; count: number };

/** 강조 색(blue). 선·포인트·툴팁 값에 공통 사용. */
const ACCENT = "#3b82f6";

/** 다크 카드형 커스텀 툴팁. */
function TrendTooltip({
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
        {payload[0]?.value}건
      </p>
    </div>
  );
}

/**
 * 월별 품질 이벤트 등록 추이 — 부드러운 곡선(natural) + 그라데이션 area.
 * 최고점에는 강조 포인트를 표시합니다.
 */
export default function EventTrendChart({ data }: { data: TrendDatum[] }) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        표시할 데이터가 없습니다.
      </p>
    );
  }

  // 최고점(강조 포인트).
  const peak = data.reduce((m, d) => (d.count > m.count ? d : m), data[0]);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 24, right: 20, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
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
        <Tooltip
          content={<TrendTooltip />}
          cursor={{ stroke: ACCENT, strokeDasharray: "3 3" }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={false}
          activeDot={{ r: 5, fill: ACCENT, stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive
        />
        {/* 최고점 강조 마커 */}
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
