import { useQuery } from "@tanstack/react-query";

import { qualityEventData } from "@/mock/quailty-event/quailtyEventData";
import {
  assessQualityEvent,
  type AiReviewAssessment,
  type CapaVerdict,
  type QualityEvent,
} from "../quailty-event/queries";

/** 부적합 판정 대상 한 건(부적합 판정 요청이 접수된 품질 이벤트). */
export type NonconformityTarget = {
  event: QualityEvent;
  /** 부적합 판정을 요청한 검토자. */
  requestedBy: string;
  /** 요청 시각 표시 문자열. */
  requestedAtLabel: string;
  /** 요청 시 작성한 사유. */
  reason: string;
  /** 검토 단계에서 받은 AI 소견 전체(요약·근거 포함). 판정 화면에서 그대로 보여줍니다. */
  aiAssessment?: AiReviewAssessment;
};

export const nonconformityKeys = {
  all: ["nonconformities"] as const,
  judgmentTargets: () =>
    [...nonconformityKeys.all, "judgmentTargets"] as const,
  list: () => [...nonconformityKeys.all, "list"] as const,
};

/** 부적합 판정 대상 목록 경로. 상세의 출처(from) 판별에 사용합니다. */
export const NONCONFORMITY_JUDGMENT_PATH = "/nonconformities/judgment";

/** 부적합 목록 경로. */
export const NONCONFORMITY_LIST_PATH = "/nonconformities/list";

/** 경미 부적합/단순조치 종결 대상 경로. 상세의 출처(from) 판별에 사용합니다. */
export const MINOR_CLOSURE_PATH = "/nonconformities/minor-closure";

/**
 * 확정된 부적합의 진행 상태.
 * CAPA 진행 여부는 상태가 아니라 별도의 CAPA 판정(capaVerdict)으로 표현합니다.
 */
export type NonconformityStatus = "open" | "closed" | "invalid";

export const NONCONFORMITY_STATUS_NAME: Record<NonconformityStatus, string> = {
  open: "진행 중",
  closed: "종료",
  invalid: "무효",
};

/** CAPA 판정 결과 표시명(상세 아코디언용). 미판정(undefined)은 별도로 처리합니다. */
export const CAPA_VERDICT_NAME: Record<CapaVerdict, string> = {
  required: "CAPA 필요",
  minor: "경미/단순조치",
};

/**
 * 부적합 목록 "CAPA 판정" 컬럼 표시명.
 * required=필요, minor(경미부적합/단순조치)=불필요, 미판정(undefined)은 별도로 처리합니다.
 */
export const CAPA_JUDGMENT_SHORT: Record<CapaVerdict, string> = {
  required: "필요",
  minor: "불필요",
};

/** 확정된 부적합 한 건. */
export type Nonconformity = {
  id: string;
  /** 부적합 번호(NC-YYYY-NNN). */
  ncNumber: string;
  /** 원 품질 이벤트. */
  event: QualityEvent;
  statusCode: NonconformityStatus;
  statusName: string;
  /** 부적합을 확정한 담당자. */
  confirmedBy: string;
  /** 확정 시각 표시 문자열. */
  confirmedAtLabel: string;
  /** 확정 사유. */
  reason: string;
  /** 검토 단계 AI 소견(있으면). */
  aiAssessment?: AiReviewAssessment;
  /** CAPA 판정 결과. 아직 판정 전이면 undefined. */
  capaVerdict?: CapaVerdict;
  /** CAPA 판정 사유. */
  capaReason?: string;
  /** CAPA 판정자. */
  capaJudgedBy?: string;
  /** CAPA 판정 시각 표시 문자열. */
  capaJudgedAtLabel?: string;
};

/**
 * 부적합 판정 대상 mock 저장소(이벤트 id → 대상).
 * 실제로는 서버가 보관하며, add/get을 API 호출로 교체하면 됩니다.
 * 메모리에만 있으므로 새로고침 시 초기화됩니다.
 */
const targetStore = new Map<number, NonconformityTarget>();

/** 부적합 판정 요청 접수. 같은 이벤트를 다시 요청하면 최신 내용으로 갱신됩니다. */
export function addNonconformityTarget(target: NonconformityTarget) {
  targetStore.set(target.event.id, target);
}

/** 판정이 끝난 대상을 판정 목록에서 제거합니다. */
export function removeJudgmentTarget(eventId: number) {
  targetStore.delete(eventId);
}

/** 확정된 부적합 저장소(id → 부적합). */
const nonconformityStore = new Map<string, Nonconformity>();
let ncSeq = 0;

