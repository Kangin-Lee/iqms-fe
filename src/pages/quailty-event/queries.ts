import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { currentUser } from "@/mock/currentUser";
import { qualityEventData } from "@/mock/quailty-event/quailtyEventData";
import { reviewers } from "@/mock/reviewers";
import type { RegisterValues } from "./quailty-event-register/schema";

export type QualityEventFile = {
  id: string;
  name: string;
  url: string;
  size: number;
};

export type QualityEventReviewer = {
  id: string;
  name: string;
  teamName: string;
  positionName: string;
  reviewed: boolean;
};

export type QualityEvent = {
  id: number;
  eventNumber: string;
  title: string;
  /** INTERNAL_ISSUE, PROCESS_DEVIATION 등 코드값. 라벨 매핑은 화면에서 처리합니다. */
  eventType: string;
  /** 1 작성중 / 2 검토중 / 3 종료 / 4 반려 */
  status: number;
  statusName: string;
  /** HIGH / MEDIUM / LOW */
  severity: string;
  registrant: { userName: string };
  registrationDepartment: string;
  occurrenceDate: string;
  discoveryDate: string;
  description: string;
  relatedProject: string;
  relatedProduct: string;
  relatedProcess: string;
  files: QualityEventFile[];
  customerImpact: string;
  businessImpact: string;
  immediateActionRequired: string;
  immediateActionContent: string;
  reviewers: QualityEventReviewer[];
  registrationComment: string;
  registerDate: string;
};

export const qualityEventKeys = {
  all: ["qualityEvents"] as const,
  list: () => [...qualityEventKeys.all, "list"] as const,
  my: () => [...qualityEventKeys.all, "my"] as const,
  myReview: () => [...qualityEventKeys.all, "myReview"] as const,
  detail: (id: string) => [...qualityEventKeys.all, "detail", id] as const,
  reviews: (id: string) => [...qualityEventKeys.all, "reviews", id] as const,
};

/** 검토자가 내린 결정 종류. */
export type ReviewDecision = "complete" | "nonconformity" | "reject";

/** 검토 이력 한 건(결정 + 사유 + 당시 AI 소견). */
export type ReviewRecord = {
  id: string;
  decision: ReviewDecision;
  reason: string;
  reviewer: string;
  /** 생성 시각 표시 문자열(렌더 중 Date 사용을 피하려 저장 시점에 포맷). */
  createdAtLabel: string;
  /** 결정 당시 AI 소견 결론. AI를 돌리지 않았으면 없음. */
  aiVerdict?: AiReviewVerdict;
  /** 결정 당시 AI 소견 요약. */
  aiSummary?: string;
};

/** 결정별 표시 라벨/배지. 다이얼로그와 이력 화면이 공유합니다. */
export const REVIEW_DECISION_META: Record<
  ReviewDecision,
  { label: string; badge: "default" | "destructive" | "secondary" }
> = {
  complete: { label: "검토 완료", badge: "default" },
  nonconformity: { label: "부적합 판정 요청", badge: "destructive" },
  reject: { label: "반려", badge: "secondary" },
};

/**
 * 검토 이력 mock 저장소(이벤트 id → 이력 목록).
 * 실제로는 서버가 보관하며, 아래 add/get을 API 호출로 교체하면 됩니다.
 * 메모리에만 있으므로 새로고침 시 초기화됩니다.
 */
const reviewRecordStore = new Map<string, ReviewRecord[]>();
let reviewRecordSeq = 0;

export function addReviewRecord(
  eventId: string,
  input: Omit<ReviewRecord, "id">
) {
  const prev = reviewRecordStore.get(eventId) ?? [];
  reviewRecordStore.set(eventId, [
    ...prev,
    { id: `rr-${(reviewRecordSeq += 1)}`, ...input },
  ]);
}

/** 검토 이력(댓글) 사유 수정. */
export function updateReviewRecord(
  eventId: string,
  recordId: string,
  reason: string
) {
  const records = reviewRecordStore.get(eventId);
  if (!records) return;
  reviewRecordStore.set(
    eventId,
    records.map((r) => (r.id === recordId ? { ...r, reason } : r))
  );
}

