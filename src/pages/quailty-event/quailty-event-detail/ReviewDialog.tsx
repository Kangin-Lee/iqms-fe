import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowLeftIcon,
  BanIcon,
  CheckIcon,
  CornerUpLeftIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";

import { useMutation } from "@tanstack/react-query";

import CopyButton from "@/components/common/CopyButton";
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
import { geminiAssessQualityEvent } from "@/lib/gemini";
import {
  AI_VERDICT_META,
  aiSignalOpinionToText,
  REVIEW_DECISION_META,
  type AiReviewAssessment,
  type AiReviewVerdict,
  type QualityEvent,
  type ReviewDecision,
} from "../queries";

/** AI 소견 → 추천 결정 매핑. 추천 버튼에 하이라이트를 줍니다(선택은 검토자 몫). */
const VERDICT_TO_DECISION: Record<AiReviewVerdict, ReviewDecision> = {
  suspect: "nonconformity",
  insufficient: "reject",
  normal: "complete",
};

/** 결정 버튼 정의. 표시 순서대로. ringColor는 버튼 색과 맞춘 추천 링 색. */
const DECISION_BUTTONS: {
  key: ReviewDecision;
  label: string;
  icon: typeof CheckIcon;
  variant: "default" | "destructive" | "outline";
  ringColor: string;
}[] = [
  {
    key: "complete",
    label: "검토 완료",
    icon: CheckIcon,
    variant: "default",
    // 버튼 배경이 어두운 primary라 primary 링은 묻힘 → 밝은 회색으로 대비 확보.
    ringColor: "oklch(0.72 0 0)",
  },
  {
    key: "nonconformity",
    label: "부적합 판정 요청",
    icon: BanIcon,
    variant: "destructive",
    ringColor: "var(--destructive)",
  },
  {
    key: "reject",
    label: "반려",
    icon: CornerUpLeftIcon,
    variant: "outline",
    ringColor: "var(--muted-foreground)",
  },
];

/** 결정별 사유 안내 + toast. 라벨/배지는 REVIEW_DECISION_META를 공유합니다. */
const DECISION_EXTRA: Record<
  ReviewDecision,
  {
    reasonHint: string;
    toast: {
      title: string;
      description: string;
      type: "success" | "info" | "warning";
    };
  }
> = {
  complete: {
    reasonHint: "부적합이 아니라고 판단한 이유를 작성해 주세요.",
    toast: {
      title: "검토 완료",
      description: "검토가 완료 처리되었습니다.",
      type: "success",
    },
  },
  nonconformity: {
    reasonHint: "부적합으로 의심한 이유를 작성해 주세요.",
    toast: {
      title: "부적합 판정 요청",
      description: "부적합 판정을 요청했습니다.",
      type: "info",
    },
  },
  reject: {
    reasonHint: "반려하는 이유를 작성해 주세요.",
    toast: {
      title: "반려",
      description: "이벤트를 반려했습니다.",
      type: "warning",
    },
  },
};

type ReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** AI 소견 산출 대상. */
  event: QualityEvent;
  /** 부적합 없이 검토를 마칩니다. ai: 결정 당시 AI 소견(없으면 null). */
  onComplete: (reason: string, ai: AiReviewAssessment | null) => void;
  /** 부적합 판정 요청으로 검토를 마칩니다. */
  onRequestNonconformity: (reason: string, ai: AiReviewAssessment | null) => void;
  /** 문서를 등록자에게 반송합니다. */
  onReject: (reason: string, ai: AiReviewAssessment | null) => void;
};

