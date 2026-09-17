import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ACTION_STATUS_NAME,
  type ActionResult,
  type SimpleAction,
} from "../../nonconformity-management/minor-closure/actions";

/** 라벨 + 값 한 칸. */
function InfoField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

/** 조치 결과 배지 스타일. */
const RESULT_VARIANT: Record<
  ActionResult,
  "secondary" | "default" | "destructive"
> = {
  완료: "secondary",
  일부완료: "default",
  미완료: "destructive",
};

type ActionInfoProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: SimpleAction;
};

/**
 * 조치 정보 다이얼로그. 종결 대상에서 조치를 등록(조치중/조치 완료)했을 때
 * 작업(⋯) 메뉴의 "조치 정보"로 엽니다.
 * 조치 상태·담당자·기한·계획을 보여주고, 완료 시 결과·완료일·조치 내용도 표시합니다.
 */
export default function ActionInfo({
  open,
  onOpenChange,
  action,
}: ActionInfoProps) {
  const completed = action.status === "completed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>조치 정보</DialogTitle>
          <DialogDescription>등록된 단순조치 정보입니다.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <InfoField label="조치 상태">
            <Badge variant={completed ? "secondary" : "default"}>
              {ACTION_STATUS_NAME[action.status]}
            </Badge>
          </InfoField>
          <InfoField label="조치 담당자">{action.assignee}</InfoField>

          <InfoField label="조치 기한">{action.dueDateLabel}</InfoField>
          {completed && action.completedDateLabel ? (
            <InfoField label="완료일">{action.completedDateLabel}</InfoField>
          ) : (
            <div />
          )}

          <div className="col-span-2">
            <InfoField label="조치 계획">
              <span className="whitespace-pre-line">
                {action.plan?.trim() || "-"}
              </span>
            </InfoField>
          </div>

          {completed && (
            <>
              <InfoField label="조치 결과">
                {action.result ? (
                  <Badge variant={RESULT_VARIANT[action.result]}>
                    {action.result}
                  </Badge>
                ) : (
                  "-"
                )}
              </InfoField>
              <div />
              <div className="col-span-2">
                <InfoField label="조치 내용">
                  <span className="whitespace-pre-line">
                    {action.content?.trim() || "-"}
                  </span>
                </InfoField>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
