import { usePDF } from "@react-pdf/renderer";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  BanIcon,
  CheckCheckIcon,
  CheckIcon,
  ClipboardCheckIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlayIcon,
  RotateCcwIcon,
  SendIcon,
  Trash2Icon,
  Undo2Icon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";

import { currentUser } from "@/mock/currentUser";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field as FormField, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  cancelChangeRequest,
  changeRequestKeys,
  deleteChangeRequest,
  recordApplyResult,
  recordChangeReviewDecision,
  recordVerifyResult,
  setChangeRequestPersonDone,
  updateChangeRequestStatus,
  useChangeRequest,
  type ChangeRequest,
  type ChangeRequestPerson,
} from "../queries";
import { GradeBadge, StatusBadge } from "../StatusBadge";
import ApplyResultDialog from "./ApplyResultDialog";
import ChangeRequestPdf from "./ChangeRequestPdf";
import VerifyResultDialog from "./VerifyResultDialog";
import ReviewApproveDialog, {
  type ReviewApproveDecision,
} from "./ReviewApproveDialog";

/** 라벨 + 값 한 줄(정의 목록 스타일). */
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children || "-"}</dd>
    </div>
  );
}

/** 카드 섹션 래퍼. */
function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** 검토자/승인자 목록(개별 완료 여부 배지 포함). */
function PeopleList({
  people,
  doneLabel,
}: {
  people: ChangeRequestPerson[];
  doneLabel: string;
}) {
  if (people.length === 0)
    return <p className="text-sm text-muted-foreground">지정된 인원이 없습니다.</p>;

  const done = people.filter((p) => p.done).length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">
          {done}/{people.length}
        </span>
        명 {doneLabel} 완료
      </p>
      <ul className="flex flex-col divide-y rounded-lg border">
        {people.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-2 px-3 py-2"
          >
            <span className="min-w-0 truncate text-sm">
              <span className="font-medium text-foreground">{p.name}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">
                {p.teamName} · {p.positionName}
              </span>
            </span>
            {p.done ? (
              <Badge
                variant="outline"
                className="shrink-0 border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
              >
                {doneLabel}
              </Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0">
                대기
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ChangeRequestDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: cr, isPending, isError, error } = useChangeRequest(id);

  if (isPending || isError || !cr) {
    const message = isPending
      ? "불러오는 중…"
      : isError
        ? `형상변경요청을 불러오지 못했습니다. ${error?.message ?? ""}`
        : "해당 형상변경요청을 찾을 수 없습니다.";

    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <p
          className={
            isError
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {message}
        </p>
        {!isPending && (
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => navigate(-1)}
          >
            <ArrowLeftIcon />
            뒤로
          </Button>
        )}
      </div>
    );
  }

  return <ChangeRequestDetailContent cr={cr} />;
}

type ActionItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  variant?: "destructive";
};