export default function ReviewDialog({
  open,
  onOpenChange,
  event,
  onComplete,
  onRequestNonconformity,
  onReject,
}: ReviewDialogProps) {
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [reason, setReason] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  // AI 소견 요청은 버튼 트리거(온디맨드) 동작이라 useMutation으로 처리합니다.
  // 키가 없거나 실패하면 gemini 모듈이 규칙 기반 소견으로 자동 폴백합니다.
  const assess = useMutation({
    mutationFn: () => geminiAssessQualityEvent(event),
  });
  const assessment: AiReviewAssessment | null = assess.data ?? null;
  const assessing = assess.isPending;

  // 열 때만 결정·사유를 초기화합니다(닫는 중 초기화하면 이전 스텝이 잠깐 보임).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDecision(null);
      setReason("");
    }
  }

  // 다이얼로그가 열리거나 닫힐 때 이전 AI 소견을 비웁니다.
  // open 변화에만 반응합니다(assess.reset은 안정적 참조).
  useEffect(() => {
    assess.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runAssessment = () => assess.mutate();

  function pickDecision(next: ReviewDecision) {
    setDecision(next);
    setReason("");
  }

  function submit() {
    const text = reason.trim();
    if (!decision || !text) return;

    // TODO: 실제 API 연동 시 성공 응답을 받은 뒤 toast를 띄우도록 바꿉니다.
    if (decision === "complete") onComplete(text, assessment);
    else if (decision === "nonconformity")
      onRequestNonconformity(text, assessment);
    else onReject(text, assessment);

    toast.add(DECISION_EXTRA[decision].toast);
  }

  const inReasonStep = decision !== null;
  // AI 소견이 있으면 그에 대응하는 추천 결정. 버튼 하이라이트에 사용합니다.
  const recommended = assessment
    ? VERDICT_TO_DECISION[assessment.verdict]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>검토</DialogTitle>
          <DialogDescription>
            {inReasonStep
              ? "이 결정을 내린 이유를 작성해 주세요."
              : "AI 판단을 참고해 검토 결과를 선택해 주세요."}
          </DialogDescription>
        </DialogHeader>

        {inReasonStep ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">선택한 결정</span>
              <Badge variant={REVIEW_DECISION_META[decision].badge}>
                {REVIEW_DECISION_META[decision].label}
              </Badge>
            </div>

            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={DECISION_EXTRA[decision].reasonHint}
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
              ) : assessment ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="size-4 text-muted-foreground" />
                    <span className="font-medium">AI 소견</span>
                    <Badge variant={AI_VERDICT_META[assessment.verdict].badge}>
                      {AI_VERDICT_META[assessment.verdict].label}
                    </Badge>

                    <CopyButton
                      className="ml-auto"
                      text={() =>
                        aiSignalOpinionToText(
                          AI_VERDICT_META[assessment.verdict].label,
                          assessment.summary,
                          assessment.signals
                        )
                      }
                      label="AI 소견 복사"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="AI 판단 다시 요청"
                      onClick={runAssessment}
                    >
                      <RefreshCwIcon />
                    </Button>
                  </div>

                  <p className="text-foreground">{assessment.summary}</p>

                  {recommended && (
                    <p className="text-xs text-muted-foreground">
                      추천 결정:{" "}
                      <span className="font-medium text-foreground">
                        {REVIEW_DECISION_META[recommended].label}
                      </span>{" "}
                      (아래에서 강조 표시)
                    </p>
                  )}

                  {assessment.signals.length > 0 ? (
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        판단 근거 ({assessment.signals.length})
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {assessment.signals.map((signal) => (
                          <li
                            key={`${signal.label}:${signal.value}`}
                            className="rounded-md border bg-background p-2"
                          >
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={
                                  signal.kind === "risk"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="shrink-0"
                              >
                                {signal.kind === "risk" ? "위험" : "정보"}
                              </Badge>
                              <span className="font-medium text-foreground">
                                {signal.label}: {signal.value}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {signal.detail}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
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
                  onClick={runAssessment}
                >
                  <SparklesIcon />
                  AI 판단 요청
                </Button>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                AI 소견은 참고용입니다. 최종 판단은 검토자가 합니다.
              </p>
            </div>

            {/* 검토자 최종 결정 → 사유 작성 스텝으로 이동. AI 추천 버튼은 회전 그라데이션 링. */}
            <div className="flex flex-col gap-2">
              {DECISION_BUTTONS.map(({ key, label, icon: Icon, variant, ringColor }) => {
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

                // 추천 버튼: 배경은 그대로 두고 테두리만 회전하는 그라데이션 링을 덮음.
                return (
                  <div key={key} className="relative rounded-lg">
                    {button}
                    <span
                      className="ai-recommend-ring pointer-events-none absolute inset-0"
                      style={
                        { "--ai-ring-color": ringColor } as CSSProperties
                      }
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