/** 부적합 확정 등록. NC 번호를 순번으로 부여합니다. */
export function addNonconformity(input: {
  event: QualityEvent;
  statusCode: NonconformityStatus;
  confirmedBy: string;
  confirmedAtLabel: string;
  reason: string;
  aiAssessment?: AiReviewAssessment;
  capaVerdict?: CapaVerdict;
  capaReason?: string;
  capaJudgedBy?: string;
  capaJudgedAtLabel?: string;
}) {
  ncSeq += 1;
  const ncNumber = `NC-2026-${String(ncSeq).padStart(3, "0")}`;
  const id = `nc-${ncNumber}`;
  nonconformityStore.set(id, {
    id,
    ncNumber,
    statusName: NONCONFORMITY_STATUS_NAME[input.statusCode],
    ...input,
  });
}

/**
 * 판정 대상 초기 시드(모듈 로드 시 1회). 데모용으로 몇 건 미리 채웁니다.
 * 실제 서버 연동 시에는 불필요합니다.
 */
const SEED_TARGETS: { id: number; requestedAtLabel: string; reason: string }[] =
  [
    {
      id: 6,
      requestedAtLabel: "2026-03-10 11:00",
      reason: "규격 기준을 반복적으로 벗어나 부적합 판정이 필요합니다.",
    },
    {
      id: 17,
      requestedAtLabel: "2026-03-17 14:20",
      reason: "지상국 통신 단절이 재발해 부적합으로 판단됩니다.",
    },
    {
      id: 25,
      requestedAtLabel: "2026-03-22 09:40",
      reason: "검토 결과 기준 미충족으로 부적합 판정을 요청합니다.",
    },
  ];

function seedNonconformityTargets() {
  for (const seed of SEED_TARGETS) {
    const event = qualityEventData.find((e) => e.id === seed.id) as
      | QualityEvent
      | undefined;
    if (!event) continue;

    targetStore.set(event.id, {
      event,
      requestedBy: event.reviewers[0]?.name ?? event.registrant.userName,
      requestedAtLabel: seed.requestedAtLabel,
      reason: seed.reason,
      aiAssessment: assessQualityEvent(event),
    });
  }
}

seedNonconformityTargets();

/** 확정 부적합 초기 시드(데모용 몇 건). */
const SEED_NONCONFORMITIES: {
  id: number;
  statusCode: NonconformityStatus;
  confirmedAtLabel: string;
  reason: string;
  /** CAPA 판정이 끝난 시드에만 지정(미지정이면 미판정). */
  capa?: {
    verdict: CapaVerdict;
    reason: string;
    judgedAtLabel: string;
  };
}[] = [
  {
    // 진행 중 · CAPA 미판정
    id: 5,
    statusCode: "open",
    confirmedAtLabel: "2026-02-16 10:00",
    reason: "규격 기준 미충족으로 부적합 확정.",
  },
  {
    // 진행 중 · CAPA 필요
    id: 11,
    statusCode: "open",
    confirmedAtLabel: "2026-03-03 15:30",
    reason: "재발 사례로 CAPA 진행이 필요해 부적합 확정.",
    capa: {
      verdict: "required",
      reason: "동일 부적합이 반복 발생해 근본원인 분석과 재발방지가 필요합니다.",
      judgedAtLabel: "2026-03-04 09:10",
    },
  },
  {
    // 종료 · CAPA 불필요(경미부적합/단순조치)
    id: 29,
    statusCode: "closed",
    confirmedAtLabel: "2026-03-13 09:20",
    reason: "부적합 확정 후 시정조치 완료로 종결.",
    capa: {
      verdict: "minor",
      reason: "영향 범위가 제한적이어 경미 부적합/단순조치로 처리했습니다.",
      judgedAtLabel: "2026-03-13 10:05",
    },
  },
  {
    // 무효 · CAPA 미판정
    id: 8,
    statusCode: "invalid",
    confirmedAtLabel: "2026-03-09 14:40",
    reason: "확정 근거가 부족한 것으로 확인되어 부적합을 무효 처리함.",
  },
  {
    // 진행 중 · CAPA 불필요(경미부적합/단순조치) → 종결 대상
    id: 4,
    statusCode: "open",
    confirmedAtLabel: "2026-02-27 16:10",
    reason: "경미한 문서 표기 오류로 부적합 확정.",
    capa: {
      verdict: "minor",
      reason: "영향이 경미하여 단순조치 후 종결 대상으로 분류합니다.",
      judgedAtLabel: "2026-02-28 09:30",
    },
  },
];