function ChangeRequestDetailContent({ cr }: { cr: ChangeRequest }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [reRequestOpen, setReRequestOpen] = useState(false);
  const [applyStartOpen, setApplyStartOpen] = useState(false);
  const [applyDoneOpen, setApplyDoneOpen] = useState(false);
  const [applyFailOpen, setApplyFailOpen] = useState(false);
  const [reApplyOpen, setReApplyOpen] = useState(false);
  const [verifyStartOpen, setVerifyStartOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // 검토승인대기 상태에서 노출 버튼을 결정하는 조건.
  // - 내 검토가 아직 안 끝났으면 검토 버튼(끝냈거나 문서 검토가 완료면 숨김)
  // - 모든 검토자가 끝났고 내 승인이 아직이면 승인 버튼(검토 미완료면 숨김)
  // - 요청자 본인이면 회수 버튼
  const myReviewPending = cr.reviewers.some(
    (p) => p.name === currentUser.name && !p.done
  );
  const allReviewersDone = cr.reviewers.every((p) => p.done);
  const myApprovePending = cr.approvers.some(
    (p) => p.name === currentUser.name && !p.done
  );
  const isRequester = cr.requester === currentUser.name;

  /**
   * PDF를 한 번만 렌더링해 뷰어/다운로드가 같은 blob을 공유합니다.
   * cr이 바뀔 때만 다시 생성합니다.
   */
  const pdfDocument = useMemo(() => <ChangeRequestPdf cr={cr} />, [cr]);
  const [pdfInstance, updatePdf] = usePDF({ document: pdfDocument });
  useEffect(() => {
    updatePdf(pdfDocument);
  }, [pdfDocument, updatePdf]);
  const pdfFileName = `${cr.crNumber}_${cr.title}.pdf`;

  // 상태 전이(목업) + 목록/상세 캐시 무효화 + 토스트.
  function transition(toStatus: number, message: string) {
    updateChangeRequestStatus(cr.id, toStatus);
    queryClient.invalidateQueries({ queryKey: changeRequestKeys.all });
    toast.add({ title: message, type: "success" });
  }

  function handleDelete() {
    deleteChangeRequest(cr.id);
    queryClient.invalidateQueries({ queryKey: changeRequestKeys.list() });
    toast.add({ title: "삭제 완료", description: `${cr.crNumber}를 삭제했습니다.`, type: "success" });
    navigate("/configuration-changes/list");
  }

  function handleEdit() {
    navigate(`/configuration-changes/register/${cr.id}`);
  }

  // 상태·완료표시만 변경합니다(toast는 다이얼로그가 담당).
  function invalidateCr() {
    // detail·list·myReview 모두 갱신(배지·목록 동기화).
    queryClient.invalidateQueries({ queryKey: changeRequestKeys.all });
  }

  // 검토 다이얼로그 결정 처리.
  function handleReviewDecision(
    decision: ReviewApproveDecision,
    reason: string
  ) {
    if (decision === "review") {
      setChangeRequestPersonDone(cr.id, "reviewer", currentUser.name);
    } else if (decision === "supplement") {
      recordChangeReviewDecision(cr.id, 3, reason);
    } else if (decision === "reject") {
      recordChangeReviewDecision(cr.id, 4, reason);
    }
    invalidateCr();
    setReviewOpen(false);
  }

  // 승인 다이얼로그 결정 처리.
  function handleApproveDecision(
    decision: ReviewApproveDecision,
    reason: string
  ) {
    if (decision === "approve") {
      setChangeRequestPersonDone(cr.id, "approver", currentUser.name);
      updateChangeRequestStatus(cr.id, 5);
    } else if (decision === "supplement") {
      recordChangeReviewDecision(cr.id, 3, reason);
    } else if (decision === "reject") {
      recordChangeReviewDecision(cr.id, 4, reason);
    }
    invalidateCr();
    setApproveOpen(false);
  }

  // 재요청: 보완한 내용으로 다시 검토·승인 요청 → 검토승인대기(2)로 전이.
  function handleReRequest() {
    setReRequestOpen(false);
    transition(2, "재요청했습니다. (검토승인대기)");
  }

  // 적용 시작: 적용대기 → 적용중(6)으로 전이.
  function handleApplyStart() {
    setApplyStartOpen(false);
    transition(6, "적용을 시작했습니다. (적용중)");
  }

  // 적용 완료: 적용중 → 검증대기(8). 결과 메모(선택) 기록.
  function handleApplyDone(note: string) {
    recordApplyResult(cr.id, 8, note);
    invalidateCr();
    toast.add({ title: "적용 완료", description: "검증대기로 변경되었습니다.", type: "success" });
    setApplyDoneOpen(false);
  }

  // 적용 실패: 적용중 → 적용실패(7). 사유(필수) 기록.
  function handleApplyFail(note: string) {
    recordApplyResult(cr.id, 7, note);
    invalidateCr();
    toast.add({ title: "적용 실패 처리", description: "적용실패로 변경되었습니다.", type: "warning" });
    setApplyFailOpen(false);
  }

  // 재적용: 적용실패 → 적용중(6)으로 재시도.
  function handleReApply() {
    setReApplyOpen(false);
    transition(6, "재적용을 시작했습니다. (적용중)");
  }

  // 검증 시작: 검증대기 → 검증중(9)으로 전이.
  function handleVerifyStart() {
    setVerifyStartOpen(false);
    transition(9, "검증을 시작했습니다. (검증중)");
  }

  // 검증 판정: 검증중 → 검증완료(11) 또는 검증실패(10). (toast는 다이얼로그가 담당)
  function handleVerifyDecision(decision: "done" | "fail", note: string) {
    recordVerifyResult(cr.id, decision === "done" ? 11 : 10, note);
    invalidateCr();
    setVerifyOpen(false);
  }

  // 종료: 검증완료 → 종료(12)로 최종 확정.
  function handleClose() {
    setCloseOpen(false);
    transition(12, "변경을 종료했습니다.");
  }

  // 취소: 요청자가 진행 중단 → 취소(13). 사유(필수) 기록.
  function handleCancel() {
    const reason = cancelReason.trim();
    if (!reason) return;
    cancelChangeRequest(cr.id, reason);
    invalidateCr();
    toast.add({
      title: "변경 취소",
      description: "변경요청을 취소했습니다.",
      type: "warning",
    });
    setCancelOpen(false);
  }

  // 취소 가능 상태(적용 전/적용 포기 단계)이고 요청자 본인일 때만 취소 노출.
  const canCancel = isRequester && [2, 3, 5, 7].includes(cr.status);
  const cancelAction: ActionItem = {
    key: "cancel",
    label: "취소",
    icon: BanIcon,
    onSelect: () => {
      setCancelReason("");
      setCancelOpen(true);
    },
    variant: "destructive",
  };

  // 상태별 노출 액션(첨부 이미지 기준).
  const baseActions: ActionItem[] = (() => {
    switch (cr.status) {
      case 1: // 작성중
        return [
          { key: "edit", label: "수정", icon: PencilIcon, onSelect: handleEdit },
          {
            key: "delete",
            label: "삭제",
            icon: Trash2Icon,
            onSelect: handleDelete,
            variant: "destructive",
          },
        ];
      case 2: {
        // 검토승인대기: 역할별 노출.
        // - 검토자 → 검토 / 승인자 → 승인 / 작성자(본인) → 회수
        const items: ActionItem[] = [];
        // 내 검토가 남아 있을 때만 검토 버튼.
        if (myReviewPending)
          items.push({
            key: "review",
            label: "검토",
            icon: ClipboardCheckIcon,
            onSelect: () => setReviewOpen(true),
          });
        // 모든 검토자가 검토를 끝냈고, 내 승인이 남아 있을 때만 승인 버튼.
        if (allReviewersDone && myApprovePending)
          items.push({
            key: "approve",
            label: "승인",
            icon: CheckIcon,
            onSelect: () => setApproveOpen(true),
          });
        if (isRequester)
          items.push({
            key: "withdraw",
            label: "회수",
            icon: Undo2Icon,
            onSelect: () => transition(1, "회수했습니다. (작성중)"),
          });
        return items;
      }
      case 3: // 보완요청
        return [
          { key: "edit", label: "수정", icon: PencilIcon, onSelect: handleEdit },
          {
            key: "re-request",
            label: "재요청",
            icon: SendIcon,
            onSelect: () => setReRequestOpen(true),
          },
        ];
      case 4: // 반려: 반려 사유는 상단 콜아웃으로 표시(상태 전용 버튼 없음)
        return [];
      case 5: // 적용대기
        return [
          {
            key: "apply-start",
            label: "적용 시작",
            icon: PlayIcon,
            onSelect: () => setApplyStartOpen(true),
          },
        ];
      case 6: // 적용중
        return [
          {
            key: "apply-done",
            label: "적용 완료",
            icon: CheckIcon,
            onSelect: () => setApplyDoneOpen(true),
          },
          {
            key: "apply-fail",
            label: "적용 실패",
            icon: XIcon,
            onSelect: () => setApplyFailOpen(true),
            variant: "destructive",
          },
        ];
      case 7: // 적용실패
        return [
          {
            key: "re-apply",
            label: "재적용",
            icon: RotateCcwIcon,
            onSelect: () => setReApplyOpen(true),
          },
        ];
      case 8: // 검증대기
        return [
          {
            key: "verify-start",
            label: "검증 시작",
            icon: PlayIcon,
            onSelect: () => setVerifyStartOpen(true),
          },
        ];
      case 9: // 검증중
        return [
          {
            key: "verify",
            label: "검증 판정",
            icon: ClipboardCheckIcon,
            onSelect: () => setVerifyOpen(true),
          },
        ];
      case 10: // 검증실패
        return [
          {
            key: "rework",
            label: "재작업 요청",
            icon: RotateCcwIcon,
            onSelect: () => transition(5, "재작업을 요청했습니다. (적용대기)"),
          },
        ];
      case 11: // 검증완료
        return [
          {
            key: "close",
            label: "종료",
            icon: CheckCheckIcon,
            onSelect: () => setCloseOpen(true),
          },
        ];
      default: // 12 종료 / 13 취소: 상태 전용 버튼 없음
        return [];
    }
  })();

  // 취소 가능 상태(2·3·5·7)의 요청자에게 취소 액션을 덧붙입니다.
  const statusActions: ActionItem[] = canCancel
    ? [...baseActions, cancelAction]
    : baseActions;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      {/* 헤더 */}
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit text-muted-foreground hover:text-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeftIcon />
          뒤로
        </Button>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">{cr.crNumber}</p>
              <GradeBadge grade={cr.grade} />
              <StatusBadge status={cr.status} statusName={cr.statusName} />
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {cr.title}
            </h2>
          </div>

          {/* 액션 메뉴: 상태별 버튼 + 기본 PDF 다운로드 */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="작업"
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              {statusActions.map((action) => (
                <DropdownMenuItem
                  key={action.key}
                  variant={action.variant}
                  onClick={action.onSelect}
                >
                  <action.icon />
                  {action.label}
                </DropdownMenuItem>
              ))}

              {statusActions.length > 0 && <DropdownMenuSeparator />}

              {/* 기본 액션: PDF 다운로드 (미리 만들어 둔 blob 사용) */}
              <DropdownMenuItem
                disabled={!pdfInstance.url}
                render={
                  <a href={pdfInstance.url ?? undefined} download={pdfFileName} />
                }
              >
                <DownloadIcon />
                {pdfInstance.loading ? "PDF 생성 중…" : "PDF 다운로드"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 보완요청 사유 (보완요청 상태) */}
      {cr.status === 3 && cr.supplementReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">보완요청 사유</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {cr.supplementReason}
          </p>
        </div>
      )}

      {/* 반려 사유 (반려 상태) */}
      {cr.status === 4 && cr.rejectReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">반려 사유</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {cr.rejectReason}
          </p>
        </div>
      )}

      {/* 적용 실패 사유 (적용실패 상태) */}
      {cr.status === 7 && cr.applyFailReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">적용 실패 사유</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {cr.applyFailReason}
          </p>
        </div>
      )}

      {/* 검증 실패 사유 (검증실패 상태) */}
      {cr.status === 10 && cr.verifyFailReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">검증 실패 사유</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {cr.verifyFailReason}
          </p>
        </div>
      )}

      {/* 취소 사유 (취소 상태) */}
      {cr.status === 13 && cr.cancelReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">취소 사유</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {cr.cancelReason}
          </p>
        </div>
      )}

      <Section title="기본 정보">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Field label="제목" className="col-span-2 sm:col-span-4">
            {cr.title}
          </Field>
          <Field label="변경 구분">{cr.changeTypeName}</Field>
          <Field label="요청자">{cr.requester}</Field>
          <Field label="요청부서">{cr.requestDepartment}</Field>
          <Field label="긴급 여부">
            <GradeBadge grade={cr.grade} />
          </Field>
          <Field label="요청일">{cr.requestDate}</Field>
          <Field label="희망 완료일">{cr.requestedApplyDate}</Field>
        </dl>
      </Section>

      <Section title="변경 대상 (형상 항목)">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Field label="대상 유형">{cr.targetTypeName}</Field>
          <Field label="대상명">{cr.targetItem}</Field>
          <Field label="리비전">
            <span className="tabular-nums">
              {cr.currentRevision} → {cr.targetRevision}
            </span>
          </Field>
          <Field label="관련 프로젝트">{cr.relatedProject}</Field>
          <Field label="관련 제품/서비스">{cr.relatedProduct}</Field>
          <Field label="관련 업무/프로세스">{cr.relatedProcess}</Field>
        </dl>
      </Section>

      <Section title="변경 내용">
        <dl className="flex flex-col gap-4">
          <Field label="변경 요청 사유">
            <p className="whitespace-pre-wrap">{cr.reason}</p>
          </Field>
          <Field label="현재 문제점">
            <p className="whitespace-pre-wrap">{cr.asIs}</p>
          </Field>
          <Field label="기대효과">
            <p className="whitespace-pre-wrap">{cr.toBe}</p>
          </Field>
        </dl>
      </Section>

      <Section title="영향 분석">
        <dl className="flex flex-col gap-4">
          <Field label="영향 범위">
            {cr.impactScope.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {cr.impactScope.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              "-"
            )}
          </Field>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field label="품질 영향">{cr.qualityImpact}</Field>
            <Field label="일정 영향">{cr.scheduleImpact}</Field>
            <Field label="원가 영향">{cr.costImpact}</Field>
            <Field label="재검증·재인증">{cr.revalidationRequired}</Field>
            <Field label="고객·규제 승인">{cr.customerApprovalRequired}</Field>
          </div>
          {cr.rollbackPlan && (
            <Field label="롤백 계획">
              <p className="whitespace-pre-wrap">{cr.rollbackPlan}</p>
            </Field>
          )}
        </dl>
      </Section>

      <Section title="적용 계획">
        <dl className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Field label="적용 담당자">{cr.applyAssignee}</Field>
            <Field label="적용 예정일">{cr.applyDate}</Field>
            <Field label="롤백 필요 여부">{cr.rollbackNeeded}</Field>
            <Field label="배포 필요 여부">{cr.deployNeeded}</Field>
          </div>
          <Field label="적용 방법">
            <p className="whitespace-pre-wrap">{cr.applyMethod}</p>
          </Field>
          {cr.applyNote && (
            <Field label="비고">
              <p className="whitespace-pre-wrap">{cr.applyNote}</p>
            </Field>
          )}
          {cr.applyResultNote && (
            <Field label="적용 결과 메모">
              <p className="whitespace-pre-wrap">{cr.applyResultNote}</p>
            </Field>
          )}
        </dl>
      </Section>

      <Section title="검증 계획">
        <dl className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Field label="검증 담당자">{cr.verifyAssignee}</Field>
            <Field label="검증 예정일">{cr.verifyDate}</Field>
            <Field label="검증 증적 필요 여부">
              {cr.verifyEvidenceNeeded}
            </Field>
          </div>
          <Field label="검증 방법">
            <p className="whitespace-pre-wrap">{cr.verifyMethod}</p>
          </Field>
          <Field label="검증 기준">
            <p className="whitespace-pre-wrap">{cr.verifyCriteria}</p>
          </Field>
          {cr.verifyResultNote && (
            <Field label="검증 결과 메모">
              <p className="whitespace-pre-wrap">{cr.verifyResultNote}</p>
            </Field>
          )}
        </dl>
      </Section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Section title="검토자">
          <PeopleList people={cr.reviewers} doneLabel="검토" />
        </Section>
        <Section title="승인자">
          <PeopleList people={cr.approvers} doneLabel="승인" />
        </Section>
      </div>

      {cr.requestComment && (
        <Section title="접수 의견">
          <p className="whitespace-pre-wrap text-sm">{cr.requestComment}</p>
        </Section>
      )}

      <ReviewApproveDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        cr={cr}
        mode="review"
        onDecision={handleReviewDecision}
      />
      <ReviewApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        cr={cr}
        mode="approve"
        onDecision={handleApproveDecision}
      />

      {/* 재요청 확인 */}
      <Dialog open={reRequestOpen} onOpenChange={setReRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>재요청</DialogTitle>
            <DialogDescription>
              보완한 내용으로 다시 검토·승인을 요청하시겠습니까?
              <br />
              요청하면 검토승인대기 상태로 돌아갑니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReRequestOpen(false)}
            >
              취소
            </Button>
            <Button type="button" onClick={handleReRequest}>
              재요청
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 적용 시작 확인 */}
      <Dialog open={applyStartOpen} onOpenChange={setApplyStartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>적용 시작</DialogTitle>
            <DialogDescription>
              변경 적용을 시작하시겠습니까?
              <br />
              상태가 적용중으로 변경됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApplyStartOpen(false)}
            >
              취소
            </Button>
            <Button type="button" onClick={handleApplyStart}>
              적용 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 적용 완료(결과 메모 선택) / 적용 실패(사유 필수) */}
      <ApplyResultDialog
        open={applyDoneOpen}
        onOpenChange={setApplyDoneOpen}
        mode="done"
        onConfirm={handleApplyDone}
      />
      <ApplyResultDialog
        open={applyFailOpen}
        onOpenChange={setApplyFailOpen}
        mode="fail"
        onConfirm={handleApplyFail}
      />

      {/* 재적용 확인 */}
      <Dialog open={reApplyOpen} onOpenChange={setReApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>재적용</DialogTitle>
            <DialogDescription>
              실패 원인을 조치하고 다시 적용하시겠습니까?
              <br />
              상태가 적용중으로 변경됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReApplyOpen(false)}
            >
              취소
            </Button>
            <Button type="button" onClick={handleReApply}>
              재적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 검증 판정(검증 결과 입력 → AI 판단 → 완료/실패) */}
      <VerifyResultDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        cr={cr}
        onDecision={handleVerifyDecision}
      />

      {/* 종료 확인 */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>변경 종료</DialogTitle>
            <DialogDescription>
              변경을 최종 종료하시겠습니까?
              <br />
              종료 후에는 상태를 변경할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCloseOpen(false)}
            >
              취소
            </Button>
            <Button type="button" onClick={handleClose}>
              종료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 검증 시작 확인 */}
      <Dialog open={verifyStartOpen} onOpenChange={setVerifyStartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>검증 시작</DialogTitle>
            <DialogDescription>
              변경 검증을 시작하시겠습니까?
              <br />
              상태가 검증중으로 변경됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVerifyStartOpen(false)}
            >
              취소
            </Button>
            <Button type="button" onClick={handleVerifyStart}>
              검증 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 취소 확인 (사유 필수) */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>변경 취소</DialogTitle>
            <DialogDescription>
              변경 진행을 취소하시겠습니까?
              <br />
              취소하면 상태가 취소로 변경되며 이력으로 보존됩니다.
            </DialogDescription>
          </DialogHeader>
          <FormField>
            <FieldLabel htmlFor="cancel-reason">
              취소 사유<span className="text-destructive"> *</span>
            </FieldLabel>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="취소하는 사유를 작성해 주세요."
              className="min-h-24 resize-none"
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(false)}
            >
              닫기
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim()}
            >
              변경 취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
