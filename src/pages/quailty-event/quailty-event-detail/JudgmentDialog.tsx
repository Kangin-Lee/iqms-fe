import { useState, type CSSProperties } from "react";
import { ArrowLeftIcon, BanIcon, SparklesIcon } from "lucide-react";

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
import CopyButton from "@/components/common/CopyButton";
import {
  AI_VERDICT_META,
  aiSignalOpinionToText,
  type AiReviewAssessment,
} from "../queries";

/** 부적합 판정 결과. */
export type JudgmentResult = "confirmed" | "rejected";

type JudgmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventNumber: string;
  /** 검토 단계에서 받아 저장된 AI 소견(없을 수 있음). 여기서 재요청하지 않습니다. */
  assessment: AiReviewAssessment | null;
  onConfirm: (result: JudgmentResult, reason: string) => void;
};

const RESULT_TOAST: Record<
  JudgmentResult,
  { title: string; description: string; type: "warning" | "success" }
> = {
  confirmed: {
    title: "부적합 확정",
    description: "부적합으로 확정했습니다.",
    type: "warning",
  },
  rejected: {
    title: "부적합 불인정",
    description: "부적합 불인정으로 처리했습니다.",
    type: "success",
  },
};

/** AI 소견 → 추천 판정. 추천 버튼에 하이라이트를 줍니다(선택은 판정자 몫). */
const VERDICT_TO_JUDGMENT: Record<
  AiReviewAssessment["verdict"],
  JudgmentResult
> = {
  suspect: "confirmed",
  insufficient: "rejected",
  normal: "rejected",
};

const RESULT_RING_COLOR: Record<JudgmentResult, string> = {
  confirmed: "var(--destructive)",
  rejected: "var(--muted-foreground)",
};

/** 사유 작성 스텝에서 보여줄 선택 판정 라벨/배지. */
const JUDGMENT_BADGE: Record<
  JudgmentResult,
  { label: string; badge: "destructive" | "secondary" }
> = {
  confirmed: { label: "부적합 확정", badge: "destructive" },
  rejected: { label: "부적합 불인정", badge: "secondary" },
};

/** 판정 결정 버튼 정의(표시 순서대로). */
const JUDGMENT_BUTTONS: {
  key: JudgmentResult;
  label: string;
  variant: "destructive" | "outline";
}[] = [
  { key: "confirmed", label: "부적합 확정", variant: "destructive" },
  { key: "rejected", label: "부적합 불인정", variant: "outline" },
];

export default function JudgmentDialog({
  open,
  onOpenChange,
  eventNumber,
  assessment,
  onConfirm,
}: JudgmentDialogProps) {
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<JudgmentResult | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  // 열 때만 판정·사유를 초기화합니다(닫는 중 초기화하면 이전 스텝이 잠깐 보임).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setReason("");
      setDecision(null);
    }
  }

  function submit() {
    const text = reason.trim();
    if (!decision || !text) return;
    onConfirm(decision, text);
    toast.add(RESULT_TOAST[decision]);
  }

  const inReasonStep = decision !== null;
  const recommended = assessment
    ? VERDICT_TO_JUDGMENT[assessment.verdict]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>부적합 판정</DialogTitle>
          <DialogDescription>
            {inReasonStep
              ? "이 판정을 내린 이유를 작성해 주세요."
              : `검토 단계의 AI 소견을 참고해 ${eventNumber}의 부적합 여부를 판정해 주세요.`}
          </DialogDescription>
        </DialogHeader>

        {inReasonStep ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">선택한 판정</span>
              <Badge variant={JUDGMENT_BADGE[decision].badge}>
                {JUDGMENT_BADGE[decision].label}
              </Badge>
            </div>

            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="판정 사유를 작성해 주세요."
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
            {/* 검토 단계에서 받은 AI 소견 (읽기 전용) */}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              {assessment ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="size-4 text-muted-foreground" />
                    <span className="font-medium">AI 소견</span>
                    <Badge variant={AI_VERDICT_META[assessment.verdict].badge}>
                      {AI_VERDICT_META[assessment.verdict].label}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      검토 단계 기록
                    </span>
                    <CopyButton
                      text={() =>
                        aiSignalOpinionToText(
                          AI_VERDICT_META[assessment.verdict].label,
                          assessment.summary,
                          assessment.signals
                        )
                      }
                      label="AI 소견 복사"
                    />
                  </div>

                  <p className="text-foreground">{assessment.summary}</p>

                  {assessment.signals.length > 0 && (
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
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  검토 단계에서 기록된 AI 소견이 없습니다.
                </p>
              )}
            </div>

            {/* 판정 결정 → 사유 작성 스텝으로. AI 추천 판정은 회전 그라데이션 링. */}
            <div className="flex flex-col gap-2">
              {JUDGMENT_BUTTONS.map(({ key, label, variant }) => {
                const button = (
                  <Button
                    type="button"
                    variant={variant}
                    size="lg"
                    className="relative w-full"
                    onClick={() => setDecision(key)}
                  >
                    <BanIcon />
                    {label}
                  </Button>
                );

                if (recommended !== key) return <div key={key}>{button}</div>;
                return (
                  <div key={key} className="relative rounded-lg">
                    {button}
                    <span
                      className="ai-recommend-ring pointer-events-none absolute inset-0"
                      style={
                        {
                          "--ai-ring-color": RESULT_RING_COLOR[key],
                        } as CSSProperties
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
