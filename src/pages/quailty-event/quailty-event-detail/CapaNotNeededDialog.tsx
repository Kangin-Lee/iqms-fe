import { useState } from "react";

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

type CapaNotNeededDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ncNumber: string;
  onConfirm: (reason: string) => void;
};

/**
 * CAPA 불필요 처리 모달.
 * 불필요 사유를 입력하면 해당 부적합이 경미 부적합/단순조치 종결 대상으로 이동합니다.
 */
export default function CapaNotNeededDialog({
  open,
  onOpenChange,
  ncNumber,
  onConfirm,
}: CapaNotNeededDialogProps) {
  const [reason, setReason] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setReason("");
  }

  function submit() {
    const text = reason.trim();
    if (!text) return;
    onConfirm(text);
    toast.add({
      title: "CAPA 불필요",
      description: "CAPA 불필요로 처리해 경미 부적합/단순조치 종결 대상으로 이동했습니다.",
      type: "success",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>CAPA 불필요 처리</DialogTitle>
          <DialogDescription>
            {ncNumber}에 CAPA가 불필요한 사유를 입력해 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">불필요 사유</span>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="불필요 사유를 입력해 주세요."
            className="min-h-28 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            불필요로 처리하면 해당 부적합은 경미 부적합/단순조치 종결 대상으로
            이동합니다.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" onClick={submit} disabled={!reason.trim()}>
            불필요 처리
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
