import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { ChangeRequestPerson } from "../queries";

/**
 * 검토자·승인자 컬럼: "완료/전체" 카운트에 마우스를 올리면 사람 목록을
 * hover 카드로 보여줍니다(각 사람의 이름·부서·완료 여부).
 * (품질 이벤트 목록의 검토자 컬럼과 동일한 톤)
 */
export function PersonHoverCard({
  label,
  doneLabel,
  people,
}: {
  /** 카드 제목(예: 검토자, 승인자). */
  label: string;
  /** 완료 배지 문구(예: 검토, 승인). */
  doneLabel: string;
  people: ChangeRequestPerson[];
}) {
  const total = people.length;
  const done = people.filter((p) => p.done).length;

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
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {done}/{total}
            </span>
            명 {doneLabel} 완료
          </p>
        </div>
        <ul className="flex flex-col gap-1.5">
          {people.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm">
                <span className="font-medium text-foreground">{p.name}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {p.teamName}
                </span>
              </span>
              {p.done ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                >
                  {doneLabel}
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
