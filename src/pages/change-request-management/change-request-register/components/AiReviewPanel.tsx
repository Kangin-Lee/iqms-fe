import {
  ArrowRightIcon,
  CheckIcon,
  InfoIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";

import CopyButton from "@/components/common/CopyButton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  changeReviewOpinionToText,
  reviewVerdictLabel,
  type ChangeReviewFinding,
  type ChangeReviewOpinion,
} from "../../queries";

/** 종합 판정 배지 색상(작성중/검토 배지 톤과 통일). */
const VERDICT_BADGE: Record<
  ChangeReviewOpinion["verdict"],
  string
> = {
  approve:
    "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  revise:
    "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  reject:
    "border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  hold: "border-transparent bg-muted text-muted-foreground",
};

/** 긴급 여부 배지: 색은 의미로 고정합니다(긴급=빨강, 일반=중립). */
function UrgencyBadge({ urgency }: { urgency: "일반" | "긴급" }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 font-medium",
        urgency === "긴급"
          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          : "border bg-background text-foreground"
      )}
    >
      {urgency}
    </span>
  );
}

function FindingRow({ finding }: { finding: ChangeReviewFinding }) {
  const iconClass =
    finding.status === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : finding.status === "risk"
        ? "text-red-600 dark:text-red-400"
        : finding.status === "warn"
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground";
  const Icon = finding.status === "ok" ? CheckIcon : TriangleAlertIcon;
  const labelClass =
    finding.status === "warn"
      ? "text-amber-700 dark:text-amber-400"
      : finding.status === "risk"
        ? "text-red-700 dark:text-red-400"
        : "text-foreground";

  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconClass)} />
      <span>
        <span className={cn("font-medium", labelClass)}>{finding.label}</span>
        <span className="text-muted-foreground"> — {finding.message}</span>
      </span>
    </li>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-medium text-muted-foreground">
      {children}
    </div>
  );
}

export default function AiReviewPanel({
  opinion,
}: {
  opinion: ChangeReviewOpinion;
}) {
  const { urgency } = opinion;
  const urgencyMismatch = urgency.requested !== urgency.recommended;

  return (
    <div className="rounded-xl border bg-card p-4 text-card-foreground">
      {/* 헤더 */}
      <div className="mb-3 flex items-center gap-2.5">
        <SparklesIcon className="size-5 text-primary" />
        <span className="font-medium">AI 검토 소견</span>
        <span className="flex-1" />
        <Badge variant="outline" className={VERDICT_BADGE[opinion.verdict]}>
          {reviewVerdictLabel(opinion.verdict)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          신뢰도 {opinion.confidence}%
        </span>
        <CopyButton
          text={() => changeReviewOpinionToText(opinion)}
          label="AI 검토 소견 복사"
        />
      </div>

      {/* 소견 요약 */}
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
        {opinion.summary}
      </p>

      {/* 긴급 여부 검토 */}
      <div className="border-t pt-3">
        <SectionLabel>긴급 여부 검토</SectionLabel>
        {urgencyMismatch ? (
          // 불일치: 요청 → 권고. 색은 의미로, 재검토는 amber 배지로 표시.
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">요청</span>
            <UrgencyBadge urgency={urgency.requested} />
            <ArrowRightIcon className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">AI 권고</span>
            <UrgencyBadge urgency={urgency.recommended} />
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              재검토 권고
            </span>
          </div>
        ) : (
          // 일치: 요청 긴급 여부가 적정하다는 확인만 표시(화살표 없음)
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <UrgencyBadge urgency={urgency.requested} />
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              <CheckIcon className="size-3.5" />
              요청 긴급 여부와 AI 판단 일치
            </span>
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          {urgency.rationale}
        </p>
      </div>

      {/* 영향범위 점검 */}
      <div className="mt-3 border-t pt-3">
        <SectionLabel>영향범위 점검</SectionLabel>
        <ul className="flex flex-col gap-1.5">
          {opinion.impactCheck.map((f, i) => (
            <FindingRow key={`impact-${i}`} finding={f} />
          ))}
        </ul>
      </div>

      {/* 정합성·완성도 */}
      <div className="mt-3 border-t pt-3">
        <SectionLabel>정합성 · 완성도</SectionLabel>
        <ul className="flex flex-col gap-1.5">
          {opinion.consistency.map((f, i) => (
            <FindingRow key={`consistency-${i}`} finding={f} />
          ))}
        </ul>
      </div>

      {/* 승인 전 확인 질문 */}
      <div className="mt-3 border-t pt-3">
        <SectionLabel>승인 전 확인 질문</SectionLabel>
        <ol className="list-decimal pl-5 text-sm leading-relaxed marker:text-muted-foreground">
          {opinion.questions.map((q, i) => (
            <li key={`q-${i}`}>{q}</li>
          ))}
        </ol>
      </div>

      {/* 메타/가드레일 */}
      <div className="mt-3 flex items-center gap-2 border-t pt-2.5 text-xs text-muted-foreground">
        <InfoIcon className="size-3.5 shrink-0" />
        <span>참고용 소견입니다. 최종 판단은 검토자·승인자가 수행합니다.</span>
        <span className="flex-1" />
        <span className="shrink-0">
          {opinion.generatedAt} ·{" "}
          {opinion.source === "ai" ? "AI 분석 · gemini" : "규칙 기반"}
        </span>
      </div>
    </div>
  );
}
