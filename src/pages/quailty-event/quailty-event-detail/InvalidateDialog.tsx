import { useState } from "react";
import { BanIcon } from "lucide-react";

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

type InvalidateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ncNumber: string;
  onConfirm: (reason: string) => void;
};

export default function InvalidateDialog({
  open,
  onOpenChange,
  ncNumber,
  onConfirm,
}: InvalidateDialogProps) {
  const [reason, setReason] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  // 열 때만 초기화합니다(닫는 중 초기화하면 내용이 잠깐 바뀌어 보임).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setReason("");
  }

  function submit() {
    const text = reason.trim();
    if (!text) return;
    onConfirm(text);
    toast.add({
      title: "부적합 무효",
      description: `${ncNumber} 부적합을 무효 처리했습니다.`,
      type: "warning",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>부적합 무효</DialogTitle>
          <DialogDescription>
            {ncNumber} 부적합을 무효 처리합니다. 사유를 작성해 주세요.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="무효 사유를 작성해 주세요."
          className="min-h-24 resize-none"
        />

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!reason.trim()}
            onClick={submit}
          >
            <BanIcon />
            부적합 무효
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