/**
 * 검토 이력(댓글) 삭제.
 * 삭제된 이력을 반환합니다(검토 취소 후처리에 결정/작성자가 필요).
 */
export function deleteReviewRecord(
  eventId: string,
  recordId: string
): ReviewRecord | null {
  const records = reviewRecordStore.get(eventId);
  if (!records) return null;
  const removed = records.find((r) => r.id === recordId) ?? null;
  reviewRecordStore.set(
    eventId,
    records.filter((r) => r.id !== recordId)
  );
  return removed;
}

/**
 * 검토자의 "검토 완료" 표시를 되돌립니다(검토 취소 시).
 * mock 데이터(qualityEventData)를 직접 수정하므로, 호출 후 관련 쿼리를
 * 무효화해야 목록·검토 버튼·사이드바 배지가 함께 갱신됩니다.
 * 실제 API에서는 서버가 검토 취소를 처리하므로 이 헬퍼는 사라집니다.
 */
export function setReviewerReviewed(
  eventId: number,
  reviewerName: string,
  reviewed: boolean
) {
  const event = qualityEventData.find((e) => e.id === eventId);
  const reviewer = event?.reviewers.find((r) => r.name === reviewerName);
  if (reviewer) reviewer.reviewed = reviewed;
}

/**
 * 연결된 CAPA가 종료되면 원 품질 이벤트를 최종 종료(status 3) 처리합니다.
 * mock 데이터(qualityEventData)를 직접 수정하므로, 호출 후 품질 이벤트 관련
 * 쿼리를 무효화해야 목록·상세가 함께 갱신됩니다.
 * 실제 API에서는 CAPA 종료 트랜잭션이 이벤트 종료까지 함께 처리합니다.
 */
export function closeQualityEvent(eventId: number) {
  const event = qualityEventData.find((e) => e.id === eventId);
  if (!event) return;
  event.status = 3;
  event.statusName = "종료";
}

/** 상태 코드 → 표시명. */
const EVENT_STATUS_NAME: Record<number, string> = {
  1: "작성중",
  2: "검토중",
  3: "종료",
  4: "반려",
};

/** 등록 폼 심각도(경미/보통/중대) → 저장용 코드(LOW/MEDIUM/HIGH). */
const SEVERITY_TO_CODE: Record<string, string> = {
  경미: "LOW",
  보통: "MEDIUM",
  중대: "HIGH",
};

/** id로 품질 이벤트를 동기 조회합니다(수정 폼 프리필용). */
export function findQualityEvent(id: number) {
  return qualityEventData.find((e) => e.id === id);
}

