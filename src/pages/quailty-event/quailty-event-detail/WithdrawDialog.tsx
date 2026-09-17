import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WithdrawDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 회수 대상 이벤트 번호(확인 문구에 노출). */
  eventNumber: string;
  /** 확인 시 실행. */
  onConfirm: () => void;
};

export default function WithdrawDialog({
  open,
  onOpenChange,
  eventNumber,
  onConfirm,
}: WithdrawDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>이벤트 회수</DialogTitle>
          <DialogDescription>
            {eventNumber} 이벤트를 회수하시겠습니까?
            <br />
            회수하면 검토가 중단되고 작성 단계로 돌아갑니다.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" onClick={onConfirm}>
            회수
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
