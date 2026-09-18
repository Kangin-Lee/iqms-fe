import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  RefreshCwIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import CopyButton from "@/components/common/CopyButton";
import DatePicker from "@/components/common/DatePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  actionAdequacyOpinionToText,
  actionVerdictLabel,
  geminiAssessActionAdequacy,
  type ActionAdequacyOpinion,
} from "@/lib/gemini";
import type { QualityEvent } from "../queries";
import type { ActionResult } from "../../nonconformity-management/minor-closure/actions";

/** 조치 적절성 판정 배지 색상. */
const VERDICT_BADGE: Record<ActionAdequacyOpinion["verdict"], string> = {
  adequate:
    "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  partial:
    "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  inadequate:
    "border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

export type ActionCompleteInput = {
  result: ActionResult;
  completedDateLabel: string;
  content: string;
};

type ActionCompleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: ActionCompleteInput) => void;
  /** AI 조치 적절성 판단에 쓰는 대상 품질 이벤트(부적합). */
  event: QualityEvent;
};

const RESULT_OPTIONS: ActionResult[] = ["완료", "일부완료", "미완료"];

/**
 * 조치 완료 모달.
 * 조치 결과·완료일·조치 내용을 입력합니다. 완료 시 해당 품질 이벤트는 종료됩니다.
 * (결과가 미완료여도 완료 절차를 끝내면 상태는 조치 완료가 됩니다.)
 */
export default function ActionCompleteDialog({
  open,
  onOpenChange,
  onConfirm,
  event,
}: ActionCompleteDialogProps) {
  const [result, setResult] = useState<ActionResult | "">("");
  const [completedDate, setCompletedDate] = useState<Date | undefined>(
    new Date()
  );
  const [content, setContent] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  // 조치 적절성 AI 판단(온디맨드). 키 없음/실패 시 규칙 기반 폴백.
  const assess = useMutation({
    mutationFn: () => geminiAssessActionAdequacy(event, content),
  });
  const opinion = assess.data ?? null;

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setResult("");
      setCompletedDate(new Date());
      setContent("");
    }
  }

  // 열고 닫을 때 이전 AI 소견을 비웁니다.
  useEffect(() => {
    assess.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hasContent = content.trim().length > 0;
  const checks = opinion
    ? opinion.checks.filter((c) => c.status === "warn" || c.status === "risk")
    : [];

  function submit() {
    const text = content.trim();
    if (!result || !completedDate || !text) return;
    onConfirm({
      result,
      completedDateLabel: format(completedDate, "yyyy-MM-dd"),
      content: text,
    });
    toast.add({
      title: "조치 완료",
      description: "조치를 완료 처리하고 해당 품질 이벤트를 종료했습니다.",
      type: "success",
    });
  }

  const disabled = !result || !completedDate || !content.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>조치 완료</DialogTitle>
          <DialogDescription>조치 결과를 입력해 주세요.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">조치 결과</span>
            <RadioGroup
              value={result}
              onValueChange={(value) => setResult(value as ActionResult)}
              className="flex flex-row flex-wrap gap-x-4 gap-y-2 pt-1.5"
            >
              {RESULT_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <RadioGroupItem value={option} />
                  {option}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">완료일</span>
            <DatePicker
              value={completedDate}
              onChange={setCompletedDate}
              placeholder="완료일 선택"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">조치 내용</span>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="실제 수행한 조치 내용을 입력해 주세요."
            className="min-h-24 resize-none"
          />
        </div>

        {/* AI 조치 적절성 판단 (참고용) */}
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
                <span className="font-medium">AI 조치 적절성</span>
                <Badge variant="outline" className={VERDICT_BADGE[opinion.verdict]}>
                  {actionVerdictLabel(opinion.verdict)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  신뢰도 {opinion.confidence}%
                </span>
                <CopyButton
                  className="ml-auto"
                  text={() => actionAdequacyOpinionToText(opinion)}
                  label="AI 소견 복사"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="AI 판단 다시 요청"
                  onClick={() => assess.mutate()}
                  disabled={!hasContent}
                >
                  <RefreshCwIcon />
                </Button>
              </div>

              <p className="text-foreground">{opinion.summary}</p>

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
              disabled={!hasContent}
            >
              <SparklesIcon />
              AI로 조치 적절성 확인
            </Button>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            AI 소견은 참고용입니다. 최종 판단은 담당자가 합니다.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          조치 완료 시 해당 품질 이벤트는 종료됩니다.
        </p>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" onClick={submit} disabled={disabled}>
            조치 완료
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
