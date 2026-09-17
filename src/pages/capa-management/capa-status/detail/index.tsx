import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePDF } from "@react-pdf/renderer";
import {
  ArrowLeftIcon,
  CheckIcon,
  CircleCheckIcon,
  ClipboardListIcon,
  DownloadIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { currentUser } from "@/mock/currentUser";
import { QUALITY_EVENT_FROM_PARAM } from "../../../quailty-event/paths";
import { qualityEventKeys } from "../../../quailty-event/queries";
import {
  NONCONFORMITY_LIST_PATH,
  NONCONFORMITY_STATUS_NAME,
} from "../../../nonconformity-management/queries";
import {
  addCapaAction,
  capaKeys,
  closeCapa,
  completeCapaAction,
  completeEffectivenessVerification,
  rerunRootCause,
  CAPA_ACTION_PRIORITY_NAME,
  CAPA_PLAN_TYPE_NAME,
  CAPA_STATUS_CLASS,
  CAPA_STATUS_NAME,
  EFFECTIVENESS_RESULT_NAME,
  RCA_METHOD_NAME,
  registerRootCause,
  startEffectivenessVerification,
  updateRootCause,
  useCapaDetail,
  type CapaActionRecord,
  type CapaDetail,
  type CapaStatus,
} from "../../queries";
import CapaPdf from "./CapaPdf";
import RootCauseDialog, { type RootCauseInput } from "./RootCauseDialog";
import ActionPlanDialog, { type ActionPlanInput } from "./ActionPlanDialog";
import ActionCompleteDialog, {
  type ActionCompleteInput,
} from "./ActionCompleteDialog";
import EffectivenessVerifyDialog, {
  type EffectivenessVerifyInput,
} from "./EffectivenessVerifyDialog";
import EffectivenessCompleteDialog, {
  type EffectivenessCompleteInput,
} from "./EffectivenessCompleteDialog";
import CapaCloseDialog from "./CapaCloseDialog";

const EVENT_TYPE_LABEL: Record<string, string> = {
  INTERNAL_ISSUE: "내부 이슈",
  PROCESS_DEVIATION: "프로세스 이탈",
  AUDIT_ISSUE: "심사 이슈",
  PRODUCT_SERVICE_DEFECT: "제품/서비스 결함",
  SUPPLIER_ISSUE: "공급업체 이슈",
  CUSTOMER_COMPLAINT: "고객 불만",
  IMPROVEMENT_OPPORTUNITY: "개선 기회",
  ETC: "기타",
};

const SEVERITY_LABEL: Record<string, string> = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

const NC_STATUS_CLASS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  closed:
    "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  invalid: "bg-zinc-100 text-zinc-500 dark:bg-zinc-400/15 dark:text-zinc-400",
};

/** 단계별 진행 요약의 5단계 이름. */
const STAGE_LABELS = [
  "CAPA 계획",
  "원인분석",
  "시정/예방조치",
  "효과성 검증",
  "CAPA 종료",
];

/** 진행 이력 계산용 상태 순서(취소 제외). */
const PROGRESS_ORDER: CapaStatus[] = [
  "root_cause_pending",
  "root_cause_done",
  "in_action",
  "effectiveness_pending",
  "effectiveness_ongoing",
  "effectiveness_done",
  "closed",
];

type StageStatus = "완료" | "진행중" | "대기" | "취소";
type StageItem = {
  name: string;
  status: StageStatus;
  owner?: string;
  completedAt?: string;
};

/** 단계 원 색: 완료=초록 채움, 진행중=파랑 채움, 대기=흰 테두리, 취소=빨강 채움. */
const STEP_CIRCLE_CLASS: Record<StageStatus, string> = {
  완료: "border-green-600 bg-green-600 text-white",
  진행중: "border-blue-600 bg-blue-600 text-white",
  대기: "border-muted-foreground/30 bg-background text-muted-foreground",
  취소: "border-red-600 bg-red-600 text-white",
};

/** 단계 상태 텍스트 색. */
const STEP_TEXT_CLASS: Record<StageStatus, string> = {
  완료: "text-green-700 dark:text-green-400",
  진행중: "text-blue-700 dark:text-blue-400",
  대기: "text-muted-foreground",
  취소: "text-red-700 dark:text-red-400",
};

/** 각 단계가 "완료"로 넘어가는 기준 상태(도달 시 완료). stage0(계획)은 별도 처리. */
const STAGE_DONE_STATUS: (CapaStatus | null)[] = [
  null,
  "root_cause_done",
  "effectiveness_pending",
  "effectiveness_done",
  "closed",
];

/**
 * CAPA 상태별 작업(⋯) 메뉴 액션. PDF 다운로드는 상태와 무관하게 항상 노출됩니다.
 * 종료·취소는 추가 액션이 없습니다.
 */
const CAPA_ACTIONS: Record<CapaStatus, { label: string; icon: LucideIcon }[]> = {
  root_cause_pending: [{ label: "원인분석 등록", icon: SearchIcon }],
  root_cause_done: [
    { label: "원인분석 수정", icon: PencilIcon },
    { label: "시정/예방조치 등록", icon: ClipboardListIcon },
  ],
  in_action: [{ label: "시정/예방조치 추가", icon: PlusIcon }],
  effectiveness_pending: [{ label: "효과성 검증", icon: ShieldCheckIcon }],
  effectiveness_ongoing: [{ label: "효과성 검증 결과 등록", icon: CheckIcon }],
  // 효과성 검증 완료는 검증 결과에 따라 액션이 달라지므로 컴포넌트에서 동적으로 정합니다.
  effectiveness_done: [],
  closed: [],
  cancelled: [],
};