function seedNonconformities() {
  for (const seed of SEED_NONCONFORMITIES) {
    const event = qualityEventData.find((e) => e.id === seed.id) as
      | QualityEvent
      | undefined;
    if (!event) continue;

    const judgedBy = event.reviewers[0]?.name ?? event.registrant.userName;
    addNonconformity({
      event,
      statusCode: seed.statusCode,
      confirmedBy: judgedBy,
      confirmedAtLabel: seed.confirmedAtLabel,
      reason: seed.reason,
      aiAssessment: assessQualityEvent(event),
      capaVerdict: seed.capa?.verdict,
      capaReason: seed.capa?.reason,
      capaJudgedBy: seed.capa ? judgedBy : undefined,
      capaJudgedAtLabel: seed.capa?.judgedAtLabel,
    });
  }
}

seedNonconformities();

// ── 데모용 대량 시드(목록 페이지네이션 확인) ──────────────────────
// 실제 서버 연동 시에는 불필요합니다. 품질 이벤트를 순회해 판정 대상/부적합을
// 대량으로 만들어 부적합 판정 대상·부적합 목록·경미 종결 대상·CAPA 계획 등록 대상이
// 모두 여러 페이지 분량이 되게 합니다.
const BULK_ASSIGNEES = [
  "홍길동",
  "박준호",
  "한대희",
  "양형모",
  "서지훈",
  "이우민",
  "김도현",
];

/** k번째 데모 항목의 표시용 일시(yyyy-MM-dd HH:mm). 항목마다 달라 정렬이 드러납니다. */
function bulkDateTime(k: number, baseMonth: number): string {
  const day = (k % 27) + 1;
  const hour = 8 + (k % 10);
  return `2026-${String(baseMonth).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:00`;
}

/** 부적합 판정 대상 대량 시드(앞쪽 이벤트 25건). */
function seedBulkJudgmentTargets() {
  qualityEventData.forEach((event, i) => {
    if (i >= 25) return;
    if (targetStore.has(event.id)) return; // 기존 시드는 유지
    targetStore.set(event.id, {
      event,
      requestedBy: event.reviewers[0]?.name ?? event.registrant.userName,
      requestedAtLabel: bulkDateTime(i, 3),
      reason: "검토 결과 기준 미충족으로 부적합 판정을 요청합니다.",
      aiAssessment: assessQualityEvent(event),
    });
  });
}

/**
 * 확정 부적합 대량 시드(50건). 이벤트는 순환 참조하며,
 * CAPA 판정을 필요/불필요로 번갈아 배정해 CAPA 계획 등록 대상과
 * 경미 종결 대상이 모두 여러 페이지가 되게 합니다.
 */
function seedBulkNonconformities() {
  for (let k = 0; k < 66; k += 1) {
    const event = qualityEventData[k % qualityEventData.length];
    // 2/3=CAPA 필요(진행 중), 1/3=경미/단순조치(진행 중·종료 혼재, 무효 제외).
    // 필요 건을 많게 두어 CAPA 계획 등록 대상·진행 현황이 모두 2페이지가 되게 합니다.
    const required = k % 3 !== 2;
    const verdict: CapaVerdict = required ? "required" : "minor";
    const statusCode: NonconformityStatus = required
      ? "open"
      : k % 4 === 1
        ? "closed"
        : "open";
    const who = BULK_ASSIGNEES[k % BULK_ASSIGNEES.length];
    addNonconformity({
      event,
      statusCode,
      confirmedBy: who,
      confirmedAtLabel: bulkDateTime(k, 2),
      reason: "규격 기준 미충족으로 부적합 확정.",
      aiAssessment: assessQualityEvent(event),
      capaVerdict: verdict,
      capaReason: required
        ? "재발 방지를 위한 시정·예방조치(CAPA)가 필요합니다."
        : "영향 범위가 제한적이어 경미 부적합/단순조치로 처리합니다.",
      capaJudgedBy: who,
      capaJudgedAtLabel: bulkDateTime(k, 3),
    });
  }
}

seedBulkJudgmentTargets();
seedBulkNonconformities();

async function getJudgmentTargets(): Promise<NonconformityTarget[]> {
  // 요청일시가 최신인 건이 위로 오게 정렬합니다("yyyy-MM-dd HH:mm" 문자열이라 사전순 비교로 충분).
  return [...targetStore.values()].sort((a, b) =>
    b.requestedAtLabel.localeCompare(a.requestedAtLabel)
  );
}

