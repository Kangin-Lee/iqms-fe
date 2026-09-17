import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StageBox = {
  label: string;
  count: number;
  /** 원형 배지 색(연한 배경 + 진한 텍스트) 클래스. */
  accentClass: string;
  href?: string;
};

/**
 * 단계 흐름형 표시 — 색상 원형 배지(개수) + 라벨을 화살표로 연결.
 * (기존 CAPA 파이프라인 디자인)
 */
export default function StageBoxes({
  items,
  onNavigate,
}: {
  items: StageBox[];
  onNavigate?: (href: string) => void;
}) {
  return (
    <div className="flex items-stretch gap-1">
      {items.map((p, i) => (
        <div key={p.label} className="flex flex-1 items-center gap-1">
          <button
            type="button"
            disabled={!p.href}
            onClick={() => p.href && onNavigate?.(p.href)}
            className="flex flex-1 flex-col items-center gap-1 rounded-lg border bg-card px-2 py-3 text-center transition-colors enabled:hover:bg-muted/40 disabled:cursor-default"
          >
            <span
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold tabular-nums",
                p.accentClass
              )}
            >
              {p.count}
            </span>
            <span className="text-xs text-muted-foreground">{p.label}</span>
          </button>
          {i < items.length - 1 && (
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}
