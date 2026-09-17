import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { QualityEventReviewer } from "../queries";

/**
 * 검토자 컬럼: "완료/전체" 카운트에 마우스를 올리면 검토자 목록을
 * hover 카드로 보여줍니다(각 검토자의 이름·부서·검토 완료 여부).
 */
export function ReviewerHoverCard({
  reviewers,
}: {
  reviewers: QualityEventReviewer[];
}) {
  const total = reviewers.length;
  const done = reviewers.filter((r) => r.reviewed).length;

  if (total === 0) return <span className="text-muted-foreground">-</span>;

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <span className="cursor-default tabular-nums underline decoration-dotted decoration-muted-foreground/50 underline-offset-4" />
        }
      >
        {done}/{total}
      </HoverCardTrigger>
      <HoverCardContent align="center" className="w-64">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">검토자</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {done}/{total}
            </span>
            명 검토 완료
          </p>
        </div>
        <ul className="flex flex-col gap-1.5">
          {reviewers.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm">
                <span className="font-medium text-foreground">{r.name}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {r.teamName}
                </span>
              </span>
              {r.reviewed ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                >
                  검토
                </Badge>
              ) : (
                <Badge variant="secondary" className="shrink-0">
                  대기
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
