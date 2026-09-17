import { usePDF } from "@react-pdf/renderer";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  BanIcon,
  CheckIcon,
  CircleAlertIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  DownloadIcon,
  GavelIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
  PencilIcon,
  ShieldCheckIcon,
  Undo2Icon,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { currentUser } from "@/mock/currentUser";
import {
  addReviewRecord,
  deleteReviewRecord,
  isMyQualityEvent,
  isMyReviewPending,
  qualityEventKeys,
  setReviewerReviewed,
  updateReviewRecord,
  useQualityEvent,
  useReviewRecords,
  type AiReviewAssessment,
  type QualityEvent,
  type ReviewDecision,
} from "../queries";
import {
  addNonconformity,
  addNonconformityTarget,
  MINOR_CLOSURE_PATH,
  nonconformityKeys,
  NONCONFORMITY_JUDGMENT_PATH,
  NONCONFORMITY_LIST_PATH,
  recordCapaJudgment,
  removeJudgmentTarget,
  setNonconformityStatus,
  useNonconformityByEvent,
  useNonconformityTarget,
} from "../../nonconformity-management/queries";
import {
  actionKeys,
  completeAction,
  registerAction,
  useSimpleAction,
} from "../../nonconformity-management/minor-closure/actions";
import {
  addCapaPlan,
  addCapaTarget,
  capaKeys,
  CAPA_REGISTER_PATH,
  removeCapaTarget,
} from "../../capa-management/queries";
import { QUALITY_EVENT_FROM_PARAM } from "../paths";
import ActionCompleteDialog, {
  type ActionCompleteInput,
} from "./ActionCompleteDialog";
import ActionInfo from "./ActionInfo";
import CapaNotNeededDialog from "./CapaNotNeededDialog";
import CapaPlanDialog, { type CapaPlanInput } from "./CapaPlanDialog";
import CapaJudgmentDialog, {
  type CapaJudgmentResult,
} from "./CapaJudgmentDialog";
import InvalidateDialog from "./InvalidateDialog";
import JudgmentDialog, { type JudgmentResult } from "./JudgmentDialog";
import NonconformityInfo from "./NonconformityInfo";
import QualityEventPdf from "./QualityEventPdf";
import ReviewComments from "./ReviewComments";
import ReviewDialog from "./ReviewDialog";
import SimpleActionDialog, {
  type SimpleActionInput,
} from "./SimpleActionDialog";
import WithdrawDialog from "./WithdrawDialog";

