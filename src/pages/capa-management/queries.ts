import { useQuery } from "@tanstack/react-query";

import {
  getNonconformitiesSync,
  type Nonconformity,
} from "../nonconformity-management/queries";
import { closeQualityEvent } from "../quailty-event/queries";
import { currentUser } from "@/mock/currentUser";

/** CAPA 계획 등록 대상 한 건(= CAPA 필요로 판정된 부적합). */
export type CapaTarget = {
  nonconformity: Nonconformity;
  /** CAPA 판정 사유. */
  reason: string;
  /** CAPA 필요를 판정한 담당자. */
  judgedBy: string;
  /** 판정 시각 표시 문자열. */
  judgedAtLabel: string;
};

export const capaKeys = {
  all: ["capa"] as const,
  registerTargets: () => [...capaKeys.all, "registerTargets"] as const,
  progress: () => [...capaKeys.all, "progress"] as const,
  myActions: () => [...capaKeys.all, "myActions"] as const,
  delayedActions: () => [...capaKeys.all, "delayedActions"] as const,
  completedActions: () => [...capaKeys.all, "completedActions"] as const,
  allActions: () => [...capaKeys.all, "allActions"] as const,
};

/** CAPA 계획 등록 대상 목록 경로. 상세의 출처(from) 판별에 사용합니다. */
export const CAPA_REGISTER_PATH = "/capa/register";

/** CAPA 진행 현황 목록 경로. 상세의 출처(from) 판별에 사용합니다. */
export const CAPA_STATUS_PATH = "/capa/status";

/**
 * CAPA 계획 등록 대상 mock 저장소(부적합 id → 대상).
 * 메모리에만 있으므로 새로고침 시 초기화됩니다.
 */
const registerTargetStore = new Map<string, CapaTarget>();

/** CAPA 필요 판정 접수. 같은 부적합을 다시 판정하면 최신 내용으로 갱신됩니다. */
export function addCapaTarget(target: CapaTarget) {
  registerTargetStore.set(target.nonconformity.id, target);
}

/** CAPA 계획 등록 대상에서 제거(계획 등록 완료 또는 CAPA 불필요 처리 시). */
export function removeCapaTarget(ncId: string) {
  registerTargetStore.delete(ncId);
}

/** CAPA 계획 유형. */
export type CapaPlanType = "corrective" | "preventive" | "both";

export const CAPA_PLAN_TYPE_NAME: Record<CapaPlanType, string> = {
  corrective: "시정조치",
  preventive: "예방조치",
  both: "시정조치 + 예방조치",
};

/**
 * CAPA 진행 상태.
 * 원인분석 → 조치 → 효과성 검증 단계를 거쳐 종료되며, 중간에 취소될 수 있습니다.
 */
export type CapaStatus =
  | "root_cause_pending"
  | "root_cause_done"
  | "in_action"
  | "effectiveness_pending"
  | "effectiveness_ongoing"
  | "effectiveness_done"
  | "closed"
  | "cancelled";

export const CAPA_STATUS_NAME: Record<CapaStatus, string> = {
  root_cause_pending: "원인분석 대기",
  root_cause_done: "원인분석 완료",
  in_action: "조치중",
  effectiveness_pending: "효과성 검증 대기",
  effectiveness_ongoing: "효과성 검증 중",
  effectiveness_done: "효과성 검증 완료",
  closed: "종료",
  cancelled: "취소",
};

/**
 * CAPA 상태 배지 색상(목록·상세 공용). 상태별로 색을 달리해 한눈에 구분되게 합니다.
 * 원인분석=주황, 조치=파랑, 효과성 검증(대기=빨강·중=보라·완료=청록), 종료=초록, 취소=회색.
 */
export const CAPA_STATUS_CLASS: Record<CapaStatus, string> = {
  root_cause_pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  root_cause_done:
    "bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300",
  in_action: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  effectiveness_pending:
    "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  effectiveness_ongoing:
    "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  effectiveness_done:
    "bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
  closed:
    "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  cancelled:
    "bg-zinc-100 text-zinc-500 dark:bg-zinc-400/15 dark:text-zinc-400",
};

/** 진행 현황 정렬 순서: 진행 단계 순 → 종료 → 취소. */
export const CAPA_STATUS_SORT_ORDER: Record<CapaStatus, number> = {
  root_cause_pending: 0,
  root_cause_done: 1,
  in_action: 2,
  effectiveness_pending: 3,
  effectiveness_ongoing: 4,
  effectiveness_done: 5,
  closed: 6,
  cancelled: 7,
};

/** 등록된 CAPA 계획 한 건. CAPA 진행 현황의 원본이 됩니다. */
export type CapaPlan = {
  ncId: string;
  /** 부적합 번호(목록 표시용, 등록 시점 값 보존). */
  ncNumber: string;
  /** 품질 이벤트 번호(목록 표시용). */
  eventNumber: string;
  /** 원 품질 이벤트 id(행 클릭 시 상세 이동용). */
  eventId: number;
  /** CAPA 번호(CP-YYYY-NNN). 등록 시 순번으로 부여합니다. */
  capaNumber: string;
  /** CAPA 진행 상태. 등록 직후에는 원인분석 대기입니다. */
  status: CapaStatus;
  title: string;
  type: CapaPlanType;
  /** 계획 시작일 표시 문자열. */
  startDateLabel: string;
  /** 계획 완료일 표시 문자열. */
  dueDateLabel: string;
  /** CAPA 계획 등록자. */
  registrant: string;
  assignee: string;
  content: string;
  /** 첨부파일. */
  files: File[];
  createdAtLabel: string;
  /** 원인분석 결과(등록 시 채워짐). 없으면 미등록. */
  rca?: RootCauseRecord;
  /** 등록된 시정/예방조치 목록. */
  actions?: CapaActionRecord[];
  /** 효과성 검증 기록(검증 시작 시 채워짐). */
  effectiveness?: EffectivenessRecord;
  /** CAPA 종료 정보(종료 시 채워짐). */
  closure?: { comment: string; closedAtLabel: string; closedBy: string };
};

