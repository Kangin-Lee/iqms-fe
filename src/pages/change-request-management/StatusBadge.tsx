import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** 상태 코드별 배지 색상(상태 흐름 순). */
export const STATUS_BADGE_CLASS: Record<number, string> = {
  1: "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300", // 작성중
  2: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", // 검토승인대기
  3: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", // 보완요청
  4: "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300", // 반려
  5: "border-transparent bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300", // 적용대기
  6: "border-transparent bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300", // 적용중
  7: "border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300", // 적용실패
  8: "border-transparent bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300", // 검증대기
  9: "border-transparent bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300", // 검증중
  10: "border-transparent bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300", // 검증실패
  11: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", // 검증완료
  12: "border-transparent bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300", // 종료
  13: "border-transparent bg-zinc-100 text-zinc-500 dark:bg-zinc-500/20 dark:text-zinc-400", // 취소
};

/** 형상변경요청 상태 배지. */
export function StatusBadge({
  status,
  statusName,
  className,
}: {
  status: number;
  statusName: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "w-24 justify-center whitespace-nowrap",
        STATUS_BADGE_CLASS[status],
        className
      )}
    >
      {statusName}
    </Badge>
  );
}

/** 긴급/일반 배지. */
export function GradeBadge({ grade }: { grade: "normal" | "urgent" }) {
  return grade === "urgent" ? (
    <Badge
      variant="outline"
      className="border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
    >
      긴급
    </Badge>
  ) : (
    <Badge variant="secondary">일반</Badge>
  );
}