/** QE-YYYY-NNN 형식의 다음 이벤트 번호를 부여합니다. */
function nextEventNumber(): string {
  const prefix = `QE-${new Date().getFullYear()}-`;
  const maxSeq = qualityEventData
    .filter((e) => e.eventNumber.startsWith(prefix))
    .reduce((max, e) => {
      const n = Number(e.eventNumber.slice(prefix.length));
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

/**
 * 품질 이벤트를 저장합니다.
 * - status 1(작성중): 임시저장. status 2(검토중): 최종 등록.
 * - existingId가 있으면 해당 이벤트를 수정하고, 없으면 새로 추가합니다.
 * mock 데이터(qualityEventData)를 직접 수정하므로 호출 후 관련 쿼리를 무효화하세요.
 */
export function saveQualityEvent(
  values: RegisterValues,
  status: number,
  existingId?: number
): QualityEvent {
  const files: QualityEventFile[] = values.attachments.map((f, i) => ({
    id: `file-${Date.now()}-${i}`,
    name: f.name,
    url: "#",
    size: f.size,
  }));

  const mappedReviewers: QualityEventReviewer[] = values.reviewers
    .map((id) => reviewers.find((r) => r.id === id))
    .filter((r): r is (typeof reviewers)[number] => Boolean(r))
    .map((r) => ({
      id: r.id,
      name: r.name,
      teamName: r.teamName,
      positionName: r.positionName,
      reviewed: false,
    }));

  const base = {
    title: values.title,
    eventType: values.eventType,
    severity: SEVERITY_TO_CODE[values.severity] ?? values.severity,
    registrant: { userName: values.registrant },
    registrationDepartment: values.registrationDepartment,
    occurrenceDate: format(values.occurrenceDate, "yyyy-MM-dd"),
    discoveryDate: format(values.discoveryDate, "yyyy-MM-dd"),
    description: values.description,
    relatedProject: values.relatedProject,
    relatedProduct: values.relatedProduct,
    relatedProcess: values.relatedProcess,
    businessImpact: values.businessImpact,
    immediateActionRequired: values.immediateActionRequired,
    reviewers: mappedReviewers,
    registrationComment: values.registrationComment,
    status,
    statusName: EVENT_STATUS_NAME[status] ?? "작성중",
  };

  // 수정: 기존 이벤트를 갱신(번호·등록일 유지, 첨부는 새로 올린 게 있을 때만 교체).
  if (existingId != null) {
    const target = qualityEventData.find((e) => e.id === existingId);
    if (target) {
      Object.assign(target, base, {
        files: files.length ? files : target.files,
      });
      return target as QualityEvent;
    }
  }

  // 신규 추가.
  const newId = qualityEventData.reduce((max, e) => Math.max(max, e.id), 0) + 1;
  const event = {
    id: newId,
    eventNumber: nextEventNumber(),
    ...base,
    files,
    customerImpact: "아니오",
    immediateActionContent: "",
    registerDate: format(new Date(), "yyyy-MM-dd"),
  };
  qualityEventData.push(event as (typeof qualityEventData)[number]);
  return event as QualityEvent;
}

async function getReviewRecords(eventId: string): Promise<ReviewRecord[]> {
  return reviewRecordStore.get(eventId) ?? [];
}

export function useReviewRecords(id: string | undefined) {
  return useQuery({
    queryKey: qualityEventKeys.reviews(id ?? ""),
    queryFn: () => getReviewRecords(id!),
    enabled: Boolean(id),
  });
}

/**
 * mock 이벤트의 기존 상태에서 검토 이력을 초기 시드합니다(모듈 로드 시 1회).
 * - reviewed=true 검토자 → "검토 완료" 이력
 * - 반려(status 4) → "반려" 이력 (mock은 반려 시 reviewed를 남기지 않으므로 담당 검토자 기준)
 * - 종료(status 3)인데 reviewed가 없는 경우 → 담당 검토자의 "검토 완료" 이력
 * 실제 서버 연동 시에는 이 시드가 필요 없습니다(서버가 이력을 보관).
 */
function seedReviewRecords() {
  const STATUS_CLOSED = 3;
  const STATUS_REJECTED = 4;

  for (const event of qualityEventData) {
    const drafts: Omit<ReviewRecord, "id" | "createdAtLabel">[] = [];

    for (const reviewer of event.reviewers) {
      if (reviewer.reviewed) {
        drafts.push({
          decision: "complete",
          reason: "검토 완료했습니다.",
          reviewer: reviewer.name,
        });
      }
    }

    if (event.status === STATUS_REJECTED) {
      drafts.push({
        decision: "reject",
        reason: "반려 처리했습니다. 보완 후 재상신 바랍니다.",
        reviewer: event.reviewers[0]?.name ?? event.registrant.userName,
      });
    } else if (
      event.status === STATUS_CLOSED &&
      !event.reviewers.some((r) => r.reviewed)
    ) {
      drafts.push({
        decision: "complete",
        reason: "검토 완료했습니다.",
        reviewer: event.reviewers[0]?.name ?? event.registrant.userName,
      });
    }

    if (drafts.length === 0) continue;

    // 등록일 기준으로 순서만 구분되게 시각을 부여합니다(정확한 시각은 mock에 없음).
    reviewRecordStore.set(
      String(event.id),
      drafts.map((draft, index) => ({
        id: `rr-seed-${event.id}-${index}`,
        ...draft,
        createdAtLabel: `${event.registerDate} ${String(9 + index).padStart(2, "0")}:00`,
      }))
    );
  }
}

seedReviewRecords();

/**
 * 아래 두 함수가 mock ↔ 실제 API 교체 지점입니다.
 * 서버가 준비되면 본문만 apiClient 호출로 바꾸면 되고, 화면 코드는 그대로 둡니다.
 *
 *   import { apiClient } from "@/lib/api-client";
 *
 *   const { data } = await apiClient.get<QualityEvent[]>("/quality-events");
 *   return data;
 *
 *   const { data } = await apiClient.get<QualityEvent[]>("/quality-events/my");
 *   return data;
 *
 *   const { data } = await apiClient.get<QualityEvent>(`/quality-events/${id}`);
 *   return data;
 */
/**
 * 목록 정렬 기준: 상태 그룹(작성중 → 검토중 → 종료 → 반려) 순으로 묶고,
 * 같은 상태 안에서는 등록일이 최근인 건이 위로 오게 합니다.
 * 실제 API 연동 시에는 서버 정렬로 대체하고 이 헬퍼는 제거하면 됩니다.
 */
const STATUS_SORT_ORDER: Record<number, number> = {
  1: 0, // 작성중
  2: 1, // 검토중
  3: 2, // 종료
  4: 3, // 반려
};

function sortQualityEvents(events: QualityEvent[]): QualityEvent[] {
  return [...events].sort((a, b) => {
    const statusDiff =
      (STATUS_SORT_ORDER[a.status] ?? 99) - (STATUS_SORT_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    // 등록일 내림차순(최근이 먼저). yyyy-MM-dd 문자열이라 사전순 비교로 충분합니다.
    return b.registerDate.localeCompare(a.registerDate);
  });
}

async function getQualityEvents(): Promise<QualityEvent[]> {
  return sortQualityEvents(qualityEventData);
}

/**
 * 로그인 사용자가 등록한 이벤트만 반환합니다.
 * 실제 API에서는 서버가 인증 주체로 필터링하므로 currentUser 참조가 사라집니다.
 */
/** 내가 등록한 이벤트인지. 회수 버튼 노출 조건입니다. */
export function isMyQualityEvent(event: QualityEvent) {
  return event.registrant.userName === currentUser.name;
}

async function getMyQualityEvents(): Promise<QualityEvent[]> {
  return sortQualityEvents(qualityEventData.filter(isMyQualityEvent));
}

/** 검토 요청이 진행 중인 상태(2 검토중). */
const STATUS_IN_REVIEW = 2;

/**
 * 내 검토가 실제로 필요한 건인지 판단합니다.
 * 작성중(제출 전)·종료·반려는 내 액션이 남아 있지 않으므로 제외합니다.
 *
 * 사이드바 배지, 내 검토 대상 목록, 상세의 검토/반려 버튼이 모두 이 기준을 씁니다.
 */
export function isMyReviewPending(event: QualityEvent) {
  return (
    event.status === STATUS_IN_REVIEW &&
    event.reviewers.some(
      (reviewer) => reviewer.name === currentUser.name && !reviewer.reviewed
    )
  );
}

async function getMyReviewEvents(): Promise<QualityEvent[]> {
  // 모두 검토중이라, 상태 정렬은 사실상 등록일 내림차순(최근이 위)이 됩니다.
  return sortQualityEvents(qualityEventData.filter(isMyReviewPending));
}

/** AI 소견 결론. 결정이 아니라 검토자를 돕는 참고값입니다. */
export type AiReviewVerdict = "suspect" | "normal" | "insufficient";

/** AI 소견 결론별 표시 라벨/배지. 다이얼로그와 이력 화면이 공유합니다. */
export const AI_VERDICT_META: Record<
  AiReviewVerdict,
  { label: string; badge: "destructive" | "secondary" | "outline" }
> = {
  suspect: { label: "부적합 의심", badge: "destructive" },
  insufficient: { label: "정보 부족", badge: "secondary" },
  normal: { label: "정상 추정", badge: "outline" },
};

/** 판단 근거 한 건. 어떤 항목의(label) 어떤 값을(value) 왜(detail) 신호로 봤는지. */
export type AiReviewSignal = {
  /** 유형: 부적합 의심 / 정보 부족 */
  kind: "risk" | "missing";
  label: string;
  value: string;
  detail: string;
};

export type AiReviewAssessment = {
  verdict: AiReviewVerdict;
  /** 왜 이 결론인지 한 줄 설명. */
  summary: string;
  /** 판단 근거(신호 목록). 검토자에게 그대로 노출됩니다. */
  signals: AiReviewSignal[];
};

/** 신호 기반 AI 소견(검토·CAPA 판정)을 복사용 평문으로 직렬화합니다. */
export function aiSignalOpinionToText(
  verdictLabel: string,
  summary: string,
  signals: AiReviewSignal[]
): string {
  return [
    "[AI 소견]",
    `판정: ${verdictLabel}`,
    `요약: ${summary}`,
    ...(signals.length
      ? [
          "",
          `[판단 근거 (${signals.length})]`,
          ...signals.map(
            (s) =>
              `- [${s.kind === "risk" ? "위험" : "정보"}] ${s.label}: ${s.value} — ${s.detail}`
          ),
        ]
      : []),
  ].join("\n");
}

/**
 * 규칙 기반 AI 소견 stub.
 * 실제 모델이 붙으면 이 함수만 비동기 호출로 교체하면 됩니다.
 * 어디까지나 참고용 소견이며, 검토/반려/부적합 결정은 검토자가 합니다.
 *
 * 각 신호는 "무엇을 보고(value) 왜 그렇게 판단했는지(detail)"를 함께 담아,
 * 검토자가 소견의 근거를 그대로 확인할 수 있게 합니다.
 */
export function assessQualityEvent(event: QualityEvent): AiReviewAssessment {
  const risk: AiReviewSignal[] = [];
  const missing: AiReviewSignal[] = [];

  // ── 부적합 의심 신호 ──────────────────────────────
  if (event.severity === "HIGH") {
    risk.push({
      kind: "risk",
      label: "심각도",
      value: "높음",
      detail:
        "'높음'은 제품·서비스에 중대한 영향을 줄 수 있는 등급으로, 부적합으로 이어질 가능성이 큽니다.",
    });
  }
  if (event.customerImpact === "예") {
    risk.push({
      kind: "risk",
      label: "고객 영향",
      value: "있음",
      detail:
        "고객에게 영향이 미치는 사안은 부적합 관리 대상이 될 가능성이 높습니다.",
    });
  }
  if (event.businessImpact === "높음") {
    risk.push({
      kind: "risk",
      label: "사업 영향도",
      value: "높음",
      detail: "사업 영향이 큰 사안은 그대로 종결하기보다 정식 처리가 필요합니다.",
    });
  }
  if (event.immediateActionRequired === "예") {
    risk.push({
      kind: "risk",
      label: "즉시조치 필요",
      value: "예",
      detail:
        "즉시조치가 필요하다고 표시된 것은 현장에서 이미 문제를 인지했다는 신호입니다.",
    });
  }

  // ── 정보 부족(반려 권고) 신호 ─────────────────────
  if (
    event.immediateActionRequired === "예" &&
    !event.immediateActionContent.trim()
  ) {
    missing.push({
      kind: "missing",
      label: "즉시조치 내용",
      value: "미기재",
      detail:
        "즉시조치가 필요하다고 했으나 실제 조치 내용이 비어 있어 확인이 필요합니다.",
    });
  }
  const descLength = event.description.trim().length;
  if (descLength < 20) {
    missing.push({
      kind: "missing",
      label: "이벤트 설명",
      value: `${descLength}자`,
      detail: "설명이 짧아 발생 원인·경위를 판단하기 어렵습니다.",
    });
  }
  if (!event.files || event.files.length === 0) {
    missing.push({
      kind: "missing",
      label: "첨부파일",
      value: "없음",
      detail: "근거 자료가 없어 실제 상황을 검증하기 어렵습니다.",
    });
  }

  if (missing.length >= 2) {
    return {
      verdict: "insufficient",
      summary: `판단에 필요한 정보가 ${missing.length}건 부족해, 보완을 위한 반려를 검토할 만합니다.`,
      signals: [...missing, ...risk],
    };
  }
  if (risk.length >= 2) {
    return {
      verdict: "suspect",
      summary: `부적합을 시사하는 신호가 ${risk.length}건 확인되어 부적합 가능성이 높다고 판단했습니다.`,
      signals: [...risk, ...missing],
    };
  }
  return {
    verdict: "normal",
    summary:
      risk.length + missing.length > 0
        ? "일부 신호가 있으나 부적합으로 볼 만큼은 아니라고 판단했습니다."
        : "부적합을 시사하는 신호가 없어 정상으로 추정했습니다.",
    signals: [...risk, ...missing],
  };
}

/** CAPA 필요 여부 소견 결론. */
export type CapaVerdict = "required" | "minor";

export type CapaAssessment = {
  verdict: CapaVerdict;
  summary: string;
  signals: AiReviewSignal[];
};

/**
 * 규칙 기반 CAPA 필요 여부 소견 stub.
 * 중대한 위험 요인이 여러 개면 CAPA(시정·예방조치)가 필요,
 * 그렇지 않으면 경미 부적합/단순조치로 처리 가능하다고 봅니다.
 */
export function assessCapaNeed(event: QualityEvent): CapaAssessment {
  const signals: AiReviewSignal[] = [];

  if (event.severity === "HIGH") {
    signals.push({
      kind: "risk",
      label: "심각도",
      value: "높음",
      detail:
        "중대한 영향 등급으로 근본원인 분석과 재발방지(CAPA)가 필요합니다.",
    });
  }
  if (event.customerImpact === "예") {
    signals.push({
      kind: "risk",
      label: "고객 영향",
      value: "있음",
      detail: "고객 영향 사안은 시정·예방조치로 재발을 막아야 합니다.",
    });
  }
  if (event.businessImpact === "높음") {
    signals.push({
      kind: "risk",
      label: "사업 영향도",
      value: "높음",
      detail: "사업 영향이 커 단순 조치로 종결하기 어렵습니다.",
    });
  }
  if (event.immediateActionRequired === "예") {
    signals.push({
      kind: "risk",
      label: "즉시조치 필요",
      value: "예",
      detail: "즉시조치가 필요했던 사안으로 구조적 대응이 요구됩니다.",
    });
  }

  if (signals.length >= 2) {
    return {
      verdict: "required",
      summary: `위험 요인이 ${signals.length}건 확인되어 CAPA(시정·예방조치)가 필요하다고 판단했습니다.`,
      signals,
    };
  }

  if (signals.length === 0) {
    signals.push({
      kind: "missing",
      label: "위험 요인",
      value: "낮음",
      detail: "심각도·영향이 낮아 경미 부적합/단순조치로 종결 가능해 보입니다.",
    });
  }
  return {
    verdict: "minor",
    summary:
      "중대한 위험 요인이 적어 CAPA 없이 경미 부적합/단순조치로 처리할 수 있어 보입니다.",
    signals,
  };
}

/** 대상이 없으면 null을 반환합니다(에러가 아니라 "없음" 상태). */
async function getQualityEvent(id: string): Promise<QualityEvent | null> {
  return qualityEventData.find((event) => String(event.id) === id) ?? null;
}

export function useQualityEvents() {
  return useQuery({
    queryKey: qualityEventKeys.list(),
    queryFn: getQualityEvents,
  });
}

export function useMyQualityEvents() {
  return useQuery({
    queryKey: qualityEventKeys.my(),
    queryFn: getMyQualityEvents,
  });
}

export function useMyReviewEvents() {
  return useQuery({
    queryKey: qualityEventKeys.myReview(),
    queryFn: getMyReviewEvents,
  });
}

/**
 * 사이드바 배지용 미처리 건수.
 * useMyReviewEvents와 같은 쿼리 키를 쓰므로 캐시를 공유하고,
 * select로 숫자만 구독해 목록 내용이 바뀌어도 건수가 같으면 재렌더하지 않습니다.
 */
export function useMyReviewPendingCount() {
  return useQuery({
    queryKey: qualityEventKeys.myReview(),
    queryFn: getMyReviewEvents,
    select: (events) => events.length,
  });
}

export function useQualityEvent(id: string | undefined) {
  return useQuery({
    queryKey: qualityEventKeys.detail(id ?? ""),
    queryFn: () => getQualityEvent(id!),
    // id가 없으면(잘못된 URL) 호출하지 않습니다.
    enabled: Boolean(id),
  });
}
