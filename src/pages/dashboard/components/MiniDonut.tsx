import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type MiniDonutDatum = { label: string; value: number; color: string };

/**
 * 범례 없는 소형 도넛(중앙 총계). 옆에 막대/범례가 따로 있을 때 사용합니다.
 */
export default function MiniDonut({
  items,
  centerLabel,
  size = 140,
}: {
  items: MiniDonutDatum[];
  centerLabel?: string;
  /** 도넛 지름(px). 반지름은 비례로 계산합니다. */
  size?: number;
}) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  const slices = items.filter((i) => i.value > 0);

  if (total === 0) {
    return (
      <div
        className="flex shrink-0 items-center justify-center text-xs text-muted-foreground"
        style={{ width: size, height: size }}
      >
        데이터 없음
      </div>
    );
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius={size * 0.31}
            outerRadius={size * 0.46}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {slices.map((s) => (
              <Cell key={s.label} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value}건`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-foreground">{total}</span>
        {centerLabel && (
          <span className="text-xs text-muted-foreground">{centerLabel}</span>
        )}
      </div>
    </div>
  );
}