/** 원인분석 방법. */
export type RcaMethod = "5why" | "fishbone" | "fta" | "etc";

export const RCA_METHOD_NAME: Record<RcaMethod, string> = {
  "5why": "5 Why",
  fishbone: "특성요인도(피쉬본)",
  fta: "결함수분석(FTA)",
  etc: "기타",
};

/** 등록된 원인분석 한 건. */
export type RootCauseRecord = {
  method: RcaMethod;
  directCause: string;
  rootCause: string;
  content: string;
  analyst: string;
  analyzedAtLabel: string;
  /** 첨부파일 이름(표시용). */
  fileNames: string[];
};

/** 시정/예방조치 우선순위. */
export type CapaActionPriority = "high" | "medium" | "low";

export const CAPA_ACTION_PRIORITY_NAME: Record<CapaActionPriority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

/** 조치 진행 상태 표시명. */
export const CAPA_ACTION_STATUS_NAME: Record<"in_progress" | "completed", string> =
  {
    in_progress: "진행중",
    completed: "완료",
  };

/** 조치 진행 상태 배지 색상. 진행중=파랑, 완료=초록. */
export const CAPA_ACTION_STATUS_CLASS: Record<
  "in_progress" | "completed",
  string
> = {
  in_progress:
    "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300",
};

/** 조치 완료 결과. */
export type CapaActionResult = "완료" | "일부완료" | "미완료";

/** 등록된 시정/예방조치 한 건. */
export type CapaActionRecord = {
  /** 조치 구분(시정/예방/둘 다). */
  type: CapaPlanType;
  title: string;
  content: string;
  department: string;
  assignee: string;
  dueDateLabel: string;
  priority: CapaActionPriority;
  fileNames: string[];
  registeredAtLabel: string;
  /** 진행 상태. 등록 시 진행중, 완료 처리 시 완료. */
  status: "in_progress" | "completed";
  /** 완료 처리 정보(완료 시). */
  result?: CapaActionResult;
  completedDateLabel?: string;
  /** 실제 수행한 조치 내용(사실 기록). */
  actualContent?: string;
  /** 완료 의견(선택). */
  opinion?: string;
  completionFileNames?: string[];
};

/** 효과성 검증 결과. */
export type EffectivenessResult = "effective" | "ineffective";

export const EFFECTIVENESS_RESULT_NAME: Record<EffectivenessResult, string> = {
  effective: "효과있음",
  ineffective: "효과없음",
};

/**
 * 효과성 검증 기록.
 * 대기 → 검증 시작(방법·기준=계획) → 중 → 완료 등록(결과·검증일·의견) → 완료.
 */
export type EffectivenessRecord = {
  /** 검증 방법(어떻게 검증할지). */
  method: string;
  /** 검증 기준. */
  criteria: string;
  planFileNames: string[];
  startedBy: string;
  startedAtLabel: string;
  /** 검증 결과(완료 등록 시). */
  result?: EffectivenessResult;
  verifiedDateLabel?: string;
  opinion?: string;
  resultFileNames?: string[];
  verifiedBy?: string;
};

/** 등록된 CAPA 계획 저장소(부적합 id → 계획). CAPA 진행 현황의 원본이 됩니다. */
const capaPlanStore = new Map<string, CapaPlan>();
let capaSeq = 0;

/** CAPA 번호를 순번으로 부여합니다(CP-2026-NNN). */
function nextCapaNumber(): string {
  capaSeq += 1;
  return `CP-2026-${String(capaSeq).padStart(3, "0")}`;
}

/**
 * CAPA 계획 등록. CAPA 번호를 순번으로 부여하고,
 * 진행 상태는 원인분석 대기로 시작해 CAPA 진행 현황으로 편입됩니다.
 */
export function addCapaPlan(input: Omit<CapaPlan, "capaNumber" | "status">) {
  capaPlanStore.set(input.ncId, {
    ...input,
    capaNumber: nextCapaNumber(),
    status: "root_cause_pending",
  });
}

/**
 * 원인분석 등록. 결과를 저장하고 상태를 원인분석 완료로 전이합니다.
 * (원인분석 대기 → 원인분석 완료)
 */
export function registerRootCause(ncId: string, rca: RootCauseRecord) {
  const plan = capaPlanStore.get(ncId);
  if (!plan) return;
  capaPlanStore.set(ncId, { ...plan, status: "root_cause_done", rca });
}

/** 원인분석 수정. 결과만 갱신하고 상태는 유지합니다. */
export function updateRootCause(ncId: string, rca: RootCauseRecord) {
  const plan = capaPlanStore.get(ncId);
  if (!plan) return;
  capaPlanStore.set(ncId, { ...plan, rca });
}

/**
 * 시정/예방조치 등록. 조치를 추가하고 상태를 조치중으로 전이합니다.
 * (원인분석 완료 → 조치중, 또는 조치중에서 추가)
 */
export function addCapaAction(ncId: string, action: CapaActionRecord) {
  const plan = capaPlanStore.get(ncId);
  if (!plan) return;
  capaPlanStore.set(ncId, {
    ...plan,
    status: "in_action",
    actions: [...(plan.actions ?? []), action],
  });
}

/** 조치 완료 처리 입력. */
export type CapaActionCompletion = {
  result: CapaActionResult;
  completedDateLabel: string;
  actualContent: string;
  opinion: string;
  fileNames: string[];
};

/**
 * 개별 시정/예방조치 완료 처리. 해당 조치를 완료로 표시하고,
 * 모든 조치가 완료되면 CAPA 상태를 효과성 검증 대기로 전이합니다.
 */
