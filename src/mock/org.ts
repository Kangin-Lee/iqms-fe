/**
 * 조직도(부서 트리) + 사용자 mock.
 * TODO: 실제 조직/사용자 API가 생기면 교체. 트리는 parentId로 계층을 표현합니다.
 */

export type Department = {
  id: string;
  name: string;
  /** 최상위(회사 루트)면 null. */
  parentId: string | null;
};

/** 접근 권한(시스템 레벨). */
export type UserRole = "admin" | "user" | "external";

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "관리자",
  user: "일반사용자",
  external: "외부사용자",
};

/**
 * QMS 직무 역할. 프로젝트 흐름(품질이벤트 → 부적합 판정 → CAPA → 조치 → 형상변경)에서
 * 각 단계의 실제 수행 주체를 나타냅니다. 접근 권한(UserRole)과는 별개입니다.
 */
export type QmsRole =
  | "quality" // 품질 담당자: 부적합/CAPA 판정·등록
  | "action" // 조치 담당자: 원인분석·시정/예방조치 수행
  | "verifier" // 검증 담당자(품질책임자): 효과성 검증·종결·승인
  | "change" // 형상관리 담당자: 형상변경요청 처리
  | "staff"; // 현업 담당자: 품질 이벤트 등록·조회

export const QMS_ROLE_LABEL: Record<QmsRole, string> = {
  quality: "품질 담당자",
  action: "조치 담당자",
  verifier: "검증 담당자",
  change: "형상관리 담당자",
  staff: "현업 담당자",
};

export type OrgUser = {
  id: string;
  name: string;
  email: string;
  positionName: string;
  /** 소속 부서 id. */
  deptId: string;
  /** 접근 권한. */
  role: UserRole;
  /** QMS 직무 역할. */
  qmsRole: QmsRole;
};

/** 초기 부서 트리. 아이옵스 › 본부 › 실/팀. */
export const INITIAL_DEPARTMENTS: Department[] = [
  { id: "d-root", name: "아이옵스", parentId: null },
  { id: "d-quality", name: "품질본부", parentId: "d-root" },
  { id: "d-qm", name: "품질관리실", parentId: "d-quality" },
  { id: "d-ops", name: "운영본부", parentId: "d-root" },
  { id: "d-opsmgmt", name: "운영관리실", parentId: "d-ops" },
  { id: "d-sat", name: "위성사업부", parentId: "d-root" },
  { id: "d-image", name: "위성영상팀", parentId: "d-sat" },
  { id: "d-control", name: "위성관제팀", parentId: "d-sat" },
];

/** 초기 사용자. 기존 reviewers를 부서/권한과 함께 확장한 형태입니다. */
export const INITIAL_USERS: OrgUser[] = [
  { id: "u1", name: "박준호", email: "junho@i-ops.co.kr", positionName: "책임", deptId: "d-qm", role: "admin", qmsRole: "verifier" },
  { id: "u2", name: "한대희", email: "daehee@i-ops.co.kr", positionName: "수석", deptId: "d-qm", role: "user", qmsRole: "quality" },
  { id: "u3", name: "이우민", email: "woomin@i-ops.co.kr", positionName: "선임", deptId: "d-qm", role: "user", qmsRole: "quality" },
  { id: "u4", name: "최유진", email: "yujin@i-ops.co.kr", positionName: "책임", deptId: "d-qm", role: "admin", qmsRole: "verifier" },
  { id: "u5", name: "양형모", email: "hyeongmo@i-ops.co.kr", positionName: "선임", deptId: "d-opsmgmt", role: "user", qmsRole: "action" },
  { id: "u6", name: "오세린", email: "serin@i-ops.co.kr", positionName: "책임", deptId: "d-opsmgmt", role: "user", qmsRole: "action" },
  { id: "u7", name: "홍길동", email: "hong@i-ops.co.kr", positionName: "책임", deptId: "d-image", role: "admin", qmsRole: "change" },
  { id: "u8", name: "강서연", email: "seoyeon@i-ops.co.kr", positionName: "선임", deptId: "d-control", role: "external", qmsRole: "staff" },
];

/** 특정 부서의 직속 하위 부서. */
export function childrenOf(depts: Department[], parentId: string | null) {
  return depts.filter((d) => d.parentId === parentId);
}

/** 부서 id 자신 + 모든 하위(자손) 부서 id 집합. */
export function descendantIds(depts: Department[], id: string): Set<string> {
  const result = new Set<string>([id]);
  const walk = (pid: string) => {
    for (const c of depts.filter((d) => d.parentId === pid)) {
      result.add(c.id);
      walk(c.id);
    }
  };
  walk(id);
  return result;
}

/** 부서명 조회(없으면 "-"). */
export function deptName(depts: Department[], id: string): string {
  return depts.find((d) => d.id === id)?.name ?? "-";
}
