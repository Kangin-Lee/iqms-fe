import { useState } from "react";
import { RefreshCwIcon, SparklesIcon } from "lucide-react";

import { useMutation } from "@tanstack/react-query";

import { geminiSuggestCapaClosure } from "@/lib/gemini";
import type { QualityEvent } from "@/pages/quailty-event/queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type CapaCloseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** AI 종료 의견 초안 대상(연결 품질 이벤트). */
  event: QualityEvent | null;
  /** 효과성 검증 의견(AI 초안의 근거). */
  effectivenessOpinion: string;
  onConfirm: (comment: string) => void;
};

/**
 * CAPA 종료 모달. 종료 의견을 입력하고 CAPA를 종료합니다.
 * (효과성 검증 완료 + 효과있음 → 종료)
 */
export default function CapaCloseDialog({
  open,
  onOpenChange,
  event,
  effectivenessOpinion,
  onConfirm,
}: CapaCloseDialogProps) {
  const [comment, setComment] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setComment("");
  }

  // AI 종료 의견 초안(효과성 검증 결과·이벤트 맥락 기반).
  const draft = useMutation({
    mutationFn: () => {
      if (!event) throw new Error("연결된 품질 이벤트가 없습니다.");
      return geminiSuggestCapaClosure(event, effectivenessOpinion);
    },
  });

  function suggestDraft() {
    draft.mutate(undefined, { onSuccess: (text) => setComment(text) });
  }

  const disabled = !comment.trim();

  function submit() {
    if (disabled) return;
    onConfirm(comment.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>CAPA 종료</DialogTitle>
          <DialogDescription>
            효과성 검증에서 효과가 확인되어 CAPA를 종료합니다. 종료 의견을 입력해
            주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">종료 의견</span>
            {/* AI 종료 의견 초안 — 효과성 검증 결과·이벤트 맥락을 정리합니다. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={suggestDraft}
              disabled={draft.isPending || !event}
            >
              {draft.isPending ? (
                <>
                  <RefreshCwIcon className="animate-spin" />
                  생성 중…
                </>
              ) : (
                <>
                  <SparklesIcon />
                  AI 초안 제안
                </>
              )}
            </Button>
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="종료 의견을 입력해 주세요."
            className="min-h-24 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" onClick={submit} disabled={disabled}>
            CAPA 종료
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
