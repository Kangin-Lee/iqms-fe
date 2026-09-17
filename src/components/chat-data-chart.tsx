import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChatChartDatum = { label: string; value: number; color: string };

export type ChatChartSpec = {
  title: string;
  kind: "donut" | "bar";
  data: ChatChartDatum[];
};

/**
 * 채팅 말풍선 안에 넣는 소형 데이터 차트(실제 데이터 기반).
 * donut: 도넛 + 범례, bar: 세로 막대(카테고리별 색).
 */
export default function ChatDataChart({ spec }: { spec: ChatChartSpec }) {
  const total = spec.data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="rounded-lg border bg-card p-3">
        <p className="mb-1 text-xs font-medium text-foreground">{spec.title}</p>
        <p className="py-4 text-center text-xs text-muted-foreground">
          표시할 데이터가 없습니다.
        </p>
      </div>
    );
  }

  const slices = spec.data.filter((d) => d.value > 0);

  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="mb-2 text-xs font-medium text-foreground">{spec.title}</p>

      {spec.kind === "donut" ? (
        <div className="flex items-center gap-3">
          <div className="relative h-[104px] w-[104px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={32}
                  outerRadius={50}
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {slices.map((d) => (
                    <Cell key={d.label} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, n: string) => [`${v}건`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold text-foreground">
                {total}
              </span>
            </div>
          </div>
          <ul className="flex min-w-0 flex-1 flex-col gap-1">
            {spec.data.map((d) => (
              <li key={d.label} className="flex items-center gap-1.5 text-xs">
                <span
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: d.color }}
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {d.label}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {d.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={spec.data} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              width={26}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              formatter={(v: number) => [`${v}건`, "건수"]}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={30}>
              {spec.data.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      <p className="mt-1 text-right text-[10px] text-muted-foreground">
        총 {total}건 · 실제 데이터
      </p>
    </div>
  );
}