/** 부적합 무효: 목록에서 제거합니다. */
export function removeNonconformity(id: string) {
  nonconformityStore.delete(id);
}

/** 부적합 상태 변경(예: CAPA 필요 판정 시 CAPA 진행으로). */
export function setNonconformityStatus(id: string, status: NonconformityStatus) {
  const nc = nonconformityStore.get(id);
  if (!nc) return;
  nonconformityStore.set(id, {
    ...nc,
    statusCode: status,
    statusName: NONCONFORMITY_STATUS_NAME[status],
  });
}

/** CAPA 판정 결과·사유를 부적합에 기록합니다(상세의 부적합 정보에 표시). */
export function recordCapaJudgment(
  id: string,
  input: {
    verdict: CapaVerdict;
    reason: string;
    judgedBy: string;
    judgedAtLabel: string;
  }
) {
  const nc = nonconformityStore.get(id);
  if (!nc) return;
  nonconformityStore.set(id, {
    ...nc,
    capaVerdict: input.verdict,
    capaReason: input.reason,
    capaJudgedBy: input.judgedBy,
    capaJudgedAtLabel: input.judgedAtLabel,
  });
}

/**
 * 부적합 목록 상태 정렬 순서: 진행 중 → 종료 → 무효.
 * 같은 상태 안에서는 부적합 판정일시(confirmedAtLabel)가 최신인 건이 위로 옵니다.
 */
const NC_STATUS_SORT_ORDER: Record<NonconformityStatus, number> = {
  open: 0,
  closed: 1,
  invalid: 2,
};

async function getNonconformities(): Promise<Nonconformity[]> {
  return [...nonconformityStore.values()].sort((a, b) => {
    const statusDiff =
      NC_STATUS_SORT_ORDER[a.statusCode] - NC_STATUS_SORT_ORDER[b.statusCode];
    if (statusDiff !== 0) return statusDiff;
    return b.confirmedAtLabel.localeCompare(a.confirmedAtLabel);
  });
}

/** 동기 조회(다른 모듈의 시드에서 현재 부적합을 읽을 때). */
export function getNonconformitiesSync(): Nonconformity[] {
  return [...nonconformityStore.values()];
}

export function useNonconformities() {
  return useQuery({
    queryKey: nonconformityKeys.list(),
    queryFn: getNonconformities,
  });
}

/** 이벤트 id로 확정 부적합을 조회(부적합 상세의 액션에 사용). */
export function useNonconformityByEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: nonconformityKeys.list(),
    queryFn: getNonconformities,
    enabled: Boolean(eventId),
    select: (list) =>
      list.find((nc) => String(nc.event.id) === eventId) ?? null,
  });
}

/**
 * 경미 부적합/단순조치 종결 대상.
 * CAPA 판정이 "불필요(경미부적합/단순조치)"이면서 아직 진행 중(open)인 부적합이
 * 종결 대상이 됩니다. 종결(closed)·무효(invalid) 건은 대상에서 제외합니다.
 */
function isMinorClosureTarget(nc: Nonconformity): boolean {
  return nc.capaVerdict === "minor" && nc.statusCode === "open";
}

export function useMinorClosureTargets() {
  return useQuery({
    queryKey: nonconformityKeys.list(),
    queryFn: getNonconformities,
    select: (list) => list.filter(isMinorClosureTarget),
  });
}

/** 사이드바 배지용 경미 부적합/단순조치 종결 대상 건수. */
export function useMinorClosureCount() {
  return useQuery({
    queryKey: nonconformityKeys.list(),
    queryFn: getNonconformities,
    select: (list) => list.filter(isMinorClosureTarget).length,
  });
}

export function useNonconformityJudgmentTargets() {
  return useQuery({
    queryKey: nonconformityKeys.judgmentTargets(),
    queryFn: getJudgmentTargets,
  });
}

/** 단일 판정 대상 조회(판정 화면에서 저장된 AI 소견을 가져올 때). */
export function useNonconformityTarget(eventId: string | undefined) {
  return useQuery({
    queryKey: nonconformityKeys.judgmentTargets(),
    queryFn: getJudgmentTargets,
    enabled: Boolean(eventId),
    select: (targets) =>
      targets.find((target) => String(target.event.id) === eventId) ?? null,
  });
}

/** 사이드바 배지용 판정 대상 건수. 목록과 같은 쿼리 키로 캐시를 공유합니다. */
export function useNonconformityJudgmentCount() {
  return useQuery({
    queryKey: nonconformityKeys.judgmentTargets(),
    queryFn: getJudgmentTargets,
    select: (targets) => targets.length,
  });
}