/** 효과성 검증 완료 + 효과있음: CAPA 종료. */
const CAPA_DONE_EFFECTIVE_ACTIONS: { label: string; icon: LucideIcon }[] = [
  { label: "CAPA 종료", icon: CircleCheckIcon },
];
/** 효과성 검증 완료 + 효과없음: 추가조치 등록 / 원인분석 재수행. */
const CAPA_DONE_INEFFECTIVE_ACTIONS: { label: string; icon: LucideIcon }[] = [
  { label: "추가조치 등록", icon: PlusIcon },
  { label: "원인분석 재수행", icon: RotateCcwIcon },
];

/** 상태 → 현재 단계 인덱스(0계획·1원인분석·2조치·3효과성·4종료)와 현재 단계 표시 텍스트. */
function stageInfo(status: CapaStatus): {
  currentIndex: number;
  currentText: string;
  cancelled: boolean;
} {
  switch (status) {
    case "root_cause_pending":
      return { currentIndex: 1, currentText: "대기", cancelled: false };
    case "root_cause_done":
      return { currentIndex: 2, currentText: "대기", cancelled: false };
    case "in_action":
      return { currentIndex: 2, currentText: "진행중", cancelled: false };
    case "effectiveness_pending":
      return { currentIndex: 3, currentText: "대기", cancelled: false };
    case "effectiveness_ongoing":
      return { currentIndex: 3, currentText: "진행중", cancelled: false };
    case "effectiveness_done":
      return { currentIndex: 4, currentText: "대기", cancelled: false };
    case "closed":
      return { currentIndex: 5, currentText: "완료", cancelled: false };
    case "cancelled":
      return { currentIndex: 1, currentText: "취소", cancelled: true };
  }
}

/** i번째 단계의 상태 라벨(완료/진행중/대기/취소). */
function stageStatusLabel(
  i: number,
  info: { currentIndex: number; currentText: string; cancelled: boolean }
): StageStatus {
  if (info.cancelled) {
    if (i === 0) return "완료";
    if (i === STAGE_LABELS.length - 1) return "취소";
    return "대기";
  }
  if (i < info.currentIndex) return "완료";
  if (i === info.currentIndex) return info.currentText as StageStatus;
  return "대기";
}

/** 완료된 단계의 담당자·완료일을 처리 이력에서 찾아 붙입니다. */
function stageMetaFromHistory(
  i: number,
  history: HistoryRow[]
): { owner?: string; completedAt?: string } {
  const to = STAGE_DONE_STATUS[i];
  if (!to) return {};
  const row = history.find((h) => h.to === to);
  return row ? { owner: row.by, completedAt: row.atLabel.slice(0, 10) } : {};
}

/** 현재 시각을 yyyy-MM-dd HH:mm 로 반환. */
function nowLabel(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** yyyy-MM-dd(HH:mm) 라벨에 일수를 더해 yyyy-MM-dd 로 반환. 실패 시 원본. */
function addDaysLabel(label: string, days: number): string {
  const [y, m, d] = label.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return label;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/** 조치 기한이 지났는지(오늘 > 기한). yyyy-MM-dd 기준. */
function isOverdue(dueDateLabel: string): boolean {
  const [y, m, d] = dueDateLabel.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return false;
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() > due.getTime();
}

/** 시정/예방조치 현황 요약(전체·완료·진행중·지연). */
function ActionSummary({ actions }: { actions: CapaActionRecord[] }) {
  const total = actions.length;
  const done = actions.filter((a) => a.status === "completed").length;
  const inProgress = actions.filter((a) => a.status === "in_progress").length;
  // 지연: 완료되지 않았고 기한이 지난 조치.
  const delayed = actions.filter(
    (a) => a.status !== "completed" && isOverdue(a.dueDateLabel)
  ).length;

  // 상태별 색을 채운 알약(라벨 + 개수) 형태로 표시합니다.
  const pill = (label: string, count: number, colorClass: string) => (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        colorClass
      )}
    >
      {label}
      <span className="font-semibold">{count}</span>
    </span>
  );

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {pill(
        "전체",
        total,
        "bg-zinc-100 text-zinc-700 dark:bg-zinc-400/15 dark:text-zinc-300"
      )}
      {pill(
        "완료",
        done,
        "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300"
      )}
      {pill(
        "진행중",
        inProgress,
        "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300"
      )}
      {pill(
        "지연",
        delayed,
        "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300"
      )}
    </div>
  );
}

/** 라벨 + 값 한 칸. */
function InfoField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