/** 이력 표시용 시각 포맷(순수 함수 — Date는 호출부에서 생성). */
function formatDateTime(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function QualityEventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: event, isPending, isError, error } = useQualityEvent(id);

  // 로딩 / 실패 / 없음 상태는 동일한 레이아웃에 메시지만 바꿔 보여줍니다.
  if (isPending || isError || !event) {
    const message = isPending
      ? "불러오는 중…"
      : isError
        ? `품질 이벤트를 불러오지 못했습니다. ${error.message}`
        : "해당 품질 이벤트를 찾을 수 없습니다.";

    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <p
          className={
            isError ? "text-sm text-destructive" : "text-sm text-muted-foreground"
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

  return <QualityEventDetailContent event={event} />;
}

/**
 * 본문을 분리한 이유:
 * event가 확정된 뒤에 훅을 선언해야 PDF 문서 엘리먼트를 useMemo로 고정할 수 있습니다.
 * (조건부 early return 위에서는 훅을 쓸 수 없어 non-null 단정이 필요해집니다.)
 */
function QualityEventDetailContent({ event }: { event: QualityEvent }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [judgmentOpen, setJudgmentOpen] = useState(false);
  const [invalidateOpen, setInvalidateOpen] = useState(false);
  const [capaOpen, setCapaOpen] = useState(false);
  const [actionRegisterOpen, setActionRegisterOpen] = useState(false);
  const [actionCompleteOpen, setActionCompleteOpen] = useState(false);
  const [capaPlanOpen, setCapaPlanOpen] = useState(false);
  const [capaNotNeededOpen, setCapaNotNeededOpen] = useState(false);
  const [actionInfoOpen, setActionInfoOpen] = useState(false);
  const { data: reviewRecords } = useReviewRecords(String(event.id));

  const fromParam = searchParams.get(QUALITY_EVENT_FROM_PARAM);
  // 부적합 판정 대상에서 들어온 경우: 검토·반려 대신 부적합 판정 액션을 노출합니다.
  const fromJudgment = fromParam === NONCONFORMITY_JUDGMENT_PATH;
  // 부적합 목록에서 들어온 경우: 부적합 무효 / CAPA 판정 액션을 노출합니다.
  const fromNonconformity = fromParam === NONCONFORMITY_LIST_PATH;
  // 경미 부적합/단순조치 종결 대상에서 들어온 경우: 조치 등록/수정/완료 액션을 노출합니다.
  const fromMinorClosure = fromParam === MINOR_CLOSURE_PATH;
  // CAPA 계획 등록 대상에서 들어온 경우: CAPA 계획 등록 / CAPA 불필요 액션을 노출합니다.
  const fromCapaRegister = fromParam === CAPA_REGISTER_PATH;
  // 부적합 정보 아코디언과 부적합 조회는 부적합 맥락(목록/종결/CAPA 대상) 모두에서 필요합니다.
  const isNonconformityContext =
    fromNonconformity || fromMinorClosure || fromCapaRegister;

  // 판정 화면에서 보여줄, 검토 단계에서 저장된 AI 소견.
  const { data: judgmentTarget } = useNonconformityTarget(
    fromJudgment ? String(event.id) : undefined
  );
  // 부적합 상세 액션 대상.
  const { data: nonconformity } = useNonconformityByEvent(
    isNonconformityContext ? String(event.id) : undefined
  );
  // 단순조치(종결 대상 상세의 조치 등록/수정/완료).
  const { data: simpleAction } = useSimpleAction(
    fromMinorClosure ? nonconformity?.id : undefined
  );
  const actionStatus = simpleAction?.status ?? "none";
  // 조치가 끝난 것으로 볼 조건: 조치 완료거나, 부적합이 이미 종료된 경우.
  // (조치 쿼리 로딩/누락으로 actionStatus가 잠깐 "none"이 되어도 종료 건엔
  //  조치 등록이 뜨지 않게 합니다.)
  const actionDone =
    actionStatus === "completed" || nonconformity?.statusCode === "closed";
  // 조치 대상 정보가 아직 로딩 중이면 액션 버튼을 성급히 노출하지 않습니다.
  const actionReady = !fromMinorClosure || Boolean(nonconformity);
  // CAPA 판정 액션 숨김: 이미 CAPA 판정이 끝났거나 무효 처리된 부적합.
  const capaJudged = Boolean(nonconformity?.capaVerdict);
  const capaActionHidden =
    capaJudged || nonconformity?.statusCode === "invalid";

  /**
   * PDF를 한 번만 렌더링해 뷰어와 다운로드가 같은 blob을 공유합니다.
   *
   * PDFViewer/PDFDownloadLink를 각각 쓰면 (1) 문서를 두 번 렌더링하고,
   * (2) PDFDownloadLink를 메뉴 안에 두면 메뉴를 열 때마다 마운트되며 PDF가
   * 재생성됩니다. usePDF로 직접 렌더링하면 event가 바뀔 때만 다시 만들어집니다.
   */
  const pdfDocument = useMemo(
    () => <QualityEventPdf event={event} />,
    [event]
  );
  const [pdfInstance, updatePdf] = usePDF({ document: pdfDocument });

  // 다른 이벤트로 이동하면(같은 라우트라 컴포넌트는 유지) 문서를 갱신합니다.
  useEffect(() => {
    updatePdf(pdfDocument);
  }, [pdfDocument, updatePdf]);

  const pdfFileName = `${event.eventNumber}_${event.title}.pdf`;

  // 역할별 액션 노출 조건. 판정 규칙은 queries.ts에 모여 있습니다.
  const canWithdraw = isMyQualityEvent(event);
  // 내가 이미 검토를 남겼으면(검토 완료·부적합 판정 요청·반려 무엇이든) 검토 버튼을 감춥니다.
  // 다시 노출되는 유일한 조건은 내 검토 이력(댓글)을 삭제(검토 취소)할 때입니다.
  const hasMyReview = Boolean(
    reviewRecords?.some((record) => record.reviewer === currentUser.name)
  );
  const canReview = isMyReviewPending(event) && !hasMyReview;

  // TODO: 아래 핸들러들은 실제 API 연동 지점입니다.
  // 검토/반려/부적합은 사유(reason)를 API로 전송하고, 처리 후
  // qualityEventKeys.detail(id) / .myReview() 를 무효화해야
  // 목록과 사이드바 배지가 함께 갱신됩니다. toast는 ReviewDialog에서 띄웁니다.

  // 회수: 확인 다이얼로그에서 승인 시 실행.
  function handleWithdrawConfirm() {
    setWithdrawOpen(false);
    toast.add({
      title: "회수 완료",
      description: `${event.eventNumber} 이벤트를 회수했습니다.`,
      type: "success",
    });
  }

  // 부적합 판정: 확정 시 부적합 목록으로 이관하고, 판정 대상에서는 제거합니다.
  // 불인정 시에는 판정 대상에서만 제거합니다. toast는 JudgmentDialog에서 띄웁니다.
  function handleJudgmentConfirm(result: JudgmentResult, reason: string) {
    if (result === "confirmed") {
      addNonconformity({
        event,
        statusCode: "open",
        confirmedBy: currentUser.name,
        confirmedAtLabel: formatDateTime(new Date()),
        reason,
        aiAssessment: judgmentTarget?.aiAssessment,
      });
    }

    removeJudgmentTarget(event.id);
    queryClient.invalidateQueries({ queryKey: nonconformityKeys.all });
    setJudgmentOpen(false);
  }

  // 부적합 무효: 목록에서 제거하지 않고 상태를 "무효"로 전이합니다(이력 보존).
  // toast는 다이얼로그에서 띄웁니다.
  function handleInvalidateConfirm() {
    if (nonconformity) setNonconformityStatus(nonconformity.id, "invalid");
    queryClient.invalidateQueries({ queryKey: nonconformityKeys.all });
    setInvalidateOpen(false);
  }

  // CAPA 판정: 결과를 부적합에 기록하고, "필요" 시 CAPA 계획 등록 대상으로 이관합니다.
  // CAPA 진행 여부는 상태가 아니라 CAPA 판정(capaVerdict)으로 표현하므로
  // 부적합 상태(진행 중)는 그대로 둡니다.
  function handleCapaConfirm(result: CapaJudgmentResult, reason: string) {
    if (nonconformity) {
      const judgedAtLabel = formatDateTime(new Date());
      // 결과와 무관하게 판정 내역을 부적합에 기록 → 상세의 부적합 정보/목록에 노출.
      recordCapaJudgment(nonconformity.id, {
        verdict: result,
        reason,
        judgedBy: currentUser.name,
        judgedAtLabel,
      });

      if (result === "required") {
        addCapaTarget({
          nonconformity: {
            ...nonconformity,
            capaVerdict: result,
            capaReason: reason,
            capaJudgedBy: currentUser.name,
            capaJudgedAtLabel: judgedAtLabel,
          },
          reason,
          judgedBy: currentUser.name,
          judgedAtLabel,
        });
        queryClient.invalidateQueries({ queryKey: capaKeys.all });
      }
    }
    queryClient.invalidateQueries({ queryKey: nonconformityKeys.all });
    setCapaOpen(false);
  }

  // 단순조치 등록/수정: 담당자·기한·계획을 저장하면 상태가 조치중이 됩니다.
  function handleActionRegister(input: SimpleActionInput) {
    if (nonconformity) {
      registerAction({ ncId: nonconformity.id, ...input });
      queryClient.invalidateQueries({ queryKey: actionKeys.all });
    }
    setActionRegisterOpen(false);
  }

  // 조치 완료: 결과·완료일·내용을 기록하고, 해당 부적합/품질 이벤트를 종료합니다.
  function handleActionComplete(input: ActionCompleteInput) {
    if (nonconformity) {
      completeAction(nonconformity.id, input);
      setNonconformityStatus(nonconformity.id, "closed");
      queryClient.invalidateQueries({ queryKey: actionKeys.all });
      queryClient.invalidateQueries({ queryKey: nonconformityKeys.all });
    }
    setActionCompleteOpen(false);
  }

  // CAPA 계획 등록: 계획을 저장하고 CAPA 계획 등록 대상에서 제거(진행 현황으로 이관).
  function handleCapaPlanRegister(plan: CapaPlanInput) {
    if (nonconformity) {
      const nowLabel = formatDateTime(new Date());
      addCapaPlan({
        ncId: nonconformity.id,
        ncNumber: nonconformity.ncNumber,
        eventNumber: nonconformity.event.eventNumber,
        eventId: nonconformity.event.id,
        registrant: currentUser.name,
        startDateLabel: nowLabel.slice(0, 10),
        ...plan,
        createdAtLabel: nowLabel,
      });
      removeCapaTarget(nonconformity.id);
      queryClient.invalidateQueries({ queryKey: capaKeys.all });
    }
    setCapaPlanOpen(false);
    navigate(-1);
  }

  // CAPA 불필요: CAPA 판정을 "불필요(minor)"로 바꾸고 등록 대상에서 제거합니다.
  // 해당 부적합은 경미 부적합/단순조치 종결 대상으로 이동합니다.
  function handleCapaNotNeeded(reason: string) {
    if (nonconformity) {
      recordCapaJudgment(nonconformity.id, {
        verdict: "minor",
        reason,
        judgedBy: currentUser.name,
        judgedAtLabel: formatDateTime(new Date()),
      });
      removeCapaTarget(nonconformity.id);
      queryClient.invalidateQueries({ queryKey: capaKeys.all });
      queryClient.invalidateQueries({ queryKey: nonconformityKeys.all });
      queryClient.invalidateQueries({ queryKey: actionKeys.all });
    }
    setCapaNotNeededOpen(false);
    navigate(-1);
  }

  // 결정 + 사유 + 당시 AI 소견을 이력에 기록하고 상세 화면을 갱신합니다.
  function commitReview(
    decision: ReviewDecision,
    reason: string,
    createdAtLabel: string,
    ai: AiReviewAssessment | null
  ) {
    addReviewRecord(String(event.id), {
      decision,
      reason,
      reviewer: currentUser.name,
      createdAtLabel,
      aiVerdict: ai?.verdict,
      aiSummary: ai?.summary,
    });
    queryClient.invalidateQueries({
      queryKey: qualityEventKeys.reviews(String(event.id)),
    });

    // 검토를 마쳤으면(결정 종류와 무관) 내 검토 완료로 표시합니다.
    // → 검토 버튼이 사라지고, 내 검토 대상 목록·사이드바 배지에서도 빠집니다.
    setReviewerReviewed(event.id, currentUser.name, true);
    queryClient.invalidateQueries({
      queryKey: qualityEventKeys.detail(String(event.id)),
    });
    queryClient.invalidateQueries({ queryKey: qualityEventKeys.list() });
    queryClient.invalidateQueries({ queryKey: qualityEventKeys.myReview() });

    // 부적합 판정 요청은 부적합 관리의 "부적합 판정 대상"으로 이관합니다.
    if (decision === "nonconformity") {
      addNonconformityTarget({
        event,
        requestedBy: currentUser.name,
        requestedAtLabel: createdAtLabel,
        reason,
        aiAssessment: ai ?? undefined,
      });
      queryClient.invalidateQueries({
        queryKey: nonconformityKeys.judgmentTargets(),
      });
    }

    setReviewOpen(false);
  }

  function handleReject(reason: string, ai: AiReviewAssessment | null) {
    commitReview("reject", reason, formatDateTime(new Date()), ai);
  }

  function handleRequestNonconformity(
    reason: string,
    ai: AiReviewAssessment | null
  ) {
    commitReview("nonconformity", reason, formatDateTime(new Date()), ai);
  }

  function handleReviewComplete(reason: string, ai: AiReviewAssessment | null) {
    commitReview("complete", reason, formatDateTime(new Date()), ai);
  }

  // 종료(3)·반려(4)된 이벤트는 검토 이력을 수정·삭제할 수 없습니다(확정 기록).
  const reviewsLocked = event.status === 3 || event.status === 4;

  // 검토 이력(댓글) 수정: 사유만 갱신합니다.
  function handleReviewEdit(recordId: string, reason: string) {
    updateReviewRecord(String(event.id), recordId, reason);
    queryClient.invalidateQueries({
      queryKey: qualityEventKeys.reviews(String(event.id)),
    });
  }

  // 검토 이력 삭제 = 검토 취소. 이력을 지우고 검토자의 검토 완료 표시를 되돌립니다.
  // 부적합 판정 요청이었다면 부적합 판정 대상에서도 함께 제거합니다.
  function handleReviewDelete(recordId: string) {
    const removed = deleteReviewRecord(String(event.id), recordId);
    if (removed?.decision === "nonconformity") {
      removeJudgmentTarget(event.id);
      queryClient.invalidateQueries({
        queryKey: nonconformityKeys.judgmentTargets(),
      });
    }
    if (removed) setReviewerReviewed(event.id, removed.reviewer, false);

    queryClient.invalidateQueries({
      queryKey: qualityEventKeys.reviews(String(event.id)),
    });
    queryClient.invalidateQueries({
      queryKey: qualityEventKeys.detail(String(event.id)),
    });
    queryClient.invalidateQueries({ queryKey: qualityEventKeys.list() });
    queryClient.invalidateQueries({ queryKey: qualityEventKeys.myReview() });
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4">
      {/* 헤더 */}
      <div className="flex shrink-0 flex-col gap-3">
        {/* 목록으로 (상단) */}
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

        {/* 이벤트 정보 + 역할별 액션 (하단 정렬) */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{event.eventNumber}</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {event.title}
            </h2>
          </div>

          {/* 모든 액션을 한 메뉴로 모아 제목 줄을 비워 둡니다. */}
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
              {/*
                출처에 따라 주 액션이 달라집니다.
                - 부적합 목록: 부적합 무효(모두 노출) + CAPA 판정
                - 부적합 판정 대상: 부적합 판정
                - 그 외(품질 이벤트/내 검토 대상): 검토
              */}
              {fromNonconformity ? (
                <>
                  {/* CAPA 판정이 끝났거나 무효 처리된 문서에서는 CAPA 판정 액션을 숨깁니다. */}
                  {!capaActionHidden && (
                    <DropdownMenuItem onClick={() => setCapaOpen(true)}>
                      <ShieldCheckIcon />
                      CAPA 판정
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setInvalidateOpen(true)}
                  >
                    <BanIcon />
                    부적합 무효
                  </DropdownMenuItem>
                </>
              ) : fromMinorClosure ? (
                // 종결 대상: 조치 상태에 따라 등록 / 수정+완료를 노출합니다.
                // 완료·종료된 건이나 로딩 중에는 조치 등록을 노출하지 않습니다.
                !actionReady || actionDone ? null : actionStatus ===
                  "in_progress" ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => setActionRegisterOpen(true)}
                    >
                      <PencilIcon />
                      조치 수정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setActionCompleteOpen(true)}
                    >
                      <CheckIcon />
                      조치 완료
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setActionRegisterOpen(true)}
                  >
                    <ClipboardListIcon />
                    조치 등록
                  </DropdownMenuItem>
                )
              ) : fromCapaRegister ? (
                <>
                  <DropdownMenuItem onClick={() => setCapaPlanOpen(true)}>
                    <ClipboardListIcon />
                    CAPA 계획 등록
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setCapaNotNeededOpen(true)}
                  >
                    <BanIcon />
                    CAPA 불필요
                  </DropdownMenuItem>
                </>
              ) : fromJudgment ? (
                <DropdownMenuItem onClick={() => setJudgmentOpen(true)}>
                  <GavelIcon />
                  부적합 판정
                </DropdownMenuItem>
              ) : (
                canReview && (
                  <DropdownMenuItem onClick={() => setReviewOpen(true)}>
                    <ClipboardCheckIcon />
                    검토
                  </DropdownMenuItem>
                )
              )}

              {/* 회수는 부적합 맥락(목록/종결 대상)에서는 노출하지 않습니다. */}
              {!isNonconformityContext && canWithdraw && (
                <DropdownMenuItem onClick={() => setWithdrawOpen(true)}>
                  <Undo2Icon />
                  회수
                </DropdownMenuItem>
              )}

              {/* 워크플로 액션과 유틸리티를 구분. 액션이 없으면 구분선도 생략합니다. */}
              {(fromNonconformity ||
                fromJudgment ||
                fromCapaRegister ||
                (fromMinorClosure && actionReady && !actionDone) ||
                canReview ||
                canWithdraw) && <DropdownMenuSeparator />}

              {/* 조치 정보 보기 — 종결 대상에서 조치가 있을 때(조치중/조치 완료) */}
              {fromMinorClosure && simpleAction && (
                <DropdownMenuItem onClick={() => setActionInfoOpen(true)}>
                  <CircleAlertIcon />
                  조치 정보
                </DropdownMenuItem>
              )}

              {/*
                미리 만들어 둔 blob URL을 쓰는 단순 anchor라, 메뉴를 열어도
                PDF를 다시 만들지 않습니다. 생성 전에는 비활성화합니다.
              */}
              <DropdownMenuItem
                disabled={!pdfInstance.url}
                render={
                  <a
                    href={pdfInstance.url ?? undefined}
                    download={pdfFileName}
                  />
                }
              >
                <DownloadIcon />
                {pdfInstance.loading ? "PDF 생성 중…" : "PDF 다운로드"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 부적합 정보 — 부적합 목록에서 진입했을 때 PDF 뷰어 위에 노출 */}
      {isNonconformityContext && nonconformity && (
        <NonconformityInfo nonconformity={nonconformity} />
      )}

      {/* 문서 내용 (PDF 뷰어) — 남는 공간을 채워 페이지 스크롤 방지 */}
      {pdfInstance.url ? (
        <iframe
          // toolbar=1: 브라우저 내장 뷰어의 확대/인쇄 등 도구 노출
          src={`${pdfInstance.url}#toolbar=1`}
          title={`${event.eventNumber} 문서`}
          className="min-h-0 w-full flex-1 rounded-lg border bg-card"
        />
      ) : (
        <div className="flex min-h-0 w-full flex-1 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
          {pdfInstance.error
            ? "문서를 생성하지 못했습니다."
            : "문서를 불러오는 중…"}
        </div>
      )}

      {/* 첨부파일 (뷰어 아래, 컴팩트) */}
      {event.files?.length ? (
        <div className="shrink-0">
          <p className="mb-2 text-sm font-medium">
            첨부파일 ({event.files.length})
          </p>
          <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto">
            {event.files.map((file) => (
              <a
                key={file.id}
                href={file.url}
                download
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="max-w-[220px] truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </span>
                <DownloadIcon className="size-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {/* 검토 이력 (댓글) — 첨부파일 아래. 검토 결정과 사유가 댓글로 남습니다.
          본인 검토는 수정·삭제(=검토 취소) 가능, 종료·반려 이벤트는 잠깁니다. */}
      {reviewRecords && reviewRecords.length > 0 && (
        <ReviewComments
          records={reviewRecords}
          locked={reviewsLocked}
          currentUserName={currentUser.name}
          onEdit={handleReviewEdit}
          onDelete={handleReviewDelete}
        />
      )}

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        event={event}
        onComplete={handleReviewComplete}
        onRequestNonconformity={handleRequestNonconformity}
        onReject={handleReject}
      />

      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        eventNumber={event.eventNumber}
        onConfirm={handleWithdrawConfirm}
      />

      <JudgmentDialog
        open={judgmentOpen}
        onOpenChange={setJudgmentOpen}
        eventNumber={event.eventNumber}
        assessment={judgmentTarget?.aiAssessment ?? null}
        onConfirm={handleJudgmentConfirm}
      />

      <InvalidateDialog
        open={invalidateOpen}
        onOpenChange={setInvalidateOpen}
        ncNumber={nonconformity?.ncNumber ?? event.eventNumber}
        onConfirm={handleInvalidateConfirm}
      />

      <CapaJudgmentDialog
        open={capaOpen}
        onOpenChange={setCapaOpen}
        ncNumber={nonconformity?.ncNumber ?? event.eventNumber}
        event={event}
        onConfirm={handleCapaConfirm}
      />

      <SimpleActionDialog
        open={actionRegisterOpen}
        onOpenChange={setActionRegisterOpen}
        event={event}
        initial={
          simpleAction
            ? {
                assignee: simpleAction.assignee,
                dueDateLabel: simpleAction.dueDateLabel,
                plan: simpleAction.plan,
              }
            : null
        }
        onSubmit={handleActionRegister}
      />

      <ActionCompleteDialog
        open={actionCompleteOpen}
        onOpenChange={setActionCompleteOpen}
        onConfirm={handleActionComplete}
      />

      {simpleAction && (
        <ActionInfo
          open={actionInfoOpen}
          onOpenChange={setActionInfoOpen}
          action={simpleAction}
        />
      )}

      <CapaPlanDialog
        open={capaPlanOpen}
        onOpenChange={setCapaPlanOpen}
        event={event}
        onConfirm={handleCapaPlanRegister}
      />

      <CapaNotNeededDialog
        open={capaNotNeededOpen}
        onOpenChange={setCapaNotNeededOpen}
        ncNumber={nonconformity?.ncNumber ?? event.eventNumber}
        onConfirm={handleCapaNotNeeded}
      />
    </div>
  );
}
