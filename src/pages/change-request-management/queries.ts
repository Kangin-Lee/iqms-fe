import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { currentUser } from "@/mock/currentUser";
import { reviewers } from "@/mock/reviewers";
import {
  CHANGE_TYPE_OPTIONS,
  TARGET_TYPE_OPTIONS,
  type ChangeRequestValues,
} from "./change-request-register/schema";

/** 승인/검토자 요약(등록 시점 스냅샷). */
export type ChangeRequestPerson = {
  id: string;
  name: string;
  teamName: string;
  positionName: string;
  /** 검토·승인 완료 여부. */
  done: boolean;
};

/** 형상변경요청 레코드. */
export type ChangeRequest = {
  id: number;
  crNumber: string; // CR-YYYY-NNN
  title: string;
  changeType: string; // 변경 구분 코드
  changeTypeName: string;
  /** 긴급 여부. normal=일반, urgent=긴급. */
  grade: "normal" | "urgent";
  /**
   * 1 작성중 / 2 검토승인대기 / 3 보완요청 / 4 반려 / 5 적용대기 / 6 적용중 /
   * 7 적용실패 / 8 검증대기 / 9 검증중 / 10 검증실패 / 11 검증완료 / 12 종료 / 13 취소
   */
  status: number;
  statusName: string;
  requester: string;
  requestDepartment: string;
  requestDate: string;
  requestedApplyDate: string;

  targetType: string; // 변경 대상 유형 코드
  targetTypeName: string;
  targetItem: string;
  currentRevision: string;
  targetRevision: string;
  relatedProject: string;
  relatedProduct: string;
  relatedProcess: string;

  asIs: string;
  toBe: string;
  reason: string;
  linkedRef: string;

  impactScope: string[];
  qualityImpact: string;
  scheduleImpact: string;
  costImpact: string;
  revalidationRequired: string;
  customerApprovalRequired: string;
  urgent: string;
  rollbackPlan: string;

  // 적용 계획
  applyAssignee: string;
  applyDate: string;
  applyMethod: string;
  rollbackNeeded: string;
  deployNeeded: string;
  applyNote: string;

  // 검증 계획
  verifyAssignee: string;
  verifyDate: string;
  verifyMethod: string;
  verifyCriteria: string;
  verifyEvidenceNeeded: string;

  reviewers: ChangeRequestPerson[];
  approvers: ChangeRequestPerson[];
  requestComment: string;

  /** 보완요청 시 사유(검토/승인 과정). */
  supplementReason: string;
  /** 반려 시 사유. */
  rejectReason: string;
  /** 적용 완료 시 결과 메모(선택). */
  applyResultNote: string;
  /** 적용 실패 시 사유(필수). */
  applyFailReason: string;
  /** 검증 완료 시 결과 메모(선택). */
  verifyResultNote: string;
  /** 검증 실패 시 사유(필수). */
  verifyFailReason: string;
  /** 취소 시 사유(필수). */
  cancelReason: string;
};

export const changeRequestKeys = {
  all: ["change-requests"] as const,
  list: () => [...changeRequestKeys.all, "list"] as const,
  detail: (id: number) => [...changeRequestKeys.all, "detail", id] as const,
  myReview: () => [...changeRequestKeys.all, "my-review"] as const,
  applyPending: () => [...changeRequestKeys.all, "apply-pending"] as const,
  verifyPending: () => [...changeRequestKeys.all, "verify-pending"] as const,
  closed: () => [...changeRequestKeys.all, "closed"] as const,
};

