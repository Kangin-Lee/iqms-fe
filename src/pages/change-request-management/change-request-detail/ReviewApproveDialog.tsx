import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  BanIcon,
  CheckIcon,
  ClipboardListIcon,
  CornerUpLeftIcon,
  RefreshCwIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { geminiAssessChangeImpact } from "@/lib/gemini";
import {
  changeRequestToValues,
  reviewVerdictLabel,
  type ChangeRequest,
  type ChangeReviewFinding,
  type ChangeReviewOpinion,
} from "../queries";

/** 다이얼로그에서 내릴 수 있는 결정. */
export type ReviewApproveDecision =
  | "review"
  | "approve"
  | "supplement"
  | "reject";

/** AI 종합 판정 배지 색상(AiReviewPanel과 톤 통일). */
const VERDICT_BADGE: Record<ChangeReviewOpinion["verdict"], string> = {
  approve:
    "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  revise:
    "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  reject:
    "border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  hold: "border-transparent bg-muted text-muted-foreground",
};

/** 결정별 배지·사유 안내·toast. */
const DECISION_META: Record<
  ReviewApproveDecision,
  {
    label: string;
    badge: "default" | "secondary" | "destructive";
    reasonHint: string;
    toast: {
      title: string;
      description: string;
      type: "success" | "info" | "warning";
    };
  }
> = {
  review: {
    label: "검토 완료",
    badge: "default",
    reasonHint: "검토를 완료한 근거를 작성해 주세요.",
    toast: {
      title: "검토 완료",
      description: "검토가 완료 처리되었습니다.",
      type: "success",
    },
  },
  approve: {
    label: "승인",
    badge: "default",
    reasonHint: "승인하는 근거를 작성해 주세요.",
    toast: {
      title: "승인 완료",
      description: "승인 처리되었습니다. (적용대기)",
      type: "success",
    },
  },
  supplement: {
    label: "보완요청",
    badge: "secondary",
    reasonHint: "보완이 필요한 사항을 작성해 주세요.",
    toast: {
      title: "보완요청",
      description: "보완을 요청했습니다.",
      type: "info",
    },
  },
  reject: {
    label: "반려",
    badge: "destructive",
    reasonHint: "반려하는 이유를 작성해 주세요.",
    toast: {
      title: "반려",
      description: "변경요청을 반려했습니다.",
      type: "warning",
    },
  },
};

/** 결정 버튼 정의(표시 순서대로). ringColor는 추천 강조 링 색. */
type DecisionButton = {
  key: ReviewApproveDecision;
  label: string;
  icon: typeof CheckIcon;
  variant: "default" | "destructive" | "outline";
  ringColor: string;
};

const REVIEW_BUTTONS: DecisionButton[] = [
  {
    key: "review",
    label: "검토 완료",
    icon: CheckIcon,
    variant: "default",
    ringColor: "oklch(0.72 0 0)",
  },
  {
    key: "supplement",
    label: "보완요청",
    icon: ClipboardListIcon,
    variant: "outline",
    ringColor: "var(--muted-foreground)",
  },
  {
    key: "reject",
    label: "반려",
    icon: CornerUpLeftIcon,
    variant: "destructive",
    ringColor: "var(--destructive)",
  },
];

const APPROVE_BUTTONS: DecisionButton[] = [
  {
    key: "approve",
    label: "승인",
    icon: CheckIcon,
    variant: "default",
    ringColor: "oklch(0.72 0 0)",
  },
  {
    key: "supplement",
    label: "보완요청",
    icon: ClipboardListIcon,
    variant: "outline",
    ringColor: "var(--muted-foreground)",
  },
  {
    key: "reject",
    label: "반려",
    icon: BanIcon,
    variant: "destructive",
    ringColor: "var(--destructive)",
  },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cr: ChangeRequest;
  /** review=검토자 검토, approve=승인자 승인. */
  mode: "review" | "approve";
  onDecision: (decision: ReviewApproveDecision, reason: string) => void;
};

