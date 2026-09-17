import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** done=적용 완료(메모 선택), fail=적용 실패(사유 필수). */
  mode: "done" | "fail";
  onConfirm: (note: string) => void;
};

/** 적용 완료(결과 메모 선택) / 적용 실패(사유 필수) 확인 다이얼로그. */
export default function ApplyResultDialog({
  open,
  onOpenChange,
  mode,
  onConfirm,
}: Props) {
  const [note, setNote] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  // 열 때 입력 초기화.
  useEffect(() => {
    if (open) setNote("");
  }, [open]);
  if (open !== prevOpen) setPrevOpen(open);

  const isFail = mode === "fail";
  // 실패는 사유 필수.
  const canSubmit = !isFail || note.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    onConfirm(note.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isFail ? "적용 실패" : "적용 완료"}</DialogTitle>
          <DialogDescription>
            {isFail ? (
              <>
                적용 실패로 처리하시겠습니까?
                <br />
                상태가 적용실패로 변경됩니다.
              </>
            ) : (
              <>
                변경 적용을 완료 처리하시겠습니까?
                <br />
                상태가 검증대기로 변경됩니다.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="apply-result-note">
            {isFail ? "실패 사유" : "적용 결과 메모"}
            {isFail ? (
              <span className="text-destructive"> *</span>
            ) : (
              <span className="text-muted-foreground"> (선택)</span>
            )}
          </FieldLabel>
          <Textarea
            id="apply-result-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isFail
                ? "실패 원인을 작성해 주세요. 재적용 시 참고됩니다."
                : "적용 결과·특이사항을 남겨 주세요."
            }
            className="min-h-24 resize-none"
          />
        </Field>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            variant={isFail ? "destructive" : "default"}
            onClick={submit}
            disabled={!canSubmit}
          >
            {isFail ? "적용 실패 처리" : "적용 완료"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
