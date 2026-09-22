import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { toast } from "@/components/ui/toast";

type PendingSignup = {
  id: string;
  name: string;
  email: string;
  phone: string;
  dept: string;
  date: string;
};

/** 승인 시 부여할 권한(필수 선택). */
const ROLE_OPTIONS = [
  { value: "admin", label: "관리자" },
  { value: "user", label: "일반사용자" },
  { value: "external", label: "외부사용자" },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];

/** 데모용 대기 목록. 실제로는 서버에서 승인 대기 가입 요청을 받아옵니다. */
const INITIAL: PendingSignup[] = [
  { id: "s1", name: "정하늘", email: "haneul@i-ops.co.kr", phone: "010-2345-6789", dept: "위성영상팀", date: "2026-09-19" },
  { id: "s2", name: "문재원", email: "jaewon@i-ops.co.kr", phone: "010-3456-7890", dept: "운영관리실", date: "2026-09-20" },
  { id: "s3", name: "배수현", email: "suhyun@i-ops.co.kr", phone: "010-4567-8901", dept: "품질관리실", date: "2026-09-21" },
];

/** 회원가입 승인 탭 — 승인 시 권한을 선택하는 다이얼로그를 띄웁니다. */
export default function SignupApprovalTab() {
  const [items, setItems] = useState<PendingSignup[]>(INITIAL);
  /** 승인 다이얼로그 대상. null이면 닫힘. */
  const [approving, setApproving] = useState<PendingSignup | null>(null);
  const [role, setRole] = useState<RoleValue | "">("");
  /** 반려 확인 다이얼로그 대상. null이면 닫힘. */
  const [rejecting, setRejecting] = useState<PendingSignup | null>(null);

  function openApprove(p: PendingSignup) {
    setApproving(p);
    setRole("");
  }

  function confirmApprove() {
    if (!approving || !role) return;
    const roleLabel = ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
    setItems((prev) => prev.filter((x) => x.id !== approving.id));
    toast.add({
      title: "가입 승인",
      description: `${approving.name} 님을 '${roleLabel}' 권한으로 승인했습니다.`,
      type: "success",
    });
    setApproving(null);
    setRole("");
  }

  function confirmReject() {
    if (!rejecting) return;
    setItems((prev) => prev.filter((x) => x.id !== rejecting.id));
    toast.add({
      title: "가입 반려",
      description: `${rejecting.name}(${rejecting.email}) 요청을 반려했습니다.`,
      type: "error",
    });
    setRejecting(null);
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          대기 중인 가입 요청이 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {p.name}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {p.dept}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.email} · {p.phone} · 신청일 {p.date}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => openApprove(p)}>
                  승인
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRejecting(p)}
                >
                  반려
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 승인 다이얼로그 — 권한 선택(필수) */}
      <Dialog
        open={approving !== null}
        onOpenChange={(open) => {
          if (!open) {
            setApproving(null);
            setRole("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>가입 승인</DialogTitle>
            <DialogDescription>
              {approving
                ? `${approving.name}(${approving.email}) 님에게 부여할 권한을 선택하세요.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              권한 <span className="text-destructive">*</span>
            </span>
            <Select
              value={role}
              onValueChange={(value) => setRole((value as RoleValue) ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => {
                    const label = ROLE_OPTIONS.find(
                      (r) => r.value === value
                    )?.label;
                    return label ?? "권한을 선택하세요";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>권한</SelectLabel>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {!role && (
              <span className="text-xs text-muted-foreground">
                권한 선택은 필수입니다.
              </span>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproving(null);
                setRole("");
              }}
            >
              취소
            </Button>
            <Button onClick={confirmApprove} disabled={!role}>
              승인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 반려 확인 다이얼로그 */}
      <Dialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) setRejecting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>가입 반려</DialogTitle>
            <DialogDescription>
              {rejecting
                ? `${rejecting.name}(${rejecting.email}) 님의 가입 요청을 반려하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
