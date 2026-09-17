import { z } from "zod";

/**
 * 변경 구분: 값은 코드, 화면 표시는 한글 라벨.
 * (내부 필드명은 changeType을 그대로 사용합니다 — 추후 정리 예정)
 */
export const CHANGE_TYPE_OPTIONS = [
  { value: "NEW", label: "신규" },
  { value: "MODIFY", label: "수정" },
  { value: "DELETE", label: "삭제" },
] as const;

/**
 * 긴급 여부(라디오). 값=코드, 라벨=표시.
 * (내부 필드명은 grade를 그대로 사용합니다 — 추후 정리 예정)
 */
export const GRADE_OPTIONS = [
  { value: "normal", label: "일반" },
  { value: "urgent", label: "긴급" },
] as const;

/** 변경 대상 유형: 값은 코드, 화면 표시는 한글 라벨. */
export const TARGET_TYPE_OPTIONS = [
  { value: "DOCUMENT", label: "문서" },
  { value: "SOURCE", label: "소스" },
  { value: "CONFIG", label: "설정" },
  { value: "DB", label: "DB" },
  { value: "PROCEDURE", label: "절차" },
  { value: "DELIVERABLE", label: "산출물" },
  { value: "ETC", label: "기타" },
] as const;

/** 영향 범위(체크박스, 다중). 값=라벨 그대로 사용. */
export const IMPACT_SCOPE_OPTIONS = [
  "문서/도면",
  "설계/사양",
  "공정",
  "검사/시험",
  "자재/BOM",
  "설비",
  "교육",
  "고객 승인",
] as const;

/** 영향 정도 라디오(품질/일정/원가 공통). */
export const IMPACT_LEVEL_OPTIONS = ["낮음", "보통", "높음"] as const;
/** 예/아니오 라디오. */
export const YES_NO_OPTIONS = ["예", "아니오"] as const;
/** 필요/불필요 라디오. */
export const NEED_OPTIONS = ["필요", "불필요"] as const;

export const changeRequestSchema = z.object({
  // A. 기본 정보
  title: z.string().min(1, "변경요청 제목을 입력해 주세요."),
  changeType: z.string().min(1, "변경 구분을 선택해 주세요."),
  grade: z.string().min(1, "긴급 여부를 선택해 주세요."),
  requestDate: z.date({ error: "요청일을 선택해 주세요." }),
  requestedApplyDate: z.date({ error: "희망 완료일을 선택해 주세요." }),
  // 읽기 전용(본인)
  requester: z.string(),
  requestDepartment: z.string(),

  // B. 변경 대상(형상 항목)
  targetType: z.string().min(1, "변경 대상 유형을 선택해 주세요."),
  targetItem: z.string().min(1, "대상 형상항목을 입력해 주세요."),
  currentRevision: z.string().min(1, "현재 리비전을 입력해 주세요."),
  targetRevision: z.string().min(1, "변경 후 리비전을 입력해 주세요."),
  relatedProject: z.string(),
  relatedProduct: z.string(),
  relatedProcess: z.string(),

  // C. 변경 내용
  reason: z.string().min(1, "변경 요청 사유를 입력해 주세요."), // 변경 요청 사유(필수)
  asIs: z.string(), // 현재 문제점(선택)
  toBe: z.string(), // 기대효과(선택)
  linkedRef: z.string(), // (폼에서 제거·미사용) 추후 정리

  // D. 영향 분석
  impactScope: z.array(z.string()).min(1, "영향 범위를 1개 이상 선택해 주세요."),
  qualityImpact: z.string().min(1, "품질 영향을 선택해 주세요."),
  scheduleImpact: z.string().min(1, "일정 영향을 선택해 주세요."),
  costImpact: z.string().min(1, "원가 영향을 선택해 주세요."),
  revalidationRequired: z.string().min(1, "재검증·재인증 필요 여부를 선택해 주세요."),
  customerApprovalRequired: z.string().min(1, "고객·규제 승인 필요 여부를 선택해 주세요."),
  urgent: z.string().min(1, "긴급 변경 여부를 선택해 주세요."),
  rollbackPlan: z.string(),

  // E. 적용 계획
  applyAssignee: z.string(),
  applyDate: z.date().optional(),
  applyMethod: z.string(),
  rollbackNeeded: z.string().min(1, "롤백 필요 여부를 선택해 주세요."),
  deployNeeded: z.string().min(1, "배포 필요 여부를 선택해 주세요."),
  applyNote: z.string(),

  // F. 검증 계획
  verifyAssignee: z.string(),
  verifyDate: z.date().optional(),
  verifyMethod: z.string(),
  verifyCriteria: z.string(),
  verifyEvidenceNeeded: z.string().min(1, "검증 증적 필요 여부를 선택해 주세요."),

  // G. 승인·검토 라우팅
  reviewers: z.array(z.string()),
  approvers: z.array(z.string()),
  requestComment: z.string(),
});

export type ChangeRequestValues = z.infer<typeof changeRequestSchema>;
