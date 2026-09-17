import { z } from "zod";

/** 이벤트 유형: 값은 코드, 화면 표시는 한글 라벨. */
export const EVENT_TYPE_OPTIONS = [
  { value: "CUSTOMER_COMPLAINT", label: "고객 불만" },
  { value: "INTERNAL_ISSUE", label: "내부 품질 이슈" },
  { value: "AUDIT_ISSUE", label: "심사 지적" },
  { value: "PROCESS_DEVIATION", label: "프로세스 이상" },
  { value: "PRODUCT_SERVICE_DEFECT", label: "제품/서비스 결함" },
  { value: "SUPPLIER_ISSUE", label: "공급업체 이슈" },
  { value: "IMPROVEMENT_OPPORTUNITY", label: "개선 제안" },
  { value: "ETC", label: "기타" },
] as const;

export const registerSchema = z.object({
  // 필수
  discoveryDate: z.date({ error: "발견일을 선택해 주세요." }),
  occurrenceDate: z.date({ error: "발생일을 선택해 주세요." }),
  title: z.string().min(1, "이벤트 제목을 입력해 주세요."),
  eventType: z.string().min(1, "이벤트 유형을 선택해 주세요."),
  // 읽기 전용(본인)
  registrant: z.string(),
  registrationDepartment: z.string(),

  // 이벤트 내용
  description: z.string().min(1, "발생/발견 내용을 입력해 주세요."),
  relatedProject: z.string(),
  relatedProduct: z.string(),
  relatedProcess: z.string(),
  attachments: z.array(z.instanceof(File)),

  // 초기 영향 판단 (라디오, 필수)
  businessImpact: z.string().min(1, "업무/품질 영향을 선택해 주세요."),
  severity: z.string().min(1, "심각도를 선택해 주세요."),
  immediateActionRequired: z.string().min(1, "즉시 조치 필요 여부를 선택해 주세요."),

  // 접수 처리
  reviewers: z.array(z.string()), // 선택된 검토자 id
  registrationComment: z.string(),
});

/** 초기 영향 판단 라디오 옵션 (값=라벨). */
export const BUSINESS_IMPACT_OPTIONS = ["없음", "낮음", "보통", "높음"] as const;
export const SEVERITY_OPTIONS = ["경미", "보통", "중대"] as const;
export const IMMEDIATE_ACTION_OPTIONS = ["예", "아니오"] as const;

export type RegisterValues = z.infer<typeof registerSchema>;
