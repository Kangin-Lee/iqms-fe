import { useState } from "react";
import { format } from "date-fns";

import DatePicker from "@/components/common/DatePicker";
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
import type { ActionResult } from "../../nonconformity-management/minor-closure/actions";

export type ActionCompleteInput = {
  result: ActionResult;
  completedDateLabel: string;
  content: string;
};

type ActionCompleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: ActionCompleteInput) => void;
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
}: ActionCompleteDialogProps) {
  const [result, setResult] = useState<ActionResult | "">("");
  const [completedDate, setCompletedDate] = useState<Date | undefined>(
    new Date()
  );
  const [content, setContent] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setResult("");
      setCompletedDate(new Date());
      setContent("");
    }
  }

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
      <DialogContent className="sm:max-w-lg">
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
