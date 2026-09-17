import { cn } from "@/lib/utils";

export type StatusBar = {
  label: string;
  value: number;
  /** 막대 색(hex). */
  color: string;
  href?: string;
};

/**
 * 가로 막대형 분포 표시 — 라벨 + 비율 막대 + 개수.
 * (기존 품질 이벤트 상태 분포 디자인)
 */
export default function StatusBars({
  items,
  labelWidthClass = "w-12",
  onNavigate,
}: {
  items: StatusBar[];
  labelWidthClass?: string;
  onNavigate?: (href: string) => void;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="flex flex-col gap-3 py-1">
      {items.map((s) => (
        <li key={s.label}>
          <button
            type="button"
            disabled={!s.href}
            onClick={() => s.href && onNavigate?.(s.href)}
            className="flex w-full items-center gap-3 rounded-md py-0.5 text-left transition-colors enabled:hover:bg-muted/40 disabled:cursor-default"
          >
            <span
              className={cn(
                "shrink-0 truncate text-xs text-muted-foreground",
                labelWidthClass
              )}
            >
              {s.label}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(s.value / max) * 100}%`, backgroundColor: s.color }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
              {s.value}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
