import { useMutation } from "@tanstack/react-query";
import {
  CheckIcon,
  RefreshCwIcon,
  SparklesIcon,
  TriangleAlertIcon,
  XIcon,
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import CopyButton from "@/components/common/CopyButton";
import { geminiAssessVerification } from "@/lib/gemini";
import {
  verificationOpinionToText,
  verificationVerdictLabel,
  type ChangeRequest,
  type ChangeReviewFinding,
  type VerificationOpinion,
} from "../queries";

/** 검증 판정 배지 색상. */
const VERDICT_BADGE: Record<VerificationOpinion["verdict"], string> = {
  pass: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  fail: "border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  unclear: "border-transparent bg-muted text-muted-foreground",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cr: ChangeRequest;
  /** done=검증 완료, fail=검증 실패. note는 결과/사유. */
  onDecision: (decision: "done" | "fail", note: string) => void;
};

/**
 * 검증 판정 다이얼로그.
 * 검증 결과 입력 → AI 판단 요청(결과 vs 검증 기준) → 검증 완료/검증 실패.
 */
export default function VerifyResultDialog({
  open,
  onOpenChange,
  cr,
  onDecision,
}: Props) {
  const [result, setResult] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  const assess = useMutation({
    mutationFn: () => geminiAssessVerification(cr, result),
  });
  const opinion = assess.data ?? null;

  // 열 때 입력·소견 초기화.
  useEffect(() => {
    if (open) setResult("");
    assess.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (open !== prevOpen) setPrevOpen(open);

  const hasResult = result.trim().length > 0;
  const recommended: "done" | "fail" | null = opinion
    ? opinion.verdict === "pass"
      ? "done"
      : opinion.verdict === "fail"
        ? "fail"
        : null
    : null;

  function decide(decision: "done" | "fail") {
    // 검증 실패는 사유 필수.
    if (decision === "fail" && !hasResult) return;
    onDecision(decision, result.trim());
    toast.add(
      decision === "done"
        ? {
            title: "검증 완료",
            description: "검증완료로 변경되었습니다.",
            type: "success",
          }
        : {
            title: "검증 실패 처리",
            description: "검증실패로 변경되었습니다.",
            type: "warning",
          }
    );
  }

  const checks: ChangeReviewFinding[] = opinion
    ? opinion.checks.filter((c) => c.status === "warn" || c.status === "risk")
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>검증 판정</DialogTitle>
          <DialogDescription>
            검증 결과를 입력하고 AI 판단을 참고해 검증 완료/실패를 선택해 주세요.
          </DialogDescription>
        </DialogHeader>

        {/* 검증 결과 입력 */}
        <Field>
          <FieldLabel htmlFor="verify-result">검증 결과</FieldLabel>
          <Textarea
            id="verify-result"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="검증 결과·증적을 입력해 주세요. (검증 실패 시 사유로 기록됩니다)"
            className="min-h-24 resize-none"
          />
          {cr.verifyCriteria && (
            <p className="mt-1 text-xs text-muted-foreground">
              검증 기준: {cr.verifyCriteria}
            </p>
          )}
        </Field>

        {/* AI 판단 (참고용) */}
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          {assess.isPending ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCwIcon className="size-4 animate-spin" />
              AI 분석 중…
            </div>
          ) : opinion ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-4 text-muted-foreground" />
                <span className="font-medium">AI 소견</span>
                <Badge variant="outline" className={VERDICT_BADGE[opinion.verdict]}>
                  {verificationVerdictLabel(opinion.verdict)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  신뢰도 {opinion.confidence}%
                </span>
                <CopyButton
                  className="ml-auto"
                  text={() => verificationOpinionToText(opinion)}
                  label="AI 소견 복사"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="AI 판단 다시 요청"
                  onClick={() => assess.mutate()}
                  disabled={!hasResult}
                >
                  <RefreshCwIcon />
                </Button>
              </div>

              <p className="text-foreground">{opinion.summary}</p>

              {recommended && (
                <p className="text-xs text-muted-foreground">
                  추천 결정:{" "}
                  <span className="font-medium text-foreground">
                    {recommended === "done" ? "검증 완료" : "검증 실패"}
                  </span>{" "}
                  (아래에서 강조 표시)
                </p>
              )}

              {checks.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {checks.map((c, i) => (
                    <li
                      key={`${c.label}-${i}`}
                      className="rounded-md border bg-background p-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={c.status === "risk" ? "destructive" : "secondary"}
                          className="shrink-0"
                        >
                          {c.status === "risk" ? "위험" : "주의"}
                        </Badge>
                        <span className="font-medium text-foreground">
                          {c.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.message}
                      </p>
                    </li>
                  ))}
                </ul>
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
              disabled={!hasResult}
            >
              <SparklesIcon />
              AI 판단 요청
            </Button>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            AI 소견은 참고용입니다. 최종 판단은 검증 담당자가 합니다.
          </p>
        </div>

        {/* 결정 버튼 */}
        <div className="flex flex-col gap-2">
          {/* 검증 완료 */}
          {recommended === "done" ? (
            <div className="relative rounded-lg">
              <Button
                type="button"
                size="lg"
                className="relative w-full"
                onClick={() => decide("done")}
              >
                <CheckIcon />
                검증 완료
              </Button>
              <span
                className="ai-recommend-ring pointer-events-none absolute inset-0"
                style={{ "--ai-ring-color": "oklch(0.72 0 0)" } as CSSProperties}
                aria-hidden
              />
            </div>
          ) : (
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => decide("done")}
            >
              <CheckIcon />
              검증 완료
            </Button>
          )}

          {/* 검증 실패 (사유=검증 결과 필수) */}
          {recommended === "fail" ? (
            <div className="relative rounded-lg">
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="relative w-full"
                onClick={() => decide("fail")}
                disabled={!hasResult}
              >
                <XIcon />
                검증 실패
              </Button>
              <span
                className="ai-recommend-ring pointer-events-none absolute inset-0"
                style={{ "--ai-ring-color": "var(--destructive)" } as CSSProperties}
                aria-hidden
              />
            </div>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="w-full"
              onClick={() => decide("fail")}
              disabled={!hasResult}
            >
              <XIcon />
              검증 실패
            </Button>
          )}
          {!hasResult && (
            <p className="text-xs text-muted-foreground">
              검증 실패로 처리하려면 결과/사유 입력이 필요합니다.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