export function completeCapaAction(
  ncId: string,
  index: number,
  input: CapaActionCompletion
) {
  const plan = capaPlanStore.get(ncId);
  if (!plan?.actions?.[index]) return;
  const actions = plan.actions.map((a, i) =>
    i === index
      ? {
          ...a,
          status: "completed" as const,
          result: input.result,
          completedDateLabel: input.completedDateLabel,
          actualContent: input.actualContent,
          opinion: input.opinion,
          completionFileNames: input.fileNames,
        }
      : a
  );
  const allDone = actions.every((a) => a.status === "completed");
  capaPlanStore.set(ncId, {
    ...plan,
    actions,
    // 모든 조치 완료 시 효과성 검증 대기로 전이(진행 중이면 상태 유지).
    status: allDone ? "effectiveness_pending" : plan.status,
  });
}

/** 효과성 검증 시작 입력(계획: 방법·기준). */
export type EffectivenessStartInput = {
  method: string;
  criteria: string;
  fileNames: string[];
  startedBy: string;
  startedAtLabel: string;
};

/**
 * 효과성 검증 시작. 검증 방법·기준(계획)을 저장하고 상태를 효과성 검증 중으로 전이합니다.
 * (효과성 검증 대기 → 효과성 검증 중)
 */
export function startEffectivenessVerification(
  ncId: string,
  input: EffectivenessStartInput
) {
  const plan = capaPlanStore.get(ncId);
  if (!plan) return;
  capaPlanStore.set(ncId, {
    ...plan,
    status: "effectiveness_ongoing",
    effectiveness: {
      method: input.method,
      criteria: input.criteria,
      planFileNames: input.fileNames,
      startedBy: input.startedBy,
      startedAtLabel: input.startedAtLabel,
    },
  });
}

/** 효과성 검증 완료 입력(결과·검증일·의견). */
export type EffectivenessCompleteInput = {
  result: EffectivenessResult;
  verifiedDateLabel: string;
  opinion: string;
  fileNames: string[];
  verifiedBy: string;
};

/**
 * 효과성 검증 결과 등록. 결과를 기록하고 상태를 효과성 검증 완료로 전이합니다.
 * (효과성 검증 중 → 효과성 검증 완료)
 */
export function completeEffectivenessVerification(
  ncId: string,
  input: EffectivenessCompleteInput
) {
  const plan = capaPlanStore.get(ncId);
  if (!plan?.effectiveness) return;
  capaPlanStore.set(ncId, {
    ...plan,
    status: "effectiveness_done",
    effectiveness: {
      ...plan.effectiveness,
      result: input.result,
      verifiedDateLabel: input.verifiedDateLabel,
      opinion: input.opinion,
      resultFileNames: input.fileNames,
      verifiedBy: input.verifiedBy,
    },
  });
}

/** CAPA 종료. 종료 의견을 기록하고 상태를 종료로 전이합니다. */
export function closeCapa(
  ncId: string,
  input: { comment: string; closedAtLabel: string; closedBy: string }
) {
  const plan = capaPlanStore.get(ncId);
  if (!plan) return;
  capaPlanStore.set(ncId, { ...plan, status: "closed", closure: input });
  // CAPA 종료 = 연결 품질 이벤트 최종 종료.
  closeQualityEvent(plan.eventId);
}

/**
 * 원인분석 재수행. 상태를 원인분석 대기로 되돌리고,
 * 이후 단계(원인분석·조치·효과성 검증·종료) 내용을 초기화합니다.
 */
export function rerunRootCause(ncId: string) {
  const plan = capaPlanStore.get(ncId);
  if (!plan) return;
  capaPlanStore.set(ncId, {
    ...plan,
    status: "root_cause_pending",
    rca: undefined,
    actions: undefined,
    effectiveness: undefined,
    closure: undefined,
  });
}

/** CAPA 필요로 판정된 부적합을 등록/계획 대상으로 초기 시드합니다. */
function seedCapaTargets() {
  for (const nc of getNonconformitiesSync()) {
    if (nc.capaVerdict !== "required") continue;
    registerTargetStore.set(nc.id, {
      nonconformity: nc,
      reason:
        nc.capaReason ?? "CAPA 필요로 판정되어 등록/계획 대상으로 편입되었습니다.",
      judgedBy: nc.capaJudgedBy ?? nc.confirmedBy,
      judgedAtLabel: nc.capaJudgedAtLabel ?? nc.confirmedAtLabel,
    });
  }
}

seedCapaTargets();

async function getRegisterTargets(): Promise<CapaTarget[]> {
  // CAPA 판정일이 최신인 건이 위로.
  return [...registerTargetStore.values()].sort((a, b) =>
    b.judgedAtLabel.localeCompare(a.judgedAtLabel)
  );
}

export function useCapaRegisterTargets() {
  return useQuery({
    queryKey: capaKeys.registerTargets(),
    queryFn: getRegisterTargets,
  });
}

/** 사이드바 배지용 CAPA 계획 등록 대상 건수. */
export function useCapaRegisterCount() {
  return useQuery({
    queryKey: capaKeys.registerTargets(),
    queryFn: getRegisterTargets,
    select: (targets) => targets.length,
  });
}

