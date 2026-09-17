import { useState } from "react";
import { format } from "date-fns";
import { RefreshCwIcon, SparklesIcon } from "lucide-react";

import { useMutation } from "@tanstack/react-query";

import DatePicker from "@/components/common/DatePicker";
import { geminiSuggestActionPlan } from "@/lib/gemini";
import type { QualityEvent } from "@/pages/quailty-event/queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { reviewers } from "@/mock/reviewers";

export type SimpleActionInput = {
  assignee: string;
  dueDateLabel: string;
  plan: string;
};

type SimpleActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** AI 계획 초안 추천 대상. */
  event: QualityEvent;
  /** 수정 모드일 때 기존 값(담당자·기한(yyyy-MM-dd)·계획). */
  initial?: SimpleActionInput | null;
  onSubmit: (input: SimpleActionInput) => void;
};

/** yyyy-MM-dd 문자열 → Date(로컬). 파싱 실패 시 undefined. */
function parseDate(label?: string): Date | undefined {
  if (!label) return undefined;
  const [y, m, d] = label.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/**
 * 단순조치 등록/수정 모달.
 * 담당자·기한·계획을 입력합니다. 등록하면 조치 상태가 조치중이 됩니다.
 */
export default function SimpleActionDialog({
  open,
  onOpenChange,
  event,
  initial,
  onSubmit,
}: SimpleActionDialogProps) {
  const isEdit = Boolean(initial);

  const [assignee, setAssignee] = useState(initial?.assignee ?? "");
  // 기한 기본값: 수정 모드면 기존 값, 신규면 오늘 날짜.
  const [dueDate, setDueDate] = useState<Date | undefined>(
    parseDate(initial?.dueDateLabel) ?? new Date()
  );
  const [plan, setPlan] = useState(initial?.plan ?? "");
  const [prevOpen, setPrevOpen] = useState(open);

  // AI 조치 계획 초안 추천(폼 채우기). 키 없거나 실패 시 규칙 기반 초안으로 폴백.
  const draft = useMutation({
    mutationFn: () => geminiSuggestActionPlan(event),
  });

  function suggestPlan() {
    draft.mutate(undefined, { onSuccess: (result) => setPlan(result) });
  }

  // 열릴 때 기존 값으로 초기화합니다(수정 모드 프리필, 신규는 오늘 기한).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAssignee(initial?.assignee ?? "");
      setDueDate(parseDate(initial?.dueDateLabel) ?? new Date());
      setPlan(initial?.plan ?? "");
    }
  }

  function submit() {
    if (!assignee || !dueDate) return;
    onSubmit({
      assignee,
      dueDateLabel: format(dueDate, "yyyy-MM-dd"),
      plan: plan.trim(),
    });
    toast.add({
      title: isEdit ? "조치 수정" : "조치 등록",
      description: isEdit
        ? "조치 내용을 수정했습니다."
        : "단순조치를 등록했습니다. 상태가 조치중으로 변경되었습니다.",
      type: "success",
    });
  }

  // 조치 계획까지 작성해야 등록할 수 있습니다.
  const disabled = !assignee || !dueDate || !plan.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "단순조치 수정" : "단순조치 등록"}</DialogTitle>
          <DialogDescription>단순조치 정보를 입력해 주세요.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">조치 담당자</span>
            <Select
              value={assignee}
              onValueChange={(value) => setAssignee(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => (value ? String(value) : "담당자를 선택해 주세요.")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>조치 담당자</SelectLabel>
                  {reviewers.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name} · {r.teamName} {r.positionName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">조치 기한</span>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="기한 선택"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">조치 계획</span>
            {/* AI 조치 계획 초안 추천 — 계획 내용을 채웁니다(참고용, 담당자가 검토·수정). */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={suggestPlan}
              disabled={draft.isPending}
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
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="조치 계획을 입력해 주세요."
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
            {isEdit ? "수정" : "등록"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