const TARGET_TYPE_NAME: Record<string, string> = Object.fromEntries(
  TARGET_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

const CHANGE_TYPE_NAME: Record<string, string> = Object.fromEntries(
  CHANGE_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

const STATUS_NAME: Record<number, string> = {
  1: "작성중",
  2: "검토승인대기",
  3: "보완요청",
  4: "반려",
  5: "적용대기",
  6: "적용중",
  7: "적용실패",
  8: "검증대기",
  9: "검증중",
  10: "검증실패",
  11: "검증완료",
  12: "종료",
  13: "취소",
};

/** 전체 재로딩 전까지 유지되는 인메모리 목업 스토어. */
const changeRequestStore = new Map<number, ChangeRequest>();
let seq = 0;

/** ids → 사람 스냅샷. 앞에서부터 doneCount 명을 완료로 표시합니다. */
function toPeople(ids: string[], doneCount = 0): ChangeRequestPerson[] {
  return ids
    .map((id) => reviewers.find((r) => r.id === id))
    .filter((r): r is (typeof reviewers)[number] => Boolean(r))
    .map((r, i) => ({
      id: r.id,
      name: r.name,
      teamName: r.teamName,
      positionName: r.positionName,
      done: i < doneCount,
    }));
}

/** CR-YYYY-NNN 채번(연도별 3자리). */
function nextCrNumber(): string {
  const year = new Date().getFullYear();
  const countThisYear =
    [...changeRequestStore.values()].filter((c) =>
      c.crNumber.startsWith(`CR-${year}-`)
    ).length + 1;
  return `CR-${year}-${String(countThisYear).padStart(3, "0")}`;
}

/** 폼 값 + id/채번/상태 → 레코드. 저장·수정이 공유합니다. */
function toRecord(
  id: number,
  crNumber: string,
  values: ChangeRequestValues,
  status: number
): ChangeRequest {
  return {
    id,
    crNumber,
    title: values.title,
    changeType: values.changeType,
    changeTypeName: CHANGE_TYPE_NAME[values.changeType] ?? values.changeType,
    grade: values.grade === "urgent" ? "urgent" : "normal",
    status,
    statusName: STATUS_NAME[status] ?? "작성중",
    requester: values.requester,
    requestDepartment: values.requestDepartment,
    requestDate: format(values.requestDate, "yyyy-MM-dd"),
    requestedApplyDate: format(values.requestedApplyDate, "yyyy-MM-dd"),
    targetType: values.targetType,
    targetTypeName: TARGET_TYPE_NAME[values.targetType] ?? values.targetType,
    targetItem: values.targetItem,
    currentRevision: values.currentRevision,
    targetRevision: values.targetRevision,
    relatedProject: values.relatedProject,
    relatedProduct: values.relatedProduct,
    relatedProcess: values.relatedProcess,
    asIs: values.asIs,
    toBe: values.toBe,
    reason: values.reason,
    linkedRef: values.linkedRef,
    impactScope: values.impactScope,
    qualityImpact: values.qualityImpact,
    scheduleImpact: values.scheduleImpact,
    costImpact: values.costImpact,
    revalidationRequired: values.revalidationRequired,
    customerApprovalRequired: values.customerApprovalRequired,
    urgent: values.urgent,
    rollbackPlan: values.rollbackPlan,
    applyAssignee: values.applyAssignee,
    applyDate: values.applyDate ? format(values.applyDate, "yyyy-MM-dd") : "",
    applyMethod: values.applyMethod,
    rollbackNeeded: values.rollbackNeeded,
    deployNeeded: values.deployNeeded,
    applyNote: values.applyNote,
    verifyAssignee: values.verifyAssignee,
    verifyDate: values.verifyDate
      ? format(values.verifyDate, "yyyy-MM-dd")
      : "",
    verifyMethod: values.verifyMethod,
    verifyCriteria: values.verifyCriteria,
    verifyEvidenceNeeded: values.verifyEvidenceNeeded,
    reviewers: toPeople(values.reviewers),
    approvers: toPeople(values.approvers),
    requestComment: values.requestComment,
    supplementReason: "",
    rejectReason: "",
    applyResultNote: "",
    applyFailReason: "",
    verifyResultNote: "",
    verifyFailReason: "",
    cancelReason: "",
  };
}

/**
 * 폼 값을 새 레코드로 저장합니다.
 * status: 1=임시저장(작성중), 2=최종 등록(검토승인대기).
 */
export function saveChangeRequest(
  values: ChangeRequestValues,
  status: number
): ChangeRequest {
  const id = ++seq;
  const record = toRecord(id, nextCrNumber(), values, status);
  changeRequestStore.set(id, record);
  return record;
}

/** 기존 레코드를 폼 값으로 갱신합니다(채번은 유지). */
export function updateChangeRequest(
  id: number,
  values: ChangeRequestValues,
  status: number
): ChangeRequest | undefined {
  const existing = changeRequestStore.get(id);
  if (!existing) return undefined;
  const record = toRecord(id, existing.crNumber, values, status);
  changeRequestStore.set(id, record);
  return record;
}

/** 레코드(스냅샷) → 폼 값. 수정 화면·AI 검토 입력에 사용합니다. */
export function changeRequestToValues(cr: ChangeRequest): ChangeRequestValues {
  const parse = (s: string) => (s ? new Date(s) : undefined);
  return {
    title: cr.title,
    changeType: cr.changeType,
    grade: cr.grade,
    requestDate: parse(cr.requestDate) ?? new Date(),
    requestedApplyDate: parse(cr.requestedApplyDate) ?? new Date(),
    requester: cr.requester,
    requestDepartment: cr.requestDepartment,
    targetType: cr.targetType,
    targetItem: cr.targetItem,
    currentRevision: cr.currentRevision,
    targetRevision: cr.targetRevision,
    relatedProject: cr.relatedProject,
    relatedProduct: cr.relatedProduct,
    relatedProcess: cr.relatedProcess,
    asIs: cr.asIs,
    toBe: cr.toBe,
    reason: cr.reason,
    linkedRef: cr.linkedRef,
    impactScope: cr.impactScope,
    qualityImpact: cr.qualityImpact,
    scheduleImpact: cr.scheduleImpact,
    costImpact: cr.costImpact,
    revalidationRequired: cr.revalidationRequired,
    customerApprovalRequired: cr.customerApprovalRequired,
    urgent: cr.urgent,
    rollbackPlan: cr.rollbackPlan,
    applyAssignee: cr.applyAssignee,
    applyDate: parse(cr.applyDate),
    applyMethod: cr.applyMethod,
    rollbackNeeded: cr.rollbackNeeded,
    deployNeeded: cr.deployNeeded,
    applyNote: cr.applyNote,
    verifyAssignee: cr.verifyAssignee,
    verifyDate: parse(cr.verifyDate),
    verifyMethod: cr.verifyMethod,
    verifyCriteria: cr.verifyCriteria,
    verifyEvidenceNeeded: cr.verifyEvidenceNeeded,
    reviewers: cr.reviewers.map((p) => p.id),
    approvers: cr.approvers.map((p) => p.id),
    requestComment: cr.requestComment,
  };
}

/** 검토자/승인자 중 이름이 일치하는 사람의 완료 여부를 갱신합니다. */
export function setChangeRequestPersonDone(
  id: number,
  role: "reviewer" | "approver",
  name: string,
  done = true
): ChangeRequest | undefined {
  const record = changeRequestStore.get(id);
  if (!record) return undefined;
  const key = role === "reviewer" ? "reviewers" : "approvers";
  const next = {
    ...record,
    [key]: record[key].map((p) =>
      p.name === name ? { ...p, done } : p
    ),
  };
  changeRequestStore.set(id, next);
  return next;
}

/* ------------------------------------------------------------------ */
/* 목업 시드 데이터                                                      */
/* 실제 목록 API가 연결되면 이 블록을 제거하면 됩니다.                   */
/* ------------------------------------------------------------------ */

type MockSeed = {
  title: string;
  changeType: string; // NEW | MODIFY | DELETE
  targetType: string; // TARGET_TYPE_OPTIONS 코드
  targetItem: string;
  grade: "normal" | "urgent";
  status: number;
  requester: string;
  requestDepartment: string;
  requestDate: string;
  requestedApplyDate: string;
  currentRevision: string;
  targetRevision: string;
  applyAssignee: string;
  verifyAssignee: string;
  reviewerIds: string[];
  approverIds: string[];
};

const MOCK_SEEDS: MockSeed[] = [
  {
    title: "위성영상 배포 API 인증 토큰 만료 정책 변경",
    changeType: "MODIFY", targetType: "SOURCE", targetItem: "image-dist-api",
    grade: "urgent", status: 6,
    requester: "홍길동", requestDepartment: "위성영상팀",
    requestDate: "2026-09-01", requestedApplyDate: "2026-09-20",
    currentRevision: "v2.3.1", targetRevision: "v2.4.0",
    applyAssignee: "양형모", verifyAssignee: "이우민",
    reviewerIds: ["r1", "r4"], approverIds: ["r2"],
  },
  {
    title: "관제 시스템 텔레메트리 수집 주기 30초→10초 단축",
    changeType: "MODIFY", targetType: "CONFIG", targetItem: "tm-collector.yaml",
    grade: "urgent", status: 9,
    requester: "강서연", requestDepartment: "위성관제팀",
    requestDate: "2026-08-28", requestedApplyDate: "2026-09-15",
    currentRevision: "r12", targetRevision: "r13",
    applyAssignee: "오세린", verifyAssignee: "박준호",
    reviewerIds: ["r1"], approverIds: ["r7"],
  },
  {
    title: "품질검사 성적서 PDF 양식 로고 및 서명란 개정",
    changeType: "MODIFY", targetType: "DOCUMENT", targetItem: "QC-FORM-014",
    grade: "normal", status: 11,
    requester: "최유진", requestDepartment: "품질관리실",
    requestDate: "2026-08-20", requestedApplyDate: "2026-09-05",
    currentRevision: "1.2", targetRevision: "1.3",
    applyAssignee: "이우민", verifyAssignee: "한대희",
    reviewerIds: ["r2", "r4"], approverIds: ["r1"],
  },
  {
    title: "지상국 안테나 추적 파라미터 테이블 신규 등록",
    changeType: "NEW", targetType: "DB", targetItem: "antenna_track_params",
    grade: "normal", status: 5,
    requester: "양형모", requestDepartment: "운영관리실",
    requestDate: "2026-09-03", requestedApplyDate: "2026-09-25",
    currentRevision: "-", targetRevision: "v1.0",
    applyAssignee: "오세린", verifyAssignee: "강서연",
    reviewerIds: ["r3"], approverIds: ["r7"],
  },
  {
    title: "영상 전처리 파이프라인 노이즈 필터 알고리즘 교체",
    changeType: "MODIFY", targetType: "SOURCE", targetItem: "preprocess-core",
    grade: "normal", status: 2,
    requester: "홍길동", requestDepartment: "위성영상팀",
    requestDate: "2026-09-08", requestedApplyDate: "2026-09-30",
    currentRevision: "v5.1.0", targetRevision: "v5.2.0",
    applyAssignee: "양형모", verifyAssignee: "이우민",
    // 홍길동(r5)은 요청자이자 검토자 → 상세에서 회수·검토 버튼 노출.
    reviewerIds: ["r1", "r5"], approverIds: ["r2"],
  },
  {
    title: "형상관리 절차서 변경요청 승인 단계 재정의",
    changeType: "MODIFY", targetType: "PROCEDURE", targetItem: "PROC-CM-002",
    grade: "normal", status: 3,
    requester: "박준호", requestDepartment: "품질관리실",
    requestDate: "2026-09-06", requestedApplyDate: "2026-09-28",
    currentRevision: "2.0", targetRevision: "2.1",
    applyAssignee: "한대희", verifyAssignee: "최유진",
    reviewerIds: ["r2"], approverIds: ["r6"],
  },
  {
    title: "구버전 관제 로그 수집 스크립트 폐기",
    changeType: "DELETE", targetType: "SOURCE", targetItem: "legacy-log-agent",
    grade: "normal", status: 12,
    requester: "강서연", requestDepartment: "위성관제팀",
    requestDate: "2026-07-15", requestedApplyDate: "2026-08-01",
    currentRevision: "v1.4.2", targetRevision: "-",
    applyAssignee: "오세린", verifyAssignee: "박준호",
    reviewerIds: ["r3", "r7"], approverIds: ["r1"],
  },
  {
    title: "위성 궤도 예측 모델 계수 산출물 개정",
    changeType: "MODIFY", targetType: "DELIVERABLE", targetItem: "orbit-pred-coeff",
    grade: "urgent", status: 7,
    requester: "양형모", requestDepartment: "운영관리실",
    requestDate: "2026-08-30", requestedApplyDate: "2026-09-12",
    currentRevision: "2025Q3", targetRevision: "2025Q4",
    applyAssignee: "오세린", verifyAssignee: "강서연",
    reviewerIds: ["r3"], approverIds: ["r7"],
  },
  {
    title: "검사장비 교정 주기 관리 화면 신규 개발",
    changeType: "NEW", targetType: "DELIVERABLE", targetItem: "calib-mgmt-ui",
    grade: "normal", status: 1,
    requester: "최유진", requestDepartment: "품질관리실",
    requestDate: "2026-09-10", requestedApplyDate: "2026-10-10",
    currentRevision: "-", targetRevision: "v1.0",
    applyAssignee: "이우민", verifyAssignee: "한대희",
    reviewerIds: [], approverIds: [],
  },
  {
    title: "영상 저장소 보존기간 정책 설정 변경",
    changeType: "MODIFY", targetType: "CONFIG", targetItem: "storage-retention",
    grade: "normal", status: 8,
    requester: "홍길동", requestDepartment: "위성영상팀",
    requestDate: "2026-09-02", requestedApplyDate: "2026-09-22",
    currentRevision: "90d", targetRevision: "180d",
    applyAssignee: "양형모", verifyAssignee: "이우민",
    reviewerIds: ["r4"], approverIds: ["r2"],
  },
  {
    title: "관제 알람 임계치 기준 데이터 일괄 수정",
    changeType: "MODIFY", targetType: "DB", targetItem: "alarm_threshold",
    grade: "urgent", status: 10,
    requester: "강서연", requestDepartment: "위성관제팀",
    requestDate: "2026-08-25", requestedApplyDate: "2026-09-10",
    currentRevision: "r7", targetRevision: "r8",
    applyAssignee: "오세린", verifyAssignee: "박준호",
    reviewerIds: ["r3", "r1"], approverIds: ["r7"],
  },
  {
    title: "품질부적합 보고서 결재선 문서 개정",
    changeType: "MODIFY", targetType: "DOCUMENT", targetItem: "QC-DOC-021",
    grade: "normal", status: 4,
    requester: "박준호", requestDepartment: "품질관리실",
    requestDate: "2026-09-04", requestedApplyDate: "2026-09-24",
    currentRevision: "3.0", targetRevision: "3.1",
    applyAssignee: "한대희", verifyAssignee: "최유진",
    reviewerIds: ["r2"], approverIds: ["r6"],
  },
  {
    title: "위성영상 썸네일 생성 해상도 기준 변경",
    changeType: "MODIFY", targetType: "CONFIG", targetItem: "thumb-generator",
    grade: "normal", status: 11,
    requester: "홍길동", requestDepartment: "위성영상팀",
    requestDate: "2026-08-18", requestedApplyDate: "2026-09-02",
    currentRevision: "512px", targetRevision: "1024px",
    applyAssignee: "양형모", verifyAssignee: "이우민",
    reviewerIds: ["r4"], approverIds: ["r2"],
  },
  {
    title: "지상국 이중화 절체 절차 개정",
    changeType: "MODIFY", targetType: "PROCEDURE", targetItem: "PROC-OPS-009",
    grade: "urgent", status: 9,
    requester: "양형모", requestDepartment: "운영관리실",
    requestDate: "2026-09-05", requestedApplyDate: "2026-09-18",
    currentRevision: "1.5", targetRevision: "1.6",
    applyAssignee: "오세린", verifyAssignee: "강서연",
    reviewerIds: ["r3", "r7"], approverIds: ["r1"],
  },
  {
    title: "영상 메타데이터 스키마 필드 추가",
    changeType: "MODIFY", targetType: "DB", targetItem: "image_metadata",
    grade: "normal", status: 6,
    requester: "홍길동", requestDepartment: "위성영상팀",
    requestDate: "2026-09-01", requestedApplyDate: "2026-09-21",
    currentRevision: "v3.0", targetRevision: "v3.1",
    applyAssignee: "이우민", verifyAssignee: "한대희",
    reviewerIds: ["r1", "r4"], approverIds: ["r2"],
  },
  {
    title: "검증 시험 성적 자동 집계 리포트 신규",
    changeType: "NEW", targetType: "DELIVERABLE", targetItem: "verify-report-agg",
    grade: "normal", status: 5,
    requester: "최유진", requestDepartment: "품질관리실",
    requestDate: "2026-09-07", requestedApplyDate: "2026-09-27",
    currentRevision: "-", targetRevision: "v1.0",
    applyAssignee: "한대희", verifyAssignee: "박준호",
    reviewerIds: ["r2"], approverIds: ["r6"],
  },
  {
    title: "관제 대시보드 접근 권한 설정 변경",
    changeType: "MODIFY", targetType: "CONFIG", targetItem: "dashboard-acl",
    grade: "normal", status: 2,
    requester: "강서연", requestDepartment: "위성관제팀",
    requestDate: "2026-09-09", requestedApplyDate: "2026-09-29",
    currentRevision: "v1.1", targetRevision: "v1.2",
    applyAssignee: "오세린", verifyAssignee: "박준호",
    // 홍길동(r5)이 승인자 → 상세에서 승인 버튼 노출.
    reviewerIds: ["r3"], approverIds: ["r7", "r5"],
  },
  {
    title: "노후 검사 지그 관리대장 문서 폐기",
    changeType: "DELETE", targetType: "DOCUMENT", targetItem: "QC-DOC-005",
    grade: "normal", status: 13,
    requester: "박준호", requestDepartment: "품질관리실",
    requestDate: "2026-07-20", requestedApplyDate: "2026-08-05",
    currentRevision: "2.4", targetRevision: "-",
    applyAssignee: "한대희", verifyAssignee: "최유진",
    reviewerIds: ["r2"], approverIds: ["r6"],
  },
  {
    title: "영상 다운링크 스케줄러 로직 개선",
    changeType: "MODIFY", targetType: "SOURCE", targetItem: "downlink-scheduler",
    grade: "urgent", status: 8,
    requester: "양형모", requestDepartment: "운영관리실",
    requestDate: "2026-09-06", requestedApplyDate: "2026-09-19",
    currentRevision: "v4.0.2", targetRevision: "v4.1.0",
    applyAssignee: "오세린", verifyAssignee: "강서연",
    reviewerIds: ["r3", "r1"], approverIds: ["r7"],
  },
  {
    title: "품질 KPI 산출 기준 정의서 개정",
    changeType: "MODIFY", targetType: "DELIVERABLE", targetItem: "quality-kpi-def",
    grade: "normal", status: 12,
    requester: "최유진", requestDepartment: "품질관리실",
    requestDate: "2026-07-25", requestedApplyDate: "2026-08-15",
    currentRevision: "2025.1", targetRevision: "2025.2",
    applyAssignee: "이우민", verifyAssignee: "한대희",
    reviewerIds: ["r2", "r4"], approverIds: ["r1"],
  },
];

/** 상태에 따른 검토 완료 인원 수(진행 단계 반영). */
function reviewedCount(status: number, total: number): number {
  if (total === 0) return 0;
  if (status <= 1) return 0; // 작성중
  if (status === 2) return Math.floor(total / 2); // 검토승인대기: 일부 검토 완료
  return total; // 보완요청·반려·이후 단계: 검토 완료
}

/** 상태에 따른 승인 완료 인원 수(진행 단계 반영). */
function approvedCount(status: number, total: number): number {
  if (total === 0) return 0;
  if (status <= 4) return 0; // 작성중·검토승인대기·보완요청·반려: 승인 전
  return total; // 적용대기 이후: 승인 완료
}

/** 목업 레코드를 스토어에 1회 시드합니다. */
function seedMockChangeRequests() {
  if (changeRequestStore.size > 0) return;
  MOCK_SEEDS.forEach((s, idx) => {
    const id = ++seq;
    const changeTypeName = CHANGE_TYPE_NAME[s.changeType] ?? s.changeType;
    const targetTypeName = TARGET_TYPE_NAME[s.targetType] ?? s.targetType;
    // 상세 화면이 비어 보이지 않도록 본문을 대상 정보로 생성합니다.
    const scope = EXPECTED_SCOPE_BY_TARGET[s.targetType];
    // 진행 단계에 따라 적용·검증 계획 확정 여부를 결정합니다.
    const applied = s.status >= 5; // 적용대기 이후
    const verified = s.status >= 8; // 검증대기 이후
    const needsDeploy = ["SOURCE", "CONFIG", "DB"].includes(s.targetType);
    const needsRollback =
      s.changeType === "DELETE" || ["DB", "CONFIG"].includes(s.targetType);
    const record: ChangeRequest = {
      id,
      crNumber: `CR-2026-${String(idx + 1).padStart(3, "0")}`,
      title: s.title,
      changeType: s.changeType,
      changeTypeName,
      grade: s.grade,
      status: s.status,
      statusName: STATUS_NAME[s.status] ?? "작성중",
      requester: s.requester,
      requestDepartment: s.requestDepartment,
      requestDate: s.requestDate,
      requestedApplyDate: s.requestedApplyDate,
      targetType: s.targetType,
      targetTypeName,
      targetItem: s.targetItem,
      currentRevision: s.currentRevision,
      targetRevision: s.targetRevision,
      relatedProject: "",
      relatedProduct: "",
      relatedProcess: s.requestDepartment,
      asIs: `현재 ${targetTypeName} '${s.targetItem}'은(는) ${s.currentRevision} 기준으로 운영 중이며, 개선·보완이 필요한 상황입니다.`,
      toBe: `${s.targetRevision}(으)로 ${changeTypeName} 반영 후 안정성과 운영 효율이 향상될 것으로 기대합니다.`,
      reason: `${targetTypeName} '${s.targetItem}'의 ${changeTypeName} 요청입니다. 관련 요건 반영을 위해 변경이 필요합니다.`,
      linkedRef: "",
      impactScope: scope.length > 0 ? scope : ["문서/도면"],
      qualityImpact: s.grade === "urgent" ? "높음" : "보통",
      scheduleImpact: s.grade === "urgent" ? "보통" : "낮음",
      costImpact: "낮음",
      revalidationRequired: ["SOURCE", "CONFIG", "DB"].includes(s.targetType)
        ? "예"
        : "아니오",
      customerApprovalRequired: s.grade === "urgent" ? "예" : "아니오",
      urgent: s.grade === "urgent" ? "예" : "아니오",
      rollbackPlan: needsRollback
        ? "변경 전 스냅샷을 확보하고, 문제 발생 시 이전 리비전으로 즉시 롤백합니다."
        : "",
      applyDate: applied ? s.requestedApplyDate : "",
      applyMethod: applied
        ? `${targetTypeName} '${s.targetItem}'을(를) ${s.targetRevision}(으)로 반영하고 변경 이력을 기록합니다.`
        : "",
      rollbackNeeded: needsRollback ? "필요" : "불필요",
      deployNeeded: needsDeploy ? "필요" : "불필요",
      applyNote: "",
      verifyDate: verified ? s.requestedApplyDate : "",
      verifyMethod: verified
        ? "적용 결과를 실제 환경에서 확인하고, 관련 기능 회귀 여부를 점검합니다."
        : "",
      verifyCriteria: verified
        ? "요청 내용대로 정상 동작하며 기존 기능에 영향이 없을 것."
        : "",
      verifyEvidenceNeeded: "필요",
      applyAssignee: s.applyAssignee,
      verifyAssignee: s.verifyAssignee,
      reviewers: toPeople(
        s.reviewerIds,
        reviewedCount(s.status, s.reviewerIds.length)
      ),
      approvers: toPeople(
        s.approverIds,
        approvedCount(s.status, s.approverIds.length)
      ),
      requestComment: "",
      supplementReason:
        s.status === 3
          ? "영향 범위에 검사/시험 항목이 누락되었습니다. 재검증 필요 여부를 재확인하고 검증 기준을 구체화해 주세요."
          : "",
      rejectReason:
        s.status === 4
          ? "변경 사유와 기대효과의 근거가 부족하여 반려합니다. 관련 요건·영향 분석을 보완해 재요청해 주세요."
          : "",
      applyResultNote:
        s.status >= 8
          ? `${s.targetRevision} 반영을 완료했습니다. 배포 및 변경 이력 기록까지 정상 처리되었습니다.`
          : "",
      applyFailReason:
        s.status === 7
          ? "적용 중 의존 모듈 충돌로 오류가 발생해 완료하지 못했습니다. 원인 조치 후 재적용이 필요합니다."
          : "",
      verifyResultNote:
        s.status === 11
          ? "검증 기준 대비 정상 동작을 확인했습니다. 관련 기능 회귀 항목도 이상 없음."
          : "",
      verifyFailReason:
        s.status === 10
          ? "검증 결과 일부 항목이 기준을 충족하지 못했습니다(결과값 불일치). 재작업이 필요합니다."
          : "",
      cancelReason:
        s.status === 13
          ? "상위 계획 변경으로 본 변경이 더 이상 필요하지 않아 요청자가 진행을 중단했습니다."
          : "",
    };
    changeRequestStore.set(id, record);
  });
}

/** 상태 전이(목업). statusName도 함께 갱신합니다. */
export function updateChangeRequestStatus(
  id: number,
  status: number
): ChangeRequest | undefined {
  const record = changeRequestStore.get(id);
  if (!record) return undefined;
  const next = { ...record, status, statusName: STATUS_NAME[status] ?? record.statusName };
  changeRequestStore.set(id, next);
  return next;
}

/** 레코드 삭제(목업). */
export function deleteChangeRequest(id: number): boolean {
  return changeRequestStore.delete(id);
}

/**
 * 검토/승인 결정에 따른 상태 전이 + 사유 기록.
 * 보완요청(3)이면 supplementReason, 반려(4)면 rejectReason에 저장합니다.
 */
export function recordChangeReviewDecision(
  id: number,
  toStatus: number,
  reason: string
): ChangeRequest | undefined {
  const record = changeRequestStore.get(id);
  if (!record) return undefined;
  const next: ChangeRequest = {
    ...record,
    status: toStatus,
    statusName: STATUS_NAME[toStatus] ?? record.statusName,
  };
  if (toStatus === 3) next.supplementReason = reason;
  if (toStatus === 4) next.rejectReason = reason;
  changeRequestStore.set(id, next);
  return next;
}

/**
 * 적용 결과에 따른 상태 전이 + 메모/사유 기록.
 * 적용 완료(8=검증대기)면 applyResultNote(선택), 적용 실패(7)면 applyFailReason.
 */
export function recordApplyResult(
  id: number,
  toStatus: number,
  note: string
): ChangeRequest | undefined {
  const record = changeRequestStore.get(id);
  if (!record) return undefined;
  const next: ChangeRequest = {
    ...record,
    status: toStatus,
    statusName: STATUS_NAME[toStatus] ?? record.statusName,
  };
  if (toStatus === 8) next.applyResultNote = note;
  if (toStatus === 7) next.applyFailReason = note;
  changeRequestStore.set(id, next);
  return next;
}

/**
 * 검증 결과에 따른 상태 전이 + 메모/사유 기록.
 * 검증 완료(11)면 verifyResultNote(선택), 검증 실패(10)면 verifyFailReason.
 */
export function recordVerifyResult(
  id: number,
  toStatus: number,
  note: string
): ChangeRequest | undefined {
  const record = changeRequestStore.get(id);
  if (!record) return undefined;
  const next: ChangeRequest = {
    ...record,
    status: toStatus,
    statusName: STATUS_NAME[toStatus] ?? record.statusName,
  };
  if (toStatus === 11) next.verifyResultNote = note;
  if (toStatus === 10) next.verifyFailReason = note;
  changeRequestStore.set(id, next);
  return next;
}

/** 변경요청 취소(13) + 사유 기록. */
export function cancelChangeRequest(
  id: number,
  reason: string
): ChangeRequest | undefined {
  const record = changeRequestStore.get(id);
  if (!record) return undefined;
  const next: ChangeRequest = {
    ...record,
    status: 13,
    statusName: STATUS_NAME[13] ?? record.statusName,
    cancelReason: reason,
  };
  changeRequestStore.set(id, next);
  return next;
}

function getChangeRequests(): ChangeRequest[] {
  seedMockChangeRequests();
  // 상태 흐름(status 코드 오름차순) → 같은 상태 내에서는 최신 요청일 우선.
  return [...changeRequestStore.values()].sort((a, b) => {
    if (a.status !== b.status) return a.status - b.status;
    return b.requestDate.localeCompare(a.requestDate);
  });
}

export function useChangeRequests() {
  return useQuery({
    queryKey: changeRequestKeys.list(),
    queryFn: getChangeRequests,
  });
}

/** id로 단일 형상변경요청을 조회합니다(상세·수정 화면용). */
export function getChangeRequestById(id: number): ChangeRequest | undefined {
  seedMockChangeRequests();
  return changeRequestStore.get(id);
}

export function useChangeRequest(id: string | undefined) {
  const numericId = Number(id);
  return useQuery({
    queryKey: changeRequestKeys.detail(numericId),
    queryFn: () => getChangeRequestById(numericId) ?? null,
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

/**
 * 현재 사용자가 처리해야 할 검토/승인 대상인지 판단합니다.
 * 검토승인대기(2) 상태에서 내가 검토자(미완료) 또는 승인자(미완료)인 건.
 * 사이드바 배지·내 검토/승인 대상 목록이 이 기준을 공유합니다.
 */
export function isMyChangeReviewPending(cr: ChangeRequest): boolean {
  if (cr.status !== 2) return false;
  const asReviewer = cr.reviewers.some(
    (p) => p.name === currentUser.name && !p.done
  );
  const asApprover = cr.approvers.some(
    (p) => p.name === currentUser.name && !p.done
  );
  return asReviewer || asApprover;
}

function getMyChangeReviews(): ChangeRequest[] {
  seedMockChangeRequests();
  return [...changeRequestStore.values()]
    .filter(isMyChangeReviewPending)
    .sort((a, b) => b.requestDate.localeCompare(a.requestDate));
}

export function useMyChangeReviews() {
  return useQuery({
    queryKey: changeRequestKeys.myReview(),
    queryFn: getMyChangeReviews,
  });
}

/** 사이드바 배지용 건수(같은 쿼리 키 공유, 숫자만 구독). */
export function useMyChangeReviewPendingCount() {
  return useQuery({
    queryKey: changeRequestKeys.myReview(),
    queryFn: getMyChangeReviews,
    select: (list) => list.length,
  });
}

/** 특정 상태들만 요청일 내림차순으로 반환합니다. */
function getByStatuses(statuses: number[]): ChangeRequest[] {
  seedMockChangeRequests();
  return [...changeRequestStore.values()]
    .filter((c) => statuses.includes(c.status))
    .sort((a, b) => b.requestDate.localeCompare(a.requestDate));
}

/** 적용 대기: 적용대기(5). */
export function useApplyPendingChanges() {
  return useQuery({
    queryKey: changeRequestKeys.applyPending(),
    queryFn: () => getByStatuses([5]),
  });
}
export function useApplyPendingCount() {
  return useQuery({
    queryKey: changeRequestKeys.applyPending(),
    queryFn: () => getByStatuses([5]),
    select: (list) => list.length,
  });
}

/** 검증 대기: 검증대기(8). */
export function useVerifyPendingChanges() {
  return useQuery({
    queryKey: changeRequestKeys.verifyPending(),
    queryFn: () => getByStatuses([8]),
  });
}
export function useVerifyPendingCount() {
  return useQuery({
    queryKey: changeRequestKeys.verifyPending(),
    queryFn: () => getByStatuses([8]),
    select: (list) => list.length,
  });
}

/** 변경 종료 이력: 종료(12)·취소(13)·반려(4). */
export function useClosedChanges() {
  return useQuery({
    queryKey: changeRequestKeys.closed(),
    queryFn: () => getByStatuses([12, 13, 4]),
  });
}

/* ------------------------------------------------------------------ */
/* AI 검토 소견 (규칙 기반)                                              */
/* Gemini 키/백엔드가 없어도 동작하도록 규칙 기반으로 소견을 생성합니다.  */
/* 추후 gemini* 함수로 감싸고 실패 시 이 함수로 폴백하면 됩니다.          */
/* ------------------------------------------------------------------ */

export type ReviewFindingStatus = "ok" | "warn" | "risk" | "na";

export type ChangeReviewFinding = {
  label: string;
  status: ReviewFindingStatus;
  message: string;
};

/* ------------------------------------------------------------------ */
/* 검증 판정 소견 (검증 결과 vs 검증 기준 대조)                          */
/* ------------------------------------------------------------------ */

export type VerificationOpinion = {
  /** pass=검증 적합 / fail=검증 부적합 / unclear=판단 불가. */
  verdict: "pass" | "fail" | "unclear";
  confidence: number; // 0~100
  summary: string;
  checks: ChangeReviewFinding[];
  generatedAt: string;
  source: "ai" | "rule";
};

const VERIFY_FAIL_HINT =
  /실패|불합격|오류|에러|미달|불일치|부적합|안\s?됨|안\s?됩|불가|결함|버그|재현|누락|틀림|틀렸|깨짐|미충족/;
const VERIFY_PASS_HINT =
  /통과|합격|정상|충족|일치|성공|이상\s?없|문제\s?없|정상\s?동작|기준\s?만족|양호|완료/;

/**
 * 검증 결과 텍스트를 검증 기준과 대조해 적합/부적합을 사전 판정합니다(규칙 기반).
 * 실제 검증을 수행하지 않으며, 최종 판단은 검증 담당자가 합니다.
 */
export function buildVerificationOpinion(
  cr: ChangeRequest,
  resultText: string
): VerificationOpinion {
  const text = resultText.trim();
  const checks: ChangeReviewFinding[] = [];

  // 검증 기준 정의 여부.
  const hasCriteria = Boolean(cr.verifyCriteria.trim());
  checks.push({
    label: "검증 기준",
    status: hasCriteria ? "ok" : "warn",
    message: hasCriteria
      ? "검증 기준이 정의되어 있어 대조 가능"
      : "검증 기준이 비어 있어 대조가 어려움",
  });

  // 결과 입력 여부.
  if (!text) {
    checks.push({
      label: "검증 결과",
      status: "warn",
      message: "검증 결과가 입력되지 않아 판단할 수 없음",
    });
    return {
      verdict: "unclear",
      confidence: 40,
      summary: "검증 결과가 입력되지 않아 판단을 보류합니다. 결과를 입력해 주세요.",
      checks,
      generatedAt: format(new Date(), "yyyy-MM-dd HH:mm"),
      source: "rule",
    };
  }

  const failHit = VERIFY_FAIL_HINT.test(text);
  const passHit = VERIFY_PASS_HINT.test(text);

  // 증적 필요한데 결과가 지나치게 짧으면 보강 권고.
  if (cr.verifyEvidenceNeeded === "필요" && text.replace(/\s/g, "").length < 15) {
    checks.push({
      label: "검증 증적",
      status: "warn",
      message: "증적이 필요하나 결과 기술이 짧아 보강이 필요",
    });
  }

  let verdict: VerificationOpinion["verdict"];
  if (failHit && !passHit) {
    verdict = "fail";
    checks.push({
      label: "결과-기준 대조",
      status: "risk",
      message: "결과에 기준 미충족·오류 신호가 있어 부적합으로 판단",
    });
  } else if (passHit && !failHit) {
    verdict = "pass";
    checks.push({
      label: "결과-기준 대조",
      status: "ok",
      message: "결과가 기준을 충족하는 것으로 보임",
    });
  } else {
    verdict = "unclear";
    checks.push({
      label: "결과-기준 대조",
      status: "warn",
      message: failHit && passHit
        ? "적합·부적합 신호가 섞여 있어 재확인 필요"
        : "결과 기술만으로 적합 여부가 불명확",
    });
  }

  const warnCount = checks.filter((c) => c.status === "warn").length;
  const confidence =
    verdict === "unclear" ? 45 : Math.max(55, 88 - warnCount * 10);

  const summary =
    verdict === "pass"
      ? "검증 결과가 기준을 충족하는 것으로 보입니다. 검증 완료가 가능합니다."
      : verdict === "fail"
        ? "검증 결과가 기준을 충족하지 못하는 신호가 있습니다. 검증 실패를 검토하세요."
        : "결과만으로 적합 여부를 단정하기 어렵습니다. 검증 담당자가 직접 확인해 주세요.";

  return {
    verdict,
    confidence,
    summary,
    checks,
    generatedAt: format(new Date(), "yyyy-MM-dd HH:mm"),
    source: "rule",
  };
}

/** 검증 판정 라벨. */
export function verificationVerdictLabel(
  v: VerificationOpinion["verdict"]
): string {
  return v === "pass" ? "검증 적합" : v === "fail" ? "검증 부적합" : "판단 불가";
}

/** 검증 판정 소견을 복사용 평문으로 직렬화합니다. */
export function verificationOpinionToText(o: VerificationOpinion): string {
  return [
    "[AI 검증 판정 소견]",
    `판정: ${verificationVerdictLabel(o.verdict)} (신뢰도 ${o.confidence}%)`,
    `요약: ${o.summary}`,
    ...(o.checks.length
      ? ["", "[점검]", ...o.checks.map((c) => `- ${c.label}: ${c.message}`)]
      : []),
    "",
    `생성: ${o.generatedAt} · ${o.source === "ai" ? "AI 분석" : "규칙 기반"}`,
  ].join("\n");
}

export type ChangeReviewOpinion = {
  verdict: "approve" | "revise" | "reject" | "hold";
  confidence: number; // 0~100
  summary: string;
  /** 긴급 여부 검토(요청값 vs 내용 기반 권고). */
  urgency: {
    requested: "일반" | "긴급";
    recommended: "일반" | "긴급";
    rationale: string;
  };
  impactCheck: ChangeReviewFinding[];
  consistency: ChangeReviewFinding[];
  questions: string[];
  insufficientEvidence: boolean;
  generatedAt: string;
  /** 소견 출처: "ai"=Gemini 응답, "rule"=규칙 기반 폴백. */
  source?: "ai" | "rule";
};

/** 변경 대상 유형별로 통상 동반되는 영향 범위(누락 점검 기준). */
const EXPECTED_SCOPE_BY_TARGET: Record<string, string[]> = {
  DOCUMENT: ["문서/도면"],
  SOURCE: ["검사/시험"],
  CONFIG: ["검사/시험"],
  DB: ["검사/시험"],
  PROCEDURE: ["공정", "교육"],
  DELIVERABLE: ["문서/도면", "검사/시험"],
  ETC: [],
};

const VERDICT_LABEL: Record<ChangeReviewOpinion["verdict"], string> = {
  approve: "승인 권고",
  revise: "보완 필요",
  reject: "반려 권고",
  hold: "판단 보류",
};

export function reviewVerdictLabel(v: ChangeReviewOpinion["verdict"]): string {
  return VERDICT_LABEL[v];
}

/** 검토 소견을 복사용 평문으로 직렬화합니다. */
export function changeReviewOpinionToText(o: ChangeReviewOpinion): string {
  const fx = (f: ChangeReviewFinding) => `- ${f.label}: ${f.message}`;
  return [
    "[AI 검토 소견]",
    `판정: ${reviewVerdictLabel(o.verdict)} (신뢰도 ${o.confidence}%)`,
    `요약: ${o.summary}`,
    "",
    `긴급 여부: 요청 ${o.urgency.requested} / AI 권고 ${o.urgency.recommended}`,
    `  ${o.urgency.rationale}`,
    ...(o.impactCheck.length
      ? ["", "[영향범위 점검]", ...o.impactCheck.map(fx)]
      : []),
    ...(o.consistency.length
      ? ["", "[정합성·완성도]", ...o.consistency.map(fx)]
      : []),
    ...(o.questions.length
      ? ["", "[확인 질문]", ...o.questions.map((q, i) => `${i + 1}. ${q}`)]
      : []),
    "",
    `생성: ${o.generatedAt} · ${o.source === "ai" ? "AI 분석" : "규칙 기반"}`,
  ].join("\n");
}

/** 폼 값으로 AI 검토 소견을 생성합니다(규칙 기반, 새 등록 폼 기준). */
export function buildChangeReviewOpinion(
  values: ChangeRequestValues
): ChangeReviewOpinion {
  const requestedUrgency: "일반" | "긴급" =
    values.grade === "urgent" ? "긴급" : "일반";
  // 검토 근거 텍스트: 변경 요청 사유 + 현재 문제점 + 기대효과.
  const text = `${values.reason}\n${values.asIs}\n${values.toBe}`;

  // 근거 부족: 필수인 변경 요청 사유가 지나치게 짧으면 보류.
  const tooShort = values.reason.trim().length < 5;

  const severeHint =
    /안전|리콜|고장|사고|불만|규제|인증|보안|누출|위험|정지|손실|중단|장애/.test(
      text
    );
  const trivialHint =
    /버전|오타|오탈자|문구|표기|주석|라벨|맞춤법|띄어쓰기|사소|단순/.test(text) ||
    text.replace(/\s/g, "").length < 20;

  // --- 긴급 여부 검토 ---
  const urgentSignals: string[] = [];
  if (values.customerApprovalRequired === "예")
    urgentSignals.push("고객·규제 승인 필요");
  if (values.qualityImpact === "높음") urgentSignals.push("품질 영향 높음");
  if (severeHint) urgentSignals.push("본문 위험 신호");
  const recommendedUrgency: "일반" | "긴급" =
    urgentSignals.length > 0 ? "긴급" : "일반";
  const urgencyRationale =
    recommendedUrgency === requestedUrgency
      ? recommendedUrgency === "긴급"
        ? `긴급 신호(${urgentSignals.join(", ")})와 요청이 일치합니다.`
        : "긴급으로 볼 신호가 없어 일반 처리가 적정합니다."
      : recommendedUrgency === "긴급"
        ? `${urgentSignals.join(", ")} 사유로 긴급 처리 재검토를 권고합니다.`
        : "긴급으로 볼 신호가 없어 일반으로도 처리 가능합니다.";

  // --- 영향범위 점검 ---
  const impactCheck: ChangeReviewFinding[] = [];
  const scope = new Set(values.impactScope);
  if (scope.size > 0) {
    impactCheck.push({
      label: values.impactScope.join(", "),
      status: "ok",
      message: "체크 확인됨",
    });
  }
  for (const expected of EXPECTED_SCOPE_BY_TARGET[values.targetType] ?? []) {
    if (!scope.has(expected)) {
      impactCheck.push({
        label: expected,
        status: "warn",
        message: `${TARGET_TYPE_NAME[values.targetType] ?? "해당"} 변경 시 통상 동반되나 미체크`,
      });
    }
  }
  if (/(부품|자재|BOM|소재|재질)/i.test(text) && !scope.has("자재/BOM")) {
    impactCheck.push({
      label: "자재/BOM",
      status: "warn",
      message: "본문에 부품·자재 관련 내용이 있으나 영향범위 미체크",
    });
  }

  // --- 정합성·완성도 ---
  const consistency: ChangeReviewFinding[] = [];

  // 자기신고 영향도 ↔ 본문 교차 점검(과대/과소).
  const declaredHigh =
    requestedUrgency === "긴급" ||
    values.qualityImpact === "높음" ||
    values.costImpact === "높음";
  const hasHardSignal =
    values.customerApprovalRequired === "예" ||
    values.revalidationRequired === "예" ||
    ["SOURCE", "CONFIG", "DB"].includes(values.targetType);
  if (declaredHigh && !hasHardSignal && trivialHint) {
    consistency.push({
      label: "영향도 과대 의심",
      status: "warn",
      message:
        "본문은 경미해 보이나 긴급·품질/원가 높음으로 표기됨 — 재확인 권장",
    });
  } else if (!declaredHigh && severeHint) {
    consistency.push({
      label: "영향도 과소 의심",
      status: "warn",
      message: "본문에 위험 신호가 보이나 일반·낮음으로 표기됨 — 재확인 권장",
    });
  }

  // 재검증: 동작·데이터에 영향을 주는 대상인데 '아니오'
  if (
    values.revalidationRequired === "아니오" &&
    ["SOURCE", "CONFIG", "DB"].includes(values.targetType)
  ) {
    consistency.push({
      label: "재검증",
      status: "warn",
      message: `${TARGET_TYPE_NAME[values.targetType]} 변경은 재검증이 필요할 수 있으나 '아니오'로 표기됨`,
    });
  }

  // 롤백: 삭제·DB/설정 변경은 되돌림 대비가 필요할 수 있음
  const riskyForRollback =
    values.changeType === "DELETE" || ["DB", "CONFIG"].includes(values.targetType);
  if (riskyForRollback && values.rollbackNeeded === "불필요") {
    consistency.push({
      label: "롤백",
      status: "warn",
      message: "삭제·DB/설정 변경은 롤백이 필요할 수 있으나 '불필요'로 표기됨",
    });
  }

  // 적용 방법 완성도
  if (!values.applyMethod.trim()) {
    consistency.push({
      label: "적용 방법",
      status: "warn",
      message: "적용 방법 미작성 — 변경 수행 방법을 기재해 주세요",
    });
  }

  // 검증 계획 완성도
  if (!values.verifyMethod.trim() || !values.verifyCriteria.trim()) {
    consistency.push({
      label: "검증 계획",
      status: "warn",
      message: "검증 방법·기준이 비어 있습니다 — 적용 후 확인 방법을 기재해 주세요",
    });
  } else {
    consistency.push({
      label: "검증 계획",
      status: "ok",
      message: "검증 방법·기준이 작성됨",
    });
  }

  // 기대효과
  if (!values.toBe.trim()) {
    consistency.push({
      label: "기대효과",
      status: "warn",
      message: "기대효과 미작성 — 변경 후 개선 효과를 기재하면 승인 판단에 도움",
    });
  }

  // 내용 정합성
  consistency.push({
    label: "내용 정합성",
    status: tooShort ? "warn" : "ok",
    message: tooShort
      ? "변경 요청 사유 서술이 짧아 검토 근거가 부족"
      : "변경 요청 사유·현재 문제점·기대효과가 서로 정합",
  });

  // --- 승인 전 확인 질문 ---
  const questions: string[] = [];
  if (recommendedUrgency !== requestedUrgency) {
    questions.push("표기한 긴급 여부가 실제 변경 성격과 맞나요?");
  }
  if (impactCheck.some((f) => f.status === "warn")) {
    questions.push("누락된 영향범위(검사/시험·교육 등)를 추가로 검토했나요?");
  }
  if (
    consistency.some((f) => f.label === "검증 계획" && f.status === "warn")
  ) {
    questions.push("적용 후 정상 동작을 어떻게 확인할지(검증 방법·기준) 정해졌나요?");
  }
  if (consistency.some((f) => f.label === "롤백" && f.status === "warn")) {
    questions.push("문제 발생 시 되돌릴 롤백 절차가 준비되어 있나요?");
  }
  if (questions.length === 0) {
    questions.push("적용 담당자·적용 예정일과 승인자가 확정되었나요?");
  }

  // --- 종합 판정 ---
  const findings = [...impactCheck, ...consistency];
  const warnCount = findings.filter((f) => f.status === "warn").length;
  const riskCount = findings.filter((f) => f.status === "risk").length;
  const urgencyMismatch = recommendedUrgency !== requestedUrgency;

  let verdict: ChangeReviewOpinion["verdict"];
  if (tooShort) verdict = "hold";
  else if (riskCount > 0) verdict = "reject";
  else if (warnCount > 0 || urgencyMismatch) verdict = "revise";
  else verdict = "approve";

  const confidence = tooShort
    ? 40
    : Math.max(55, 92 - warnCount * 7 - (urgencyMismatch ? 6 : 0));

  const summary = tooShort
    ? "변경 요청 사유가 부족해 판단을 보류합니다. 사유를 보완해 주세요."
    : verdict === "approve"
      ? "주요 리스크가 확인되지 않았습니다. 승인 진행이 가능합니다."
      : `변경 방향은 타당하나, ${urgencyMismatch ? "긴급 여부 재검토와 " : ""}점검 ${warnCount}건에 대한 확인이 필요합니다.`;

  return {
    verdict,
    confidence,
    summary,
    urgency: {
      requested: requestedUrgency,
      recommended: recommendedUrgency,
      rationale: urgencyRationale,
    },
    impactCheck,
    consistency,
    questions,
    insufficientEvidence: tooShort,
    generatedAt: format(new Date(), "yyyy-MM-dd HH:mm"),
    source: "rule",
  };
}