/** 제목 + (선택)액션이 있는 카드. id로 바로가기 앵커를 지정합니다. */
function Card({
  id,
  title,
  action,
  children,
}: {
  id?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function CapaStatusDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, isPending, isError, error } = useCapaDetail(id);

  if (isPending || isError || !data) {
    const message = isPending
      ? "불러오는 중…"
      : isError
        ? `CAPA를 불러오지 못했습니다. ${error.message}`
        : "해당 CAPA를 찾을 수 없습니다.";
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <p
          className={cn(
            "text-sm",
            isError ? "text-destructive" : "text-muted-foreground"
          )}
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

  return <CapaDetailContent detail={data} />;
}

/**
 * 본문을 분리한 이유: data가 확정된 뒤에 훅(usePDF 등)을 선언해야
 * 조건부 early return 위에서 훅을 쓰지 않게 됩니다.
 */
function CapaDetailContent({ detail }: { detail: CapaDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rootCauseOpen, setRootCauseOpen] = useState(false);
  const [rootCauseMode, setRootCauseMode] = useState<"register" | "edit">(
    "register"
  );
  const [actionOpen, setActionOpen] = useState(false);
  const [completeIndex, setCompleteIndex] = useState<number | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyCompleteOpen, setVerifyCompleteOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [rerunOpen, setRerunOpen] = useState(false);
  const [activeCard, setActiveCard] = useState("");
  const { plan, delayed, nonconformity } = detail;
  const nc = nonconformity;
  const event = nc?.event;
  const info = stageInfo(plan.status);

  // 처리 이력(상태 진행에 따라 구성). 단계 메타(담당자·완료일) 계산에도 사용합니다.
  const history = buildHistory(plan.status, {
    registeredAt: plan.createdAtLabel,
    registrant: plan.registrant,
    assignee: plan.assignee,
    closure: plan.closure,
  });

  // 단계별 진행 스텝(이름·상태·담당자·완료일).
  const stages: StageItem[] = STAGE_LABELS.map((name, i) => {
    const status = stageStatusLabel(i, info);
    // CAPA 계획 단계는 등록자·시작일, 그 외 완료 단계는 이력에서 담당자·완료일을 붙입니다.
    const meta =
      i === 0
        ? { owner: plan.registrant, completedAt: plan.startDateLabel }
        : status === "완료"
          ? stageMetaFromHistory(i, history)
          : {};
    return { name, status, ...meta };
  });

  // PDF: CAPA 보고서를 한 번만 렌더링해 다운로드 링크로 사용합니다.
  // 단계·이력을 memo 내부에서 재계산해, plan/nc가 바뀔 때만 문서를 다시 만듭니다.
  const pdfDocument = useMemo(() => {
    const memoInfo = stageInfo(plan.status);
    const memoHistory = buildHistory(plan.status, {
      registeredAt: plan.createdAtLabel,
      registrant: plan.registrant,
      assignee: plan.assignee,
      closure: plan.closure,
    });
    const pdfStages = STAGE_LABELS.map((name, i) => {
      const status = stageStatusLabel(i, memoInfo);
      const meta =
        i === 0
          ? { owner: plan.registrant, completedAt: plan.startDateLabel }
          : status === "완료"
            ? stageMetaFromHistory(i, memoHistory)
            : {};
      return { name, status, ...meta };
    });
    const rows = memoHistory.map((h) => ({
      atLabel: h.atLabel,
      by: h.by,
      kind: h.kind,
      from: h.from ? CAPA_STATUS_NAME[h.from] : "-",
      to: CAPA_STATUS_NAME[h.to],
      note: h.note,
    }));
    return (
      <CapaPdf
        plan={plan}
        delayed={delayed}
        nonconformity={nc}
        stages={pdfStages}
        history={rows}
      />
    );
  }, [plan, delayed, nc]);
  const [pdfInstance, updatePdf] = usePDF({ document: pdfDocument });
  useEffect(() => {
    updatePdf(pdfDocument);
  }, [pdfDocument, updatePdf]);
  const pdfFileName = `${plan.capaNumber}_${plan.title}.pdf`;

  // 상태별 작업 액션(PDF 다운로드는 항상 별도로 노출).
  // 효과성 검증 완료는 결과(효과있음/없음)에 따라 액션이 달라집니다.
  const actions =
    plan.status === "effectiveness_done"
      ? plan.effectiveness?.result === "effective"
        ? CAPA_DONE_EFFECTIVE_ACTIONS
        : CAPA_DONE_INEFFECTIVE_ACTIONS
      : CAPA_ACTIONS[plan.status];

  // 액션 라우팅: 다이얼로그를 여는 액션과 아직 준비 중인 액션을 구분합니다.
  const handleCapaAction = (label: string) => {
    if (label === "원인분석 등록") {
      setRootCauseMode("register");
      setRootCauseOpen(true);
      return;
    }
    if (label === "원인분석 수정") {
      setRootCauseMode("edit");
      setRootCauseOpen(true);
      return;
    }
    if (
      label === "시정/예방조치 등록" ||
      label === "시정/예방조치 추가" ||
      label === "추가조치 등록"
    ) {
      setActionOpen(true);
      return;
    }
    if (label === "효과성 검증") {
      setVerifyOpen(true);
      return;
    }
    if (label === "효과성 검증 결과 등록") {
      setVerifyCompleteOpen(true);
      return;
    }
    if (label === "CAPA 종료") {
      setCloseOpen(true);
      return;
    }
    if (label === "원인분석 재수행") {
      setRerunOpen(true);
      return;
    }
    // TODO: 나머지 액션도 각 다이얼로그와 상태 전이를 연동할 지점.
    toast.add({
      title: label,
      description: `'${label}' 기능은 준비 중입니다.`,
      type: "info",
    });
  };

  // 원인분석 등록/수정. 등록이면 상태를 원인분석 완료로 전이, 수정이면 결과만 갱신.
  function handleRootCauseSubmit(input: RootCauseInput) {
    const record = {
      method: input.method,
      directCause: input.directCause,
      rootCause: input.rootCause,
      content: input.content,
      analyst: currentUser.name,
      analyzedAtLabel: nowLabel(),
      // 수정 시 파일 미첨부면 기존 첨부명을 유지합니다(모의 데이터 한계).
      fileNames: input.files.length
        ? input.files.map((f) => f.name)
        : (plan.rca?.fileNames ?? []),
    };
    if (rootCauseMode === "edit") {
      updateRootCause(plan.ncId, record);
    } else {
      registerRootCause(plan.ncId, record);
    }
    queryClient.invalidateQueries({ queryKey: capaKeys.all });
    setRootCauseOpen(false);
    toast.add({
      title: rootCauseMode === "edit" ? "원인분석 수정" : "원인분석 등록",
      description:
        rootCauseMode === "edit"
          ? "원인분석을 수정했습니다."
          : "원인분석을 등록했습니다. 상태가 원인분석 완료로 변경되었습니다.",
      type: "success",
    });
  }

  // 시정/예방조치 등록: 조치를 추가하고 상태를 조치중으로 전이합니다.
  function handleActionSubmit(input: ActionPlanInput) {
    addCapaAction(plan.ncId, {
      type: input.type,
      title: input.title,
      content: input.content,
      department: input.department,
      assignee: input.assignee,
      dueDateLabel: input.dueDateLabel,
      priority: input.priority,
      fileNames: input.files.map((f) => f.name),
      registeredAtLabel: nowLabel(),
      status: "in_progress",
    });
    queryClient.invalidateQueries({ queryKey: capaKeys.all });
    setActionOpen(false);
    toast.add({
      title: "시정/예방조치 등록",
      description: "시정/예방조치를 등록했습니다. 상태가 조치중으로 변경되었습니다.",
      type: "success",
    });
  }

  // 조치 완료 처리: 해당 조치를 완료하고, 모든 조치 완료 시 효과성 검증 대기로 전이합니다.
  function handleActionComplete(input: ActionCompleteInput) {
    if (completeIndex === null) return;
    completeCapaAction(plan.ncId, completeIndex, {
      result: input.result,
      completedDateLabel: input.completedDateLabel,
      actualContent: input.actualContent,
      opinion: input.opinion,
      fileNames: input.files.map((f) => f.name),
    });
    queryClient.invalidateQueries({ queryKey: capaKeys.all });
    setCompleteIndex(null);
    toast.add({
      title: "조치 완료",
      description: "조치를 완료 처리했습니다.",
      type: "success",
    });
  }

  // 효과성 검증 시작: 검증 방법·기준(계획) 저장 + 효과성 검증 중으로 전이.
  function handleVerifyStart(input: EffectivenessVerifyInput) {
    startEffectivenessVerification(plan.ncId, {
      method: input.method,
      criteria: input.criteria,
      fileNames: input.files.map((f) => f.name),
      startedBy: currentUser.name,
      startedAtLabel: nowLabel(),
    });
    queryClient.invalidateQueries({ queryKey: capaKeys.all });
    setVerifyOpen(false);
    toast.add({
      title: "효과성 검증 시작",
      description: "검증 계획을 등록했습니다. 상태가 효과성 검증 중으로 변경되었습니다.",
      type: "success",
    });
  }

  // 효과성 검증 결과 등록: 결과 기록 + 효과성 검증 완료로 전이.
  function handleVerifyComplete(input: EffectivenessCompleteInput) {
    completeEffectivenessVerification(plan.ncId, {
      result: input.result,
      verifiedDateLabel: input.verifiedDateLabel,
      opinion: input.opinion,
      fileNames: input.files.map((f) => f.name),
      verifiedBy: currentUser.name,
    });
    queryClient.invalidateQueries({ queryKey: capaKeys.all });
    setVerifyCompleteOpen(false);
    toast.add({
      title: "효과성 검증 완료",
      description: "효과성 검증 결과를 등록했습니다.",
      type: "success",
    });
  }

  // CAPA 종료: 종료 의견 기록 + 상태를 종료로 전이.
  function handleClose(comment: string) {
    closeCapa(plan.ncId, {
      comment,
      closedAtLabel: nowLabel(),
      closedBy: currentUser.name,
    });
    queryClient.invalidateQueries({ queryKey: capaKeys.all });
    // CAPA 종료로 연결 품질 이벤트도 종료되므로 이벤트 목록/상세를 갱신합니다.
    queryClient.invalidateQueries({ queryKey: qualityEventKeys.all });
    setCloseOpen(false);
    toast.add({
      title: "CAPA 종료",
      description: "CAPA를 종료하고 연결 품질 이벤트도 종료 처리했습니다.",
      type: "success",
    });
  }

  // 원인분석 재수행: 원인분석 대기로 되돌리고 이후 단계를 초기화.
  function handleRerun() {
    rerunRootCause(plan.ncId);
    queryClient.invalidateQueries({ queryKey: capaKeys.all });
    setRerunOpen(false);
    toast.add({
      title: "원인분석 재수행",
      description:
        "상태를 원인분석 대기로 되돌렸습니다. 원인분석부터 다시 진행해 주세요.",
      type: "success",
    });
  }

  // 카드 바로가기 목록(현재 표시되는 카드만). 클릭 시 해당 카드로 스크롤합니다.
  const cardNav = [
    { id: "card-basic", label: "기본 정보", show: true },
    { id: "card-plan", label: "계획 정보", show: true },
    { id: "card-rca", label: "원인분석", show: true },
    {
      id: "card-actions",
      label: "시정/예방조치",
      show: Boolean(plan.actions?.length),
    },
    {
      id: "card-effectiveness",
      label: "효과성 검증",
      show: Boolean(plan.effectiveness),
    },
    { id: "card-closure", label: "CAPA 종료", show: Boolean(plan.closure) },
    { id: "card-nc", label: "연결 부적합", show: Boolean(nc && event) },
    { id: "card-event", label: "연결 이벤트", show: Boolean(event) },
    { id: "card-history", label: "처리 이력", show: true },
  ].filter((c) => c.show);

  const scrollToCard = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  };

  // 스크롤 스파이: 상단 기준선을 지난 마지막 카드를 활성 탭으로 표시합니다.
  // 바닥까지 스크롤되면(더 내릴 수 없으면) 마지막 카드를 활성으로 둡니다.
  const navKey = cardNav.map((c) => c.id).join(",");
  useEffect(() => {
    const ids = navKey ? navKey.split(",") : [];
    if (ids.length === 0) return;

    // 카드의 스크롤 가능한 조상을 찾습니다.
    let scroller: HTMLElement | null = document.getElementById(ids[0])
      ?.parentElement ?? null;
    while (scroller) {
      const s = getComputedStyle(scroller);
      if (
        /(auto|scroll)/.test(s.overflowY) &&
        scroller.scrollHeight > scroller.clientHeight
      )
        break;
      scroller = scroller.parentElement;
    }

    const compute = () => {
      const containerTop = scroller ? scroller.getBoundingClientRect().top : 0;
      // 기준선(컨테이너 상단 + 여유)을 지난 마지막 카드.
      const marker = containerTop + 40;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= marker) current = id;
      }
      setActiveCard(current);
    };

    compute();
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      target.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [navKey]);

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6">
      {/* 본문 컬럼 */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
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

      {/* CAPA 번호 + 제목 헤더 + 작업(⋯) 메뉴 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{plan.capaNumber}</p>
          <h2 className="text-2xl font-semibold tracking-tight">{plan.title}</h2>
        </div>

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
          <DropdownMenuContent align="end" className="w-52">
            {/* 상태별 액션 */}
            {actions.map(({ label, icon: Icon }) => (
              <DropdownMenuItem
                key={label}
                onClick={() => handleCapaAction(label)}
              >
                <Icon />
                {label}
              </DropdownMenuItem>
            ))}
            {actions.length > 0 && <DropdownMenuSeparator />}

            {/* PDF 다운로드 (모든 상태 공통) */}
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

      {/* 단계별 진행 요약 (참고 StageWizard 구조: 원 양쪽 커넥터) */}
      <Card title="단계별 진행 요약">
        <div className="flex">
          {stages.map((stage, index) => {
            const isFirst = index === 0;
            const isLast = index === stages.length - 1;
            const leftActive = !isFirst && stages[index - 1].status === "완료";
            const rightActive = stage.status === "완료";
            const meta = [stage.owner, stage.completedAt]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={stage.name} className="flex flex-1 flex-col items-center">
                {/* 커넥터 + 단계 원 */}
                <div className="flex w-full items-center">
                  <span
                    className={cn(
                      "h-0.5 flex-1",
                      isFirst
                        ? "bg-transparent"
                        : leftActive
                          ? "bg-green-500"
                          : "bg-muted-foreground/20"
                    )}
                  />
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium",
                      STEP_CIRCLE_CLASS[stage.status]
                    )}
                  >
                    {stage.status === "완료" ? (
                      <CheckIcon className="size-4" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      "h-0.5 flex-1",
                      isLast
                        ? "bg-transparent"
                        : rightActive
                          ? "bg-green-500"
                          : "bg-muted-foreground/20"
                    )}
                  />
                </div>

                {/* 단계 정보 */}
                <div className="mt-1.5 px-1 text-center leading-tight">
                  <div className="text-xs font-medium">{stage.name}</div>
                  <span className={cn("text-[11px]", STEP_TEXT_CLASS[stage.status])}>
                    {stage.status}
                  </span>
                  {meta ? (
                    <div className="text-[11px] text-muted-foreground">{meta}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* CAPA 기본 정보 */}
      <Card id="card-basic" title="CAPA 기본 정보">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <InfoField label="CAPA 번호">{plan.capaNumber}</InfoField>
          <InfoField label="CAPA 제목">{plan.title}</InfoField>
          <InfoField label="CAPA 유형">
            {CAPA_PLAN_TYPE_NAME[plan.type]}
          </InfoField>
          <InfoField label="CAPA 상태">
            <Badge variant="secondary" className={CAPA_STATUS_CLASS[plan.status]}>
              {CAPA_STATUS_NAME[plan.status]}
            </Badge>
          </InfoField>
          <InfoField label="계획 시작일">{plan.startDateLabel}</InfoField>
          <InfoField label="계획 완료일">{plan.dueDateLabel}</InfoField>
          <InfoField label="등록자">{plan.registrant}</InfoField>
          <InfoField label="등록일">{plan.createdAtLabel}</InfoField>
          <InfoField label="담당자">{plan.assignee}</InfoField>
          <InfoField label="지연 여부">
            {delayed ? (
              <Badge variant="destructive">지연</Badge>
            ) : (
              <Badge variant="secondary">정상</Badge>
            )}
          </InfoField>
        </div>
      </Card>

      {/* CAPA 계획 정보 */}
      <Card id="card-plan" title="CAPA 계획 정보">
        <div className="flex flex-col gap-4">
          <InfoField label="CAPA 필요 사유">
            <span className="whitespace-pre-line">
              {nc?.capaReason?.trim() || "-"}
            </span>
          </InfoField>
          <InfoField label="CAPA 계획 내용">
            <span className="whitespace-pre-line">
              {plan.content?.trim() || "-"}
            </span>
          </InfoField>
          {plan.files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {plan.files.map((file, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm"
                >
                  <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="max-w-[220px] truncate">{file.name}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              첨부파일이 없습니다.
            </p>
          )}
        </div>
      </Card>

      {/* 원인분석 정보 */}
      <Card id="card-rca" title="원인분석 정보">
        {plan.rca ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <InfoField label="원인분석 방법">
                {RCA_METHOD_NAME[plan.rca.method]}
              </InfoField>
              <InfoField label="분석자">{plan.rca.analyst}</InfoField>
              <InfoField label="직접 원인" className="sm:col-span-2">
                <span className="whitespace-pre-line">
                  {plan.rca.directCause}
                </span>
              </InfoField>
              <InfoField label="근본 원인" className="sm:col-span-2">
                <span className="whitespace-pre-line">
                  {plan.rca.rootCause}
                </span>
              </InfoField>
              <InfoField label="원인분석 내용" className="sm:col-span-2">
                <span className="whitespace-pre-line">{plan.rca.content}</span>
              </InfoField>
              <InfoField label="분석일">{plan.rca.analyzedAtLabel}</InfoField>
            </div>

            {plan.rca.fileNames.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">첨부파일</p>
                <div className="flex flex-wrap gap-2">
                  {plan.rca.fileNames.map((name, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm"
                    >
                      <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="max-w-[240px] truncate">{name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : info.cancelled ? (
          <p className="text-sm text-muted-foreground">
            취소된 CAPA로 원인분석이 진행되지 않았습니다.
          </p>
        ) : info.currentIndex <= 1 ? (
          <p className="text-sm text-muted-foreground">
            아직 원인분석이 등록되지 않았습니다.
          </p>
        ) : (
          <p className="text-sm text-foreground">원인분석이 완료되었습니다.</p>
        )}
      </Card>

      {/* 시정/예방조치 현황 — 등록된 조치가 있을 때만. 항목별로 완료 처리합니다. */}
      {plan.actions && plan.actions.length > 0 && (
        <Card id="card-actions" title="시정/예방조치 현황">
          <ActionSummary actions={plan.actions} />
          <ul className="flex flex-col gap-3">
            {plan.actions.map((action, i) => (
              <li key={i} className="rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      action.status === "completed" ? "secondary" : "default"
                    }
                  >
                    {action.status === "completed" ? "완료" : "진행중"}
                  </Badge>
                  <Badge variant="outline">
                    {CAPA_PLAN_TYPE_NAME[action.type]}
                  </Badge>
                  <span className="text-sm font-medium">{action.title}</span>
                  {/* 완료 처리는 로그인한 사용자 본인이 담당인 조치에서만 가능합니다. */}
                  {action.status === "in_progress" &&
                    action.assignee === currentUser.name && (
                      <Button
                        type="button"
                        size="sm"
                        className="ml-auto"
                        onClick={() => setCompleteIndex(i)}
                      >
                        <CheckIcon />
                        완료 처리
                      </Button>
                    )}
                </div>
                <p className="mt-2 text-sm whitespace-pre-line text-foreground">
                  {action.content}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span>담당: {action.department} · {action.assignee}</span>
                  <span>기한: {action.dueDateLabel}</span>
                  <span>
                    우선순위: {CAPA_ACTION_PRIORITY_NAME[action.priority]}
                  </span>
                  <span>등록: {action.registeredAtLabel}</span>
                </div>

                {/* 완료 정보 */}
                {action.status === "completed" && (
                  <div className="mt-3 flex flex-col gap-2 border-t pt-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span>결과: {action.result ?? "-"}</span>
                      <span>완료일: {action.completedDateLabel ?? "-"}</span>
                    </div>
                    {action.actualContent && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                          실제 조치 내용
                        </span>
                        <p className="text-sm whitespace-pre-line text-foreground">
                          {action.actualContent}
                        </p>
                      </div>
                    )}
                    {action.opinion && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                          완료 의견
                        </span>
                        <p className="text-sm whitespace-pre-line text-foreground">
                          {action.opinion}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 효과성 검증 정보 — 검증이 시작된 경우 */}
      {plan.effectiveness && (
        <Card id="card-effectiveness" title="효과성 검증 정보">
          <div className="flex flex-col gap-4">
            <InfoField label="검증 방법">
              <span className="whitespace-pre-line">
                {plan.effectiveness.method}
              </span>
            </InfoField>
            <InfoField label="검증 기준">
              <span className="whitespace-pre-line">
                {plan.effectiveness.criteria}
              </span>
            </InfoField>

            {plan.effectiveness.result ? (
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 border-t pt-4 sm:grid-cols-2">
                <InfoField label="검증 결과">
                  <Badge
                    variant={
                      plan.effectiveness.result === "effective"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {EFFECTIVENESS_RESULT_NAME[plan.effectiveness.result]}
                  </Badge>
                </InfoField>
                <InfoField label="검증일">
                  {plan.effectiveness.verifiedDateLabel ?? "-"}
                </InfoField>
                <InfoField label="검증자">
                  {plan.effectiveness.verifiedBy ?? "-"}
                </InfoField>
                {plan.effectiveness.opinion ? (
                  <InfoField label="검증 의견" className="sm:col-span-2">
                    <span className="whitespace-pre-line">
                      {plan.effectiveness.opinion}
                    </span>
                  </InfoField>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                검증 진행 중입니다. 검증 결과는 아직 등록되지 않았습니다.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* CAPA 종료 정보 — 종료된 경우 */}
      {plan.closure && (
        <Card id="card-closure" title="CAPA 종료 정보">
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <InfoField label="종료자">{plan.closure.closedBy}</InfoField>
            <InfoField label="종료일시">{plan.closure.closedAtLabel}</InfoField>
            <InfoField label="종료 의견" className="sm:col-span-2">
              <span className="whitespace-pre-line">
                {plan.closure.comment}
              </span>
            </InfoField>
          </div>
        </Card>
      )}

      {/* 연결 부적합 정보 */}
      {nc && event ? (
        <Card
          id="card-nc"
          title="연결 부적합 정보"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  `/quality-events/detail/${event.id}?${QUALITY_EVENT_FROM_PARAM}=${encodeURIComponent(NONCONFORMITY_LIST_PATH)}`
                )
              }
            >
              <ExternalLinkIcon />
              부적합 상세 보기
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <InfoField label="부적합 번호">{nc.ncNumber}</InfoField>
            <InfoField label="부적합 유형">
              {EVENT_TYPE_LABEL[event.eventType] ?? event.eventType}
            </InfoField>
            <InfoField label="부적합 상태">
              <Badge variant="secondary" className={NC_STATUS_CLASS[nc.statusCode]}>
                {NONCONFORMITY_STATUS_NAME[nc.statusCode]}
              </Badge>
            </InfoField>
            <InfoField label="판정자">{nc.confirmedBy}</InfoField>
            <InfoField label="판정일시">{nc.confirmedAtLabel}</InfoField>
            <InfoField label="부적합 사유" className="sm:col-span-2">
              <span className="whitespace-pre-line">
                {nc.reason?.trim() || "-"}
              </span>
            </InfoField>
            <InfoField label="CAPA 판정 사유" className="sm:col-span-2">
              <span className="whitespace-pre-line">
                {nc.capaReason?.trim() || "-"}
              </span>
            </InfoField>
          </div>
        </Card>
      ) : null}

      {/* 연결 품질 이벤트 요약 */}
      {event ? (
        <Card
          id="card-event"
          title="연결 품질 이벤트 요약"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  `/quality-events/detail/${event.id}?${QUALITY_EVENT_FROM_PARAM}=/quality-events/list`
                )
              }
            >
              <ExternalLinkIcon />
              품질이벤트 상세 보기
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <InfoField label="이벤트 번호">{event.eventNumber}</InfoField>
            <InfoField label="이벤트 제목">{event.title}</InfoField>
            <InfoField label="이벤트 유형">
              {EVENT_TYPE_LABEL[event.eventType] ?? event.eventType}
            </InfoField>
            <InfoField label="심각도">
              {SEVERITY_LABEL[event.severity] ?? event.severity}
            </InfoField>
            <InfoField label="고객 영향">{event.customerImpact}</InfoField>
            <InfoField label="등록자">{event.registrant.userName}</InfoField>
            <InfoField label="등록일">{event.registerDate}</InfoField>
            <InfoField label="이벤트 내용" className="sm:col-span-2">
              <span className="whitespace-pre-line">
                {event.description?.trim() || "-"}
              </span>
            </InfoField>
          </div>
        </Card>
      ) : null}

      {/* 처리 이력 */}
      <Card id="card-history" title="처리 이력">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">처리일시</th>
                <th className="px-3 py-2 text-left font-medium">처리자</th>
                <th className="px-3 py-2 text-left font-medium">처리구분</th>
                <th className="px-3 py-2 text-left font-medium">변경 전 상태</th>
                <th className="px-3 py-2 text-left font-medium">변경 후 상태</th>
                <th className="px-3 py-2 text-left font-medium">처리 내용</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">{h.atLabel}</td>
                  <td className="whitespace-nowrap px-3 py-2">{h.by}</td>
                  <td className="whitespace-nowrap px-3 py-2">{h.kind}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {h.from ? CAPA_STATUS_NAME[h.from] : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {CAPA_STATUS_NAME[h.to]}
                  </td>
                  <td className="px-3 py-2">{h.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 원인분석 등록/수정 다이얼로그 */}
      <RootCauseDialog
        open={rootCauseOpen}
        onOpenChange={setRootCauseOpen}
        mode={rootCauseMode}
        initial={
          rootCauseMode === "edit" && plan.rca
            ? {
                method: plan.rca.method,
                directCause: plan.rca.directCause,
                rootCause: plan.rca.rootCause,
                content: plan.rca.content,
                files: [],
              }
            : null
        }
        event={event ?? null}
        onConfirm={handleRootCauseSubmit}
      />

      {/* 시정/예방조치 등록 다이얼로그 */}
      <ActionPlanDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        event={event ?? null}
        onConfirm={handleActionSubmit}
      />

      {/* 조치 완료 처리 다이얼로그 */}
      <ActionCompleteDialog
        open={completeIndex !== null}
        onOpenChange={(o) => !o && setCompleteIndex(null)}
        onConfirm={handleActionComplete}
      />

      {/* 효과성 검증 시작 다이얼로그 */}
      <EffectivenessVerifyDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        event={event ?? null}
        onConfirm={handleVerifyStart}
      />

      {/* 효과성 검증 결과 등록 다이얼로그 */}
      <EffectivenessCompleteDialog
        open={verifyCompleteOpen}
        onOpenChange={setVerifyCompleteOpen}
        event={event ?? null}
        criteria={plan.effectiveness?.criteria ?? ""}
        onConfirm={handleVerifyComplete}
      />

      {/* CAPA 종료 다이얼로그 */}
      <CapaCloseDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        event={event ?? null}
        effectivenessOpinion={plan.effectiveness?.opinion ?? ""}
        onConfirm={handleClose}
      />

      {/* 원인분석 재수행 확인 다이얼로그 */}
      <Dialog open={rerunOpen} onOpenChange={setRerunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>원인분석 재수행</DialogTitle>
            <DialogDescription>
              효과성 검증에서 효과가 확인되지 않아 원인분석부터 다시 진행합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <p>
              • 상태가{" "}
              <b className="text-foreground">원인분석 대기</b>로 되돌아갑니다.
            </p>
            <p>
              • 기존 <b className="text-foreground">원인분석 · 시정/예방조치 ·
              효과성 검증</b> 내용은 초기화됩니다.
            </p>
          </div>
          <p className="text-sm text-foreground">계속하시겠습니까?</p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRerunOpen(false)}
            >
              취소
            </Button>
            <Button type="button" onClick={handleRerun}>
              재수행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      {/* 오른쪽 고정 세로 목차 (넓은 화면만) */}
      <nav className="sticky top-2 hidden h-fit w-44 shrink-0 self-start xl:block">
        <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
          바로가기
        </p>
        <ul className="flex flex-col">
          {cardNav.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveCard(c.id);
                  scrollToCard(c.id);
                }}
                className={cn(
                  "-ml-px block w-full border-l-2 px-3 py-1.5 text-left text-sm transition-colors",
                  activeCard === c.id
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

type HistoryRow = {
  atLabel: string;
  by: string;
  kind: string;
  from?: CapaStatus;
  to: CapaStatus;
  note: string;
};

/** 상태 진행에 따라 처리 이력을 구성합니다(데모용). */
function buildHistory(
  status: CapaStatus,
  ctx: {
    registeredAt: string;
    registrant: string;
    assignee: string;
    closure?: { comment: string; closedAtLabel: string; closedBy: string };
  }
): HistoryRow[] {
  const rows: HistoryRow[] = [
    {
      atLabel: ctx.registeredAt,
      by: ctx.registrant,
      kind: "계획 등록",
      to: "root_cause_pending",
      note: "CAPA 계획을 등록했습니다.",
    },
  ];

  if (status === "cancelled") {
    rows.push({
      atLabel: addDaysLabel(ctx.registeredAt, 3),
      by: ctx.assignee,
      kind: "취소",
      from: "root_cause_pending",
      to: "cancelled",
      note: "CAPA를 취소했습니다.",
    });
    return rows;
  }

  const idx = PROGRESS_ORDER.indexOf(status);
  for (let j = 1; j <= idx; j += 1) {
    const to = PROGRESS_ORDER[j];
    // 종료 단계는 실제 종료 정보(종료자·종료 의견)로 남깁니다.
    if (to === "closed" && ctx.closure) {
      rows.push({
        atLabel: ctx.closure.closedAtLabel,
        by: ctx.closure.closedBy,
        kind: "CAPA 종료",
        from: PROGRESS_ORDER[j - 1],
        to: "closed",
        note: ctx.closure.comment || "CAPA를 종료했습니다.",
      });
      continue;
    }
    rows.push({
      atLabel: addDaysLabel(ctx.registeredAt, j * 7),
      by: ctx.assignee,
      kind: "상태 변경",
      from: PROGRESS_ORDER[j - 1],
      to,
      note: `상태를 '${CAPA_STATUS_NAME[to]}'(으)로 변경했습니다.`,
    });
  }
  return rows;
}
