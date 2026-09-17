export type ShareDatum = {
  label: string;
  value: number;
  color: string;
  href?: string;
};

/**
 * 100% 비율 막대(스택 바) + 범례(건수·비율).
 * 전체 대비 각 항목의 점유율을 한 막대로 보여 줍니다.
 */
export default function ProportionBar({
  items,
  totalLabel = "총",
  onNavigate,
}: {
  items: ShareDatum[];
  totalLabel?: string;
  onNavigate?: (href: string) => void;
}) {
  const sum = items.reduce((s, i) => s + i.value, 0);
  const pct = (v: number) => (sum > 0 ? (v / sum) * 100 : 0);

  if (sum === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        데이터가 없습니다.
      </p>
    );
  }

  const segments = items.filter((i) => i.value > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* 총계 */}
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{totalLabel}</span>
        <span className="text-lg font-semibold tabular-nums text-foreground">
          {sum}
        </span>
      </div>

      {/* 비율 막대 */}
      <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full">
        {segments.map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={!s.href}
            onClick={() => s.href && onNavigate?.(s.href)}
            title={`${s.label} ${s.value}건 (${pct(s.value).toFixed(0)}%)`}
            style={{ width: `${pct(s.value)}%`, backgroundColor: s.color }}
            className="h-full transition-opacity first:rounded-l-full last:rounded-r-full enabled:hover:opacity-80 disabled:cursor-default"
          />
        ))}
      </div>

      {/* 범례 */}
      <ul className="flex flex-col gap-1">
        {items.map((it) => (
          <li key={it.label}>
            <button
              type="button"
              disabled={!it.href}
              onClick={() => it.href && onNavigate?.(it.href)}
              className="flex w-full items-center gap-2.5 rounded-md px-1 py-1.5 text-left transition-colors enabled:hover:bg-muted/40 disabled:cursor-default"
            >
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: it.color }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {it.label}
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                {it.value}
              </span>
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {pct(it.value).toFixed(0)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