/** 오늘 기준 offsetDays 만큼 이동한 날짜의 yyyy-MM-dd 라벨. */
function dateLabelFromToday(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * CAPA 진행 현황 데모 시드(모듈 로드 시 1회).
 * CAPA 필요로 판정된 실제 부적합의 "절반"에 CAPA 계획을 등록해 진행 현황으로 옮기고,
 * 나머지는 CAPA 계획 등록 대상에 남깁니다(둘 다 여러 페이지 분량).
 * 상태·유형·담당자·완료일을 돌려 가며 배정해 다양한 조합(지연·정상 포함)을 만듭니다.
 * 실제 서버 연동 시에는 불필요합니다.
 */
const CAPA_STATUS_CYCLE: CapaStatus[] = [
  "root_cause_pending",
  "root_cause_done",
  "in_action",
  "effectiveness_pending",
  "effectiveness_ongoing",
  "effectiveness_done",
  "closed",
  "cancelled",
];
const CAPA_TYPE_CYCLE: CapaPlanType[] = ["corrective", "preventive", "both"];
const CAPA_ASSIGNEES = [
  "홍길동",
  "박준호",
  "한대희",
  "양형모",
  "서지훈",
  "이우민",
  "김도현",
];
/** 오늘 기준 계획 완료일 오프셋(일). 과거·미래를 섞어 지연·정상이 모두 나오게 합니다. */
const CAPA_DUE_OFFSETS = [-25, -14, -8, -3, -1, 4, 7, 12, 18, 25];

function seedCapaProgress() {
  const requiredNcs = getNonconformitiesSync().filter(
    (nc) => nc.capaVerdict === "required"
  );
  let p = 0;
  requiredNcs.forEach((nc, i) => {
    // 절반만 계획 등록 → 진행 현황. 나머지는 CAPA 계획 등록 대상에 유지.
    if (i % 2 !== 0) return;
    const status = CAPA_STATUS_CYCLE[p % CAPA_STATUS_CYCLE.length];
    const assignee = CAPA_ASSIGNEES[p % CAPA_ASSIGNEES.length];
    const startDateLabel = dateLabelFromToday(-(p + 6));
    // 원인분석 완료 이후 상태면 원인분석 결과를 함께 시드합니다(대기·취소는 제외).
    const analyzed = status !== "root_cause_pending" && status !== "cancelled";
    // 조치중 이후 상태면 시정/예방조치도 시드합니다.
    const acted = analyzed && status !== "root_cause_done";
    // 효과성 검증 중 이후면 검증 계획을, 완료 이후면 결과까지 시드합니다.
    const effStarted =
      status === "effectiveness_ongoing" ||
      status === "effectiveness_done" ||
      status === "closed";
    const effResult = status === "effectiveness_done" || status === "closed";
    capaPlanStore.set(nc.id, {
      ncId: nc.id,
      ncNumber: nc.ncNumber,
      eventNumber: nc.event.eventNumber,
      eventId: nc.event.id,
      capaNumber: nextCapaNumber(),
      status,
      title: `${nc.event.title} 재발방지 CAPA`,
      type: CAPA_TYPE_CYCLE[p % CAPA_TYPE_CYCLE.length],
      startDateLabel,
      dueDateLabel: dateLabelFromToday(CAPA_DUE_OFFSETS[p % CAPA_DUE_OFFSETS.length]),
      registrant: CAPA_ASSIGNEES[(p + 3) % CAPA_ASSIGNEES.length],
      assignee,
      content: `${nc.event.title}의 근본 원인을 분석하고 시정·예방조치를 수립·적용한다.`,
      files: [],
      createdAtLabel: `${startDateLabel} 09:00`,
      rca: analyzed
        ? seedRootCause(
            nc.event.title,
            assignee,
            startDateLabel,
            SEED_RCA_METHODS[p % SEED_RCA_METHODS.length]
          )
        : undefined,
      actions: acted
        ? [
            seedCapaAction(
              nc.event.title,
              assignee,
              startDateLabel,
              // 조치중은 진행중, 효과성 검증 이후 상태면 완료로 시드.
              status !== "in_action"
            ),
          ]
        : undefined,
      effectiveness: effStarted
        ? seedEffectiveness(assignee, startDateLabel, effResult)
        : undefined,
    });
    // 계획을 등록했으므로 CAPA 계획 등록 대상에서 제거.
    removeCapaTarget(nc.id);
    p += 1;
  });
}

/** 시드용 시정/예방조치 생성. completed면 완료 정보까지 채웁니다. */
function seedCapaAction(
  eventTitle: string,
  assignee: string,
  startDateLabel: string,
  completed: boolean
): CapaActionRecord {
  return {
    type: "both",
    title: `${eventTitle} 시정·예방조치`,
    content:
      "근본 원인에 대응해 절차와 체크리스트를 보완하고, 담당자 교육 및 정기 점검을 시행한다.",
    department: "품질관리실",
    assignee,
    dueDateLabel: startDateLabel,
    priority: "medium",
    fileNames: [],
    registeredAtLabel: startDateLabel,
    status: completed ? "completed" : "in_progress",
    ...(completed
      ? {
          result: "완료" as const,
          completedDateLabel: startDateLabel,
          actualContent:
            "관련 절차와 체크리스트를 개정·배포하고 담당자 교육을 완료했습니다.",
          opinion: "계획된 시정·예방조치를 정상 수행하여 완료했습니다.",
          completionFileNames: [],
        }
      : {}),
  };
}

/** 시드용 효과성 검증 생성. hasResult면 결과까지 채웁니다. */
function seedEffectiveness(
  verifier: string,
  dateLabel: string,
  hasResult: boolean
): EffectivenessRecord {
  return {
    method: "조치 전후 지표 비교 및 현장 점검으로 재발 여부를 확인한다.",
    criteria: "동일 부적합 재발 0건, 관련 절차 준수율 100% 달성",
    planFileNames: [],
    startedBy: verifier,
    startedAtLabel: dateLabel,
    ...(hasResult
      ? {
          result: "effective" as const,
          verifiedDateLabel: dateLabel,
          opinion: "조치 이후 동일 부적합이 재발하지 않아 효과가 있는 것으로 확인했습니다.",
          resultFileNames: [],
          verifiedBy: verifier,
        }
      : {}),
  };
}

/** 시드 원인분석 방법 순환(대기·취소 제외 상태에 골고루 배정). */
const SEED_RCA_METHODS: RcaMethod[] = ["5why", "fishbone", "fta"];

/** 방법별 시드 첨부파일명. */
const SEED_RCA_FILE: Record<RcaMethod, string> = {
  "5why": "원인분석_5Why_결과.pdf",
  fishbone: "원인분석_특성요인도.pdf",
  fta: "원인분석_FTA_결과.pdf",
  etc: "원인분석_결과.pdf",
};

/** 시드용 원인분석 결과 생성. 방법에 맞는 분석 과정을 넣습니다. */
function seedRootCause(
  eventTitle: string,
  analyst: string,
  startDateLabel: string,
  method: RcaMethod
): RootCauseRecord {
  const content =
    method === "fishbone"
      ? [
          "[사람] 담당자가 최신 절차를 충분히 숙지하지 못함",
          "[방법] 완료 여부를 확인하는 점검 단계가 절차에 없음",
          "[설비/시스템] 필수 항목 누락을 차단하는 시스템 통제가 없음",
          "[자재/정보] 체크리스트가 최신 절차를 반영하지 못함",
          "[환경/관리] 절차 개정 시 교육·공지 체계가 미흡함",
        ].join("\n")
      : method === "fta"
        ? [
            `상위 사건(Top event): ${eventTitle}`,
            "├ 기여 원인 1: 절차 미준수(작업자 확인 누락)",
            "├ 기여 원인 2: 시스템 통제 부재(누락 자동 차단 불가)",
            "└ 기여 원인 3: 관리 체계 미흡(교육·점검 부족)",
          ].join("\n")
        : [
            "1 Why: 왜 문제가 발생했는가? 해당 작업이 절차대로 수행되지 않았기 때문이다.",
            "2 Why: 왜 절차대로 수행되지 않았는가? 완료 여부를 확인하는 점검 단계가 없었기 때문이다.",
            "3 Why: 왜 점검 단계가 없었는가? 체크리스트가 최신 절차를 반영하지 못했기 때문이다.",
            "4 Why: 왜 체크리스트가 갱신되지 않았는가? 절차 개정 시 교육·공지가 충분하지 않았기 때문이다.",
            "5 Why: 왜 교육·공지가 부족했는가? 개정 관리 프로세스가 명확히 정의되어 있지 않기 때문이다.",
          ].join("\n");

  return {
    method,
    directCause: `${eventTitle} 발생 시 정해진 절차가 준수되지 않은 것이 직접 원인입니다.`,
    rootCause:
      "작업 완료 여부를 점검·검증하는 통제 절차가 미흡해 재발 가능성이 있는 구조적 원인이 있습니다.",
    content,
    analyst,
    analyzedAtLabel: startDateLabel,
    fileNames: [SEED_RCA_FILE[method]],
  };
}

seedCapaProgress();

/**
 * 데모용 조치 시드. 실제 서버 연동 시에는 불필요합니다.
 * - "내 조치 대상"이 비지 않도록, 진행중(in_action) CAPA의 대표 조치를 현재 사용자
 *   담당으로 지정하고 기한을 섞어(지연 1 + 정상 2) 배정합니다.
 * - "지연 조치"가 비지 않도록, 같은 CAPA에 기한이 지난 진행중 조치를 다른 담당자로
 *   추가합니다(한 CAPA에 여러 시정/예방조치가 있는 상황).
 */
const DEMO_OTHER_ASSIGNEES = ["박준호", "한대희", "양형모", "서지훈", "이우민"];
const DEMO_DELAYED_ACTIONS: {
  type: CapaPlanType;
  priority: CapaActionPriority;
  offset: number;
  suffix: string;
}[] = [
  { type: "corrective", priority: "high", offset: -15, suffix: "긴급 시정조치" },
  { type: "preventive", priority: "medium", offset: -5, suffix: "추가 예방조치" },
];

function seedActionDemo() {
  const inActionPlans = [...capaPlanStore.values()].filter(
    (p) => p.status === "in_action" && p.actions?.length
  );
  // 과거(지연) 1건 + 미래(정상) 2건이 섞이도록 기한 오프셋을 배정합니다.
  const myDueOffsets = [-6, 3, 10];
  inActionPlans.slice(0, 3).forEach((plan, i) => {
    // 대표 조치는 현재 사용자 담당으로.
    const base = plan.actions!.map((action, idx) =>
      idx === 0
        ? {
            ...action,
            assignee: currentUser.name,
            department: currentUser.department,
            dueDateLabel: dateLabelFromToday(myDueOffsets[i % myDueOffsets.length]),
          }
        : action
    );
    // 기한이 지난 진행중 조치를 다른 담당자로 추가(지연 조치 데모).
    const extras: CapaActionRecord[] = DEMO_DELAYED_ACTIONS.map((d, k) => ({
      type: d.type,
      title: `${plan.title.replace(" 재발방지 CAPA", "")} ${d.suffix}`,
      content: "기한이 지난 진행중 조치입니다. 조속한 완료가 필요합니다.",
      department: "품질관리실",
      assignee: DEMO_OTHER_ASSIGNEES[(i * 2 + k) % DEMO_OTHER_ASSIGNEES.length],
      dueDateLabel: dateLabelFromToday(d.offset),
      priority: d.priority,
      fileNames: [],
      registeredAtLabel: dateLabelFromToday(d.offset - 10),
      status: "in_progress" as const,
    }));
    plan.actions = [...base, ...extras];
  });

  // 완료 조치 결과에 변화를 줘서 "조치 결과" 필터를 시연할 수 있게 합니다.
  // (기본 시드는 모두 "완료"라 결과 필터가 무의미해지므로 일부를 다른 결과로 조정)
  const completed: CapaActionRecord[] = [];
  for (const plan of capaPlanStore.values()) {
    for (const action of plan.actions ?? []) {
      if (action.status === "completed") completed.push(action);
    }
  }
  completed.forEach((action, idx) => {
    if (idx % 4 === 1) action.result = "일부완료";
    else if (idx % 7 === 3) action.result = "미완료";
  });

  // 현재 사용자 완료 조치를 최근 6개월에 걸쳐 분포시킵니다.
  // (마이페이지의 "월별 조치 완료" 그래프 + "이번 달 완료" 지표 데모용)
  // 이번 달 2건 + 지난달들 분포. monthsAgo=0은 오늘 날짜를 씁니다.
  const myCompletionPlan: { monthsAgo: number; day: number }[] = [
    { monthsAgo: 0, day: 0 },
    { monthsAgo: 0, day: 0 },
    { monthsAgo: 1, day: 20 },
    { monthsAgo: 1, day: 8 },
    { monthsAgo: 2, day: 15 },
    { monthsAgo: 3, day: 12 },
    { monthsAgo: 4, day: 22 },
  ];
  completed.slice(0, myCompletionPlan.length).forEach((action, i) => {
    const { monthsAgo, day } = myCompletionPlan[i];
    const d = new Date();
    if (monthsAgo > 0) {
      d.setDate(1);
      d.setMonth(d.getMonth() - monthsAgo);
      d.setDate(day);
    }
    action.assignee = currentUser.name;
    action.department = currentUser.department;
    action.completedDateLabel = `${d.getFullYear()}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

seedActionDemo();

/** yyyy-MM-dd 라벨 → Date(자정). 파싱 실패 시 null. */
function parseDateLabel(label: string): Date | null {
  const [y, m, d] = label.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** 지연 여부: 종료/취소가 아니고 오늘이 계획 완료일을 지났으면 지연. */
function isCapaDelayed(plan: CapaPlan): boolean {
  if (plan.status === "closed" || plan.status === "cancelled") return false;
  const due = parseDateLabel(plan.dueDateLabel);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() > due.getTime();
}

/** CAPA 진행 현황 한 행(계획 + 파생 지연 여부). */
export type CapaProgressRow = CapaPlan & { delayed: boolean };

/**
 * 단계별 대상 메뉴에서 보여 줄 CAPA 상태 묶음.
 * 진행 현황(전체)에서 각 단계에 해당하는 상태만 필터링해 보여 줍니다.
 * - 원인분석 대상: 원인분석 대기·완료
 * - 시정/예방조치 대상: 조치중
 * - 효과성 검증 대상: 효과성 검증 대기·중·완료
 */
export const ROOT_CAUSE_STAGE_STATUSES: CapaStatus[] = [
  "root_cause_pending",
  "root_cause_done",
];
export const ACTION_STAGE_STATUSES: CapaStatus[] = ["in_action"];
export const EFFECTIVENESS_STAGE_STATUSES: CapaStatus[] = [
  "effectiveness_pending",
  "effectiveness_ongoing",
  "effectiveness_done",
];

/** 진행 단계 순서대로 나열한 전체 CAPA 상태(필터 옵션 등에 사용). */
export const ALL_CAPA_STATUSES: CapaStatus[] = [
  "root_cause_pending",
  "root_cause_done",
  "in_action",
  "effectiveness_pending",
  "effectiveness_ongoing",
  "effectiveness_done",
  "closed",
  "cancelled",
];

/** CAPA 목록 필터 값. 빈 문자열은 "전체"(조건 없음)를 의미합니다. */
export type CapaFilterValues = {
  /** CAPA 번호·제목·부적합 번호·품질 이벤트 번호·담당자 통합 검색어. */
  keyword: string;
  status: CapaStatus | "";
  type: CapaPlanType | "";
  /** 지연 여부: "" 전체 / "delayed" 지연 / "normal" 정상. */
  delayed: "" | "delayed" | "normal";
};

export const EMPTY_CAPA_FILTER: CapaFilterValues = {
  keyword: "",
  status: "",
  type: "",
  delayed: "",
};

/** 활성 조건(전체가 아닌 값)이 하나라도 있는지. */
export function hasActiveCapaFilter(f: CapaFilterValues) {
  return Boolean(f.keyword.trim() || f.status || f.type || f.delayed);
}

/** CAPA 진행 현황 행을 필터 값에 따라 걸러 냅니다(클라이언트 필터링). */
export function filterCapaRows(
  rows: CapaProgressRow[],
  f: CapaFilterValues
): CapaProgressRow[] {
  const kw = f.keyword.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.type && r.type !== f.type) return false;
    if (f.delayed === "delayed" && !r.delayed) return false;
    if (f.delayed === "normal" && r.delayed) return false;
    if (kw) {
      const hay = [r.capaNumber, r.title, r.ncNumber, r.eventNumber, r.assignee]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}

/**
 * CAPA 번호(CP-YYYY-NNN)로 CAPA 상세 이동 키(연결 부적합 id)를 찾습니다.
 * 못 찾으면 undefined. (챗봇 화면 이동 등에서 사용)
 */
export function findCapaIdByNumber(capaNumber: string): string | undefined {
  for (const [id, plan] of capaPlanStore) {
    if (plan.capaNumber === capaNumber) return id;
  }
  return undefined;
}

export async function getCapaProgress(
  statuses?: CapaStatus[]
): Promise<CapaProgressRow[]> {
  const allow = statuses ? new Set(statuses) : null;
  return [...capaPlanStore.values()]
    .filter((plan) => !allow || allow.has(plan.status))
    .map((plan) => ({ ...plan, delayed: isCapaDelayed(plan) }))
    .sort((a, b) => {
      const statusDiff =
        CAPA_STATUS_SORT_ORDER[a.status] - CAPA_STATUS_SORT_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      // 같은 상태 내에서는 등록일이 최신인 건이 위로.
      return b.createdAtLabel.localeCompare(a.createdAtLabel);
    });
}

/**
 * CAPA 진행 현황 조회.
 * statuses를 주면 해당 상태만 필터링합니다(단계별 대상 메뉴에서 사용).
 */
export function useCapaProgress(statuses?: CapaStatus[]) {
  return useQuery({
    queryKey: statuses
      ? [...capaKeys.progress(), "stage", ...statuses]
      : capaKeys.progress(),
    queryFn: () => getCapaProgress(statuses),
  });
}

/**
 * 단계별 대상 건수(사이드바 배지용).
 * 해당 단계 상태에 속한 CAPA 개수를 반환합니다.
 */
function useCapaStageCount(statuses: CapaStatus[], key: string) {
  return useQuery({
    queryKey: [...capaKeys.progress(), "stageCount", key],
    queryFn: async () => (await getCapaProgress(statuses)).length,
  });
}

export function useRootCauseTargetCount() {
  return useCapaStageCount(ROOT_CAUSE_STAGE_STATUSES, "rootCause");
}

export function useCorrectivePreventiveTargetCount() {
  return useCapaStageCount(ACTION_STAGE_STATUSES, "correctivePreventive");
}

export function useEffectivenessTargetCount() {
  return useCapaStageCount(EFFECTIVENESS_STAGE_STATUSES, "effectiveness");
}

/** CAPA 진행 현황 상세(계획 + 파생 지연 + 연결 부적합/이벤트). */
export type CapaDetail = {
  plan: CapaPlan;
  delayed: boolean;
  /** 연결 부적합(및 그 안의 원 품질 이벤트). 없으면 null. */
  nonconformity: Nonconformity | null;
};

async function getCapaDetail(id: string): Promise<CapaDetail | null> {
  const plan = capaPlanStore.get(id);
  if (!plan) return null;
  const nonconformity =
    getNonconformitiesSync().find((nc) => nc.id === plan.ncId) ?? null;
  return { plan, delayed: isCapaDelayed(plan), nonconformity };
}

/** CAPA 상세 조회. id는 CAPA 계획 저장소 키(연결 부적합 id)입니다. */
export function useCapaDetail(id: string | undefined) {
  return useQuery({
    queryKey: [...capaKeys.progress(), "detail", id ?? ""],
    queryFn: () => getCapaDetail(id!),
    enabled: Boolean(id),
  });
}

/**
 * 조치 목록 한 행.
 * CAPA 계획 안의 개별 시정/예방조치(CapaActionRecord)에 소속 CAPA 정보를 더한 형태입니다.
 * 내 조치 대상·지연 조치·조치 완료 이력이 공유합니다.
 */
export type ActionRow = CapaActionRecord & {
  /** 소속 CAPA(연결 부적합 id = 상세 이동 키). */
  ncId: string;
  capaNumber: string;
  /** 소속 CAPA 제목. */
  capaTitle: string;
  /** 연결 부적합 번호. */
  ncNumber: string;
  /** 연결 품질 이벤트 번호. */
  eventNumber: string;
  /** 기한이 지났는지(진행중 기준). */
  delayed: boolean;
};

/** 개별 조치의 지연 여부: 진행중이고 오늘이 기한을 지났으면 지연. */
function isActionDelayed(action: CapaActionRecord): boolean {
  if (action.status !== "in_progress") return false;
  const due = parseDateLabel(action.dueDateLabel);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() > due.getTime();
}

/** 기한 초과 일수(진행중·지연 건 기준). 지연이 아니면 0. */
export function actionOverdueDays(dueDateLabel: string): number {
  const due = parseDateLabel(dueDateLabel);
  if (!due) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - due.getTime();
  return diff > 0 ? Math.floor(diff / 86_400_000) : 0;
}

/**
 * 모든 CAPA의 시정/예방조치를 조건에 맞게 펼쳐 모읍니다(소속 CAPA 정보 포함).
 * 내 조치 대상·지연 조치·조치 완료 이력의 공통 원본입니다.
 */
function collectActionRows(
  predicate: (action: CapaActionRecord) => boolean
): ActionRow[] {
  const rows: ActionRow[] = [];
  for (const plan of capaPlanStore.values()) {
    if (!plan.actions) continue;
    for (const action of plan.actions) {
      if (!predicate(action)) continue;
      rows.push({
        ...action,
        ncId: plan.ncId,
        capaNumber: plan.capaNumber,
        capaTitle: plan.title,
        ncNumber: plan.ncNumber,
        eventNumber: plan.eventNumber,
        delayed: isActionDelayed(action),
      });
    }
  }
  return rows;
}

/** 목록 정렬용 상태 우선순위: 진행중이 앞, 완료가 뒤. */
const ACTION_STATUS_ORDER: Record<ActionRow["status"], number> = {
  in_progress: 0,
  completed: 1,
};

/** 진행중 우선 → 같은 상태면 등록일 최신순. */
function byStatusThenRegistered(a: ActionRow, b: ActionRow): number {
  const order = ACTION_STATUS_ORDER[a.status] - ACTION_STATUS_ORDER[b.status];
  if (order !== 0) return order;
  return b.registeredAtLabel.localeCompare(a.registeredAtLabel);
}

/**
 * 내 조치 대상 조회.
 * 현재 사용자가 담당자인 조치를 모읍니다.
 * 정렬: 진행중이 앞·완료가 뒤, 같은 상태면 등록일 최신순.
 */
export async function getMyActionTargets(): Promise<ActionRow[]> {
  return collectActionRows((a) => a.assignee === currentUser.name).sort(
    byStatusThenRegistered
  );
}

export function useMyActionTargets() {
  return useQuery({
    queryKey: capaKeys.myActions(),
    queryFn: getMyActionTargets,
  });
}

/** 내 조치 대상 필터 값. 빈 문자열은 "전체"(조건 없음)를 의미합니다. */
export type MyActionFilterValues = {
  /** 조치·CAPA 제목/번호 통합 검색어. */
  keyword: string;
  status: CapaActionRecord["status"] | "";
  type: CapaPlanType | "";
  priority: CapaActionPriority | "";
};

export const EMPTY_MY_ACTION_FILTER: MyActionFilterValues = {
  keyword: "",
  status: "",
  type: "",
  priority: "",
};

export function hasActiveMyActionFilter(f: MyActionFilterValues) {
  return Boolean(f.keyword.trim() || f.status || f.type || f.priority);
}

/** 내 조치 대상 행을 필터 값에 따라 걸러 냅니다(클라이언트 필터링). */
export function filterMyActions(
  rows: ActionRow[],
  f: MyActionFilterValues
): ActionRow[] {
  const kw = f.keyword.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.type && r.type !== f.type) return false;
    if (f.priority && r.priority !== f.priority) return false;
    if (kw) {
      const hay = [
        r.title,
        r.capaNumber,
        r.capaTitle,
        r.ncNumber,
        r.eventNumber,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}

/**
 * 지연 조치 조회(전사).
 * 기한이 지난 진행중 조치만 모읍니다. 정렬: 기한 초과가 큰(오래된) 순.
 */
async function getDelayedActions(): Promise<ActionRow[]> {
  return collectActionRows((a) => isActionDelayed(a)).sort((a, b) =>
    // 등록일이 최신인 건이 위로.
    b.registeredAtLabel.localeCompare(a.registeredAtLabel)
  );
}

export function useDelayedActions() {
  return useQuery({
    queryKey: capaKeys.delayedActions(),
    queryFn: getDelayedActions,
  });
}

/**
 * 조치 진행 현황 조회(전사).
 * 모든 CAPA의 시정/예방조치를 상태 무관하게 모읍니다.
 * 정렬: 진행중이 앞·완료가 뒤, 같은 상태면 등록일 최신순.
 */
async function getAllActions(): Promise<ActionRow[]> {
  return collectActionRows(() => true).sort(byStatusThenRegistered);
}

export function useAllActions() {
  return useQuery({
    queryKey: capaKeys.allActions(),
    queryFn: getAllActions,
  });
}

/** 조치 진행 현황 필터 값. 빈 문자열은 "전체"(조건 없음)를 의미합니다. */
export type ActionProgressFilterValues = {
  /** 조치·CAPA 제목/번호·담당자 통합 검색어. */
  keyword: string;
  status: CapaActionRecord["status"] | "";
  type: CapaPlanType | "";
  /** 담당자(정확 일치). */
  assignee: string;
};

export const EMPTY_ACTION_PROGRESS_FILTER: ActionProgressFilterValues = {
  keyword: "",
  status: "",
  type: "",
  assignee: "",
};

export function hasActiveActionProgressFilter(f: ActionProgressFilterValues) {
  return Boolean(f.keyword.trim() || f.status || f.type || f.assignee);
}

/** 조치 진행 현황 행을 필터 값에 따라 걸러 냅니다(클라이언트 필터링). */
export function filterActionProgress(
  rows: ActionRow[],
  f: ActionProgressFilterValues
): ActionRow[] {
  const kw = f.keyword.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.type && r.type !== f.type) return false;
    if (f.assignee && r.assignee !== f.assignee) return false;
    if (kw) {
      const hay = [
        r.title,
        r.capaNumber,
        r.capaTitle,
        r.assignee,
        r.ncNumber,
        r.eventNumber,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}

/** 지연 조치 필터 값. 빈 문자열은 "전체"(조건 없음)를 의미합니다. */
export type DelayedActionFilterValues = {
  /** 조치·CAPA 제목/번호·담당자 통합 검색어. */
  keyword: string;
  type: CapaPlanType | "";
  priority: CapaActionPriority | "";
};

export const EMPTY_DELAYED_FILTER: DelayedActionFilterValues = {
  keyword: "",
  type: "",
  priority: "",
};

export function hasActiveDelayedFilter(f: DelayedActionFilterValues) {
  return Boolean(f.keyword.trim() || f.type || f.priority);
}

/** 지연 조치 행을 필터 값에 따라 걸러 냅니다(클라이언트 필터링). */
export function filterDelayedActions(
  rows: ActionRow[],
  f: DelayedActionFilterValues
): ActionRow[] {
  const kw = f.keyword.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.type && r.type !== f.type) return false;
    if (f.priority && r.priority !== f.priority) return false;
    if (kw) {
      const hay = [
        r.title,
        r.capaNumber,
        r.capaTitle,
        r.assignee,
        r.ncNumber,
        r.eventNumber,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}

/**
 * 조치 완료 이력 조회(전사).
 * 완료된 조치를 완료일 최신순으로 모읍니다(로그 형태 표시용).
 */
async function getCompletedActions(): Promise<ActionRow[]> {
  return collectActionRows((a) => a.status === "completed").sort((a, b) =>
    // 완료일이 최신인 건이 위로(빈 값은 뒤로).
    (b.completedDateLabel ?? "").localeCompare(a.completedDateLabel ?? "")
  );
}

export function useCompletedActions() {
  return useQuery({
    queryKey: capaKeys.completedActions(),
    queryFn: getCompletedActions,
  });
}

/**
 * 조치 완료 이력 필터 값.
 * 완료일 기간(from~to, yyyy-MM-dd)·조치 결과·통합 검색어. 빈 값은 "전체"입니다.
 * (서버 연동 시 이 값을 그대로 쿼리 파라미터로 전달하도록 설계)
 */
export type CompletedActionFilterValues = {
  keyword: string;
  result: CapaActionResult | "";
  /** 완료일 시작(yyyy-MM-dd). */
  from: string;
  /** 완료일 종료(yyyy-MM-dd). */
  to: string;
};

export const EMPTY_COMPLETED_FILTER: CompletedActionFilterValues = {
  keyword: "",
  result: "",
  from: "",
  to: "",
};

export function hasActiveCompletedFilter(f: CompletedActionFilterValues) {
  return Boolean(f.keyword.trim() || f.result || f.from || f.to);
}

/** 조치 완료 이력 행을 필터 값에 따라 걸러 냅니다(클라이언트 필터링). */
export function filterCompletedActions(
  rows: ActionRow[],
  f: CompletedActionFilterValues
): ActionRow[] {
  const kw = f.keyword.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.result && r.result !== f.result) return false;
    const done = r.completedDateLabel ?? "";
    // yyyy-MM-dd 문자열은 사전식 비교가 곧 날짜 비교입니다.
    if (f.from && done < f.from) return false;
    if (f.to && done > f.to) return false;
    if (kw) {
      const hay = [
        r.title,
        r.capaNumber,
        r.capaTitle,
        r.assignee,
        r.ncNumber,
        r.eventNumber,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}
