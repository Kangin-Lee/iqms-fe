import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowLeftIcon,
  FileCheck2Icon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { useMutation } from "@tanstack/react-query";

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
import { geminiAssessCapaNeed } from "@/lib/gemini";
import {
  aiSignalOpinionToText,
  type CapaAssessment,
  type CapaVerdict,
  type QualityEvent,
} from "../queries";

/** CAPA 판정 결과. minor = 경미 부적합/단순조치 대상. */
export type CapaJudgmentResult = "required" | "minor";

const CAPA_VERDICT_META: Record<
  CapaVerdict,
  { label: string; badge: "destructive" | "secondary" }
> = {
  required: { label: "CAPA 필요", badge: "destructive" },
  minor: { label: "경미/단순조치 권고", badge: "secondary" },
};

const RESULT_TOAST: Record<
  CapaJudgmentResult,
  { title: string; description: string; type: "info" | "success" }
> = {
  required: {
    title: "CAPA 필요",
    description: "CAPA가 필요한 것으로 판정했습니다.",
    type: "info",
  },
  minor: {
    title: "경미 부적합/단순조치 대상",
    description: "경미 부적합/단순조치 대상으로 분류했습니다.",
    type: "success",
  },
};

type CapaJudgmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ncNumber: string;
  /** AI 소견 산출 대상. */
  event: QualityEvent;
  onConfirm: (result: CapaJudgmentResult, reason: string) => void;
};

const BUTTONS: {
  key: CapaJudgmentResult;
  label: string;
  icon: typeof ShieldCheckIcon;
  variant: "default" | "outline";
  ringColor: string;
}[] = [
  {
    key: "required",
    label: "CAPA 필요",
    icon: ShieldCheckIcon,
    variant: "default",
    ringColor: "oklch(0.72 0 0)",
  },
  {
    key: "minor",
    label: "경미부적합/단순조치 대상",
    icon: FileCheck2Icon,
    variant: "outline",
    ringColor: "var(--muted-foreground)",
  },
];

/** 사유 작성 스텝에서 보여줄 선택 판정 라벨/배지. */
const CAPA_BADGE: Record<
  CapaJudgmentResult,
  { label: string; badge: "destructive" | "secondary" }
> = {
  required: { label: "CAPA 필요", badge: "destructive" },
  minor: { label: "경미부적합/단순조치 대상", badge: "secondary" },
};

export default function CapaJudgmentDialog({
  open,
  onOpenChange,
  ncNumber,
  event,
  onConfirm,
}: CapaJudgmentDialogProps) {
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<CapaJudgmentResult | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  // AI 소견 요청은 버튼 트리거(온디맨드) 동작이라 useMutation으로 처리합니다.
  // 키가 없거나 실패하면 gemini 모듈이 규칙 기반 소견으로 자동 폴백합니다.
  const assess = useMutation({
    mutationFn: () => geminiAssessCapaNeed(event),
  });
  const assessment: CapaAssessment | null = assess.data ?? null;
  const assessing = assess.isPending;

  // 열 때만 판정·사유를 초기화합니다(닫는 중 초기화하면 이전 스텝이 잠깐 보임).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setReason("");
      setDecision(null);
    }
  }

  // 다이얼로그가 열리거나 닫힐 때 이전 AI 소견을 비웁니다.
  // open 변화에만 반응합니다(assess.reset은 안정적 참조).
  useEffect(() => {
    assess.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runAssessment = () => assess.mutate();

  function submit() {
    const text = reason.trim();
    if (!decision || !text) return;
    onConfirm(decision, text);
    toast.add(RESULT_TOAST[decision]);
  }

  const inReasonStep = decision !== null;
  // AI 소견 → 추천 결정. minor면 경미부적합/단순조치 대상을 추천합니다.
  const recommended: CapaJudgmentResult | null = assessment
    ? assessment.verdict
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>CAPA 판정</DialogTitle>
          <DialogDescription>
            {inReasonStep
              ? "이 판정을 내린 이유를 작성해 주세요."
              : `AI 소견을 참고해 ${ncNumber}에 CAPA(시정·예방조치)가 필요한지 판정해 주세요.`}
          </DialogDescription>
        </DialogHeader>

        {inReasonStep && decision ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">선택한 판정</span>
              <Badge variant={CAPA_BADGE[decision].badge}>
                {CAPA_BADGE[decision].label}
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
        {/* AI 소견 (참고용) */}
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
                <Badge variant={CAPA_VERDICT_META[assessment.verdict].badge}>
                  {CAPA_VERDICT_META[assessment.verdict].label}
                </Badge>
                <CopyButton
                  className="ml-auto"
                  text={() =>
                    aiSignalOpinionToText(
                      CAPA_VERDICT_META[assessment.verdict].label,
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
                            signal.kind === "risk" ? "destructive" : "secondary"
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
            AI 소견은 참고용입니다. 최종 판정은 판정자가 합니다.
          </p>
        </div>

        {/* 판정 결정 → 사유 작성 스텝으로. AI 추천 결정은 회전 그라데이션 링. */}
        <div className="flex flex-col gap-2">
          {BUTTONS.map(({ key, label, icon: Icon, variant, ringColor }) => {
            const button = (
              <Button
                type="button"
                variant={variant}
                size="lg"
                className="relative w-full"
                onClick={() => setDecision(key)}
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