export default function ReviewApproveDialog({
  open,
  onOpenChange,
  cr,
  mode,
  onDecision,
}: Props) {
  const [decision, setDecision] = useState<ReviewApproveDecision | null>(null);
  const [reason, setReason] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  // AI 소견 요청(온디맨드). 키 없음/실패 시 gemini 모듈이 규칙 기반으로 폴백합니다.
  const assess = useMutation({
    mutationFn: () => geminiAssessChangeImpact(changeRequestToValues(cr)),
  });
  const opinion = assess.data ?? null;
  const assessing = assess.isPending;

  // 열 때만 결정·사유 초기화(닫는 중 초기화하면 이전 스텝이 잠깐 보임).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDecision(null);
      setReason("");
    }
  }

  // 열고 닫을 때 이전 AI 소견을 비웁니다.
  useEffect(() => {
    assess.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const buttons = mode === "review" ? REVIEW_BUTTONS : APPROVE_BUTTONS;

  // AI 판정 → 추천 결정 매핑(추천 버튼 하이라이트에 사용).
  const recommended: ReviewApproveDecision | null = opinion
    ? opinion.verdict === "approve"
      ? mode === "review"
        ? "review"
        : "approve"
      : opinion.verdict === "revise"
        ? "supplement"
        : opinion.verdict === "reject"
          ? "reject"
          : null
    : null;

  function pickDecision(next: ReviewApproveDecision) {
    setDecision(next);
    setReason("");
  }

  function submit() {
    const text = reason.trim();
    if (!decision || !text) return;
    onDecision(decision, text);
    toast.add(DECISION_META[decision].toast);
  }

  // 경고·위험 소견만 추려 "판단 근거"로 노출.
  const findings: ChangeReviewFinding[] = opinion
    ? [...opinion.impactCheck, ...opinion.consistency].filter(
        (f) => f.status === "warn" || f.status === "risk"
      )
    : [];

  const inReasonStep = decision !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "review" ? "검토" : "승인"}</DialogTitle>
          <DialogDescription>
            {inReasonStep
              ? "이 결정을 내린 이유를 작성해 주세요."
              : `AI 판단을 참고해 ${mode === "review" ? "검토" : "승인"} 결과를 선택해 주세요.`}
          </DialogDescription>
        </DialogHeader>

        {inReasonStep ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">선택한 결정</span>
              <Badge variant={DECISION_META[decision].badge}>
                {DECISION_META[decision].label}
              </Badge>
            </div>

            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={DECISION_META[decision].reasonHint}
              className="min-h-28 resize-none"
            />

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDecision(null)}
              >
                <ArrowLeftIcon />
                뒤로
              </Button>
              <Button type="button" onClick={submit} disabled={!reason.trim()}>
                제출
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* AI 소견 (참고용). 호출은 선택이며, 없이도 결정할 수 있습니다. */}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              {assessing ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCwIcon className="size-4 animate-spin" />
                  AI 분석 중…
                </div>
              ) : opinion ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="size-4 text-muted-foreground" />
                    <span className="font-medium">AI 소견</span>
                    <Badge
                      variant="outline"
                      className={VERDICT_BADGE[opinion.verdict]}
                    >
                      {reviewVerdictLabel(opinion.verdict)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      신뢰도 {opinion.confidence}%
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="ml-auto"
                      aria-label="AI 판단 다시 요청"
                      onClick={() => assess.mutate()}
                    >
                      <RefreshCwIcon />
                    </Button>
                  </div>

                  <p className="text-foreground">{opinion.summary}</p>

                  {recommended && (
                    <p className="text-xs text-muted-foreground">
                      추천 결정:{" "}
                      <span className="font-medium text-foreground">
                        {DECISION_META[recommended].label}
                      </span>{" "}
                      (아래에서 강조 표시)
                    </p>
                  )}

                  {findings.length > 0 ? (
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        판단 근거 ({findings.length})
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {findings.map((f, i) => (
                          <li
                            key={`${f.label}-${i}`}
                            className="rounded-md border bg-background p-2"
                          >
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={
                                  f.status === "risk" ? "destructive" : "secondary"
                                }
                                className="shrink-0"
                              >
                                {f.status === "risk" ? "위험" : "주의"}
                              </Badge>
                              <span className="font-medium text-foreground">
                                {f.label}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {f.message}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TriangleAlertIcon className="size-3.5" />
                      특이 신호가 발견되지 않았습니다.
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => assess.mutate()}
                >
                  <SparklesIcon />
                  AI 판단 요청
                </Button>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                AI 소견은 참고용입니다. 최종 판단은{" "}
                {mode === "review" ? "검토자" : "승인자"}가 합니다.
              </p>
            </div>

            {/* 최종 결정 → 사유 작성 스텝. AI 추천 버튼은 회전 그라데이션 링. */}
            <div className="flex flex-col gap-2">
              {buttons.map(({ key, label, icon: Icon, variant, ringColor }) => {
                const button = (
                  <Button
                    type="button"
                    variant={variant}
                    size="lg"
                    className="relative w-full"
                    onClick={() => pickDecision(key)}
                  >
                    <Icon />
                    {label}
                  </Button>
                );

                if (recommended !== key) return <div key={key}>{button}</div>;

                return (
                  <div key={key} className="relative rounded-lg">
                    {button}
                    <span
                      className="ai-recommend-ring pointer-events-none absolute inset-0"
                      style={{ "--ai-ring-color": ringColor } as CSSProperties}
                      aria-hidden
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
