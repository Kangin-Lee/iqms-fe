import { ChevronRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RecItem, RecResult, RecTone } from "@/lib/recommendations";

const TONE_CLASS: Record<RecTone, string> = {
  danger:
    "border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  warn: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  ok: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  info: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  muted: "border-transparent bg-muted text-muted-foreground",
};

/** 추천 문서 카드 목록. 각 카드를 클릭하면 해당 상세/목록으로 이동합니다. */
export default function ChatRecommendations({
  result,
  onNavigate,
}: {
  result: RecResult;
  onNavigate: (href: string) => void;
}) {
  if (result.items.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {result.items.map((item: RecItem) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onNavigate(item.href)}
          className="group flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-medium text-foreground">
              {item.title}
            </p>
            {item.subtitle && (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {item.subtitle}
              </p>
            )}
          </div>
          {item.badge && (
            <Badge
              variant="outline"
              className={cn("shrink-0 whitespace-nowrap", TONE_CLASS[item.badge.tone])}
            >
              {item.badge.label}
            </Badge>
          )}
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>
      ))}

      {result.more && (
        <button
          type="button"
          onClick={() => onNavigate(result.more!.href)}
          className="self-start text-xs font-medium text-primary hover:underline"
        >
          {result.more.label} →
        </button>
      )}
    </div>
  );
}
