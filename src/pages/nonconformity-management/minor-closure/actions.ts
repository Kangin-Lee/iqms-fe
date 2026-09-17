import { useQuery } from "@tanstack/react-query";

import { getNonconformitiesSync, type Nonconformity } from "../queries";

/** 조치 상태. 미조치 → 조치중(담당자 지정) → 조치 완료. */
export type ActionStatus = "none" | "in_progress" | "completed";

export const ACTION_STATUS_NAME: Record<ActionStatus, string> = {
  none: "미조치",
  in_progress: "조치중",
  completed: "조치 완료",
};

/** 조치 완료 결과. */
export type ActionResult = "완료" | "일부완료" | "미완료";

/** 경미 부적합/단순조치 한 건의 조치 정보. */
export type SimpleAction = {
  ncId: string;
  /** 조치 담당자. */
  assignee: string;
  /** 조치 기한(표시 문자열). */
  dueDateLabel: string;
  /** 조치 계획. */
  plan: string;
  /** 진행 상태(등록되면 in_progress, 완료 처리 시 completed). */
  status: "in_progress" | "completed";
  /** 완료 시 결과. */
  result?: ActionResult;
  /** 완료일(표시 문자열). */
  completedDateLabel?: string;
  /** 실제 수행한 조치 내용. */
  content?: string;
};

/**
 * 조치 mock 저장소(부적합 id → 조치). 메모리에만 있어 새로고침 시 초기화됩니다.
 * 실제로는 서버가 보관하며 add/get을 API 호출로 교체하면 됩니다.
 */
const actionStore = new Map<string, SimpleAction>();

/** 조치 등록/수정. 담당자·기한·계획을 지정하면 상태가 조치중이 됩니다. */
export function registerAction(input: {
  ncId: string;
  assignee: string;
  dueDateLabel: string;
  plan: string;
}) {
  const existing = actionStore.get(input.ncId);
  actionStore.set(input.ncId, {
    ...existing,
    ncId: input.ncId,
    assignee: input.assignee,
    dueDateLabel: input.dueDateLabel,
    plan: input.plan,
    // 이미 완료된 건은 수정해도 완료 상태를 유지합니다.
    status: existing?.status === "completed" ? "completed" : "in_progress",
  });
}

/** 조치 완료 처리. 결과·완료일·내용을 기록하고 상태를 완료로 전이합니다. */
export function completeAction(
  ncId: string,
  input: { result: ActionResult; completedDateLabel: string; content: string }
) {
  const existing = actionStore.get(ncId);
  if (!existing) return;
  actionStore.set(ncId, {
    ...existing,
    status: "completed",
    result: input.result,
    completedDateLabel: input.completedDateLabel,
    content: input.content,
  });
}

/** 조치 상태 조회(없으면 미조치). */
export function getActionStatus(ncId: string): ActionStatus {
  return actionStore.get(ncId)?.status ?? "none";
}

/**
 * 완료 조치 초기 시드(데모용). 이미 종결된 경미 부적합에 완료된 조치를 채웁니다.
 * 모듈 로드 시 1회 실행됩니다.
 */
function seedActions() {
  for (const nc of getNonconformitiesSync()) {
    if (nc.capaVerdict !== "minor" || nc.statusCode !== "closed") continue;
    actionStore.set(nc.id, {
      ncId: nc.id,
      assignee: nc.confirmedBy,
      dueDateLabel: "2026-03-20",
      plan: "문서 표기 오류 정정 후 재배포.",
      status: "completed",
      result: "완료",
      completedDateLabel: "2026-03-18",
      content: "해당 문서를 정정하고 관련자에게 재공지했습니다.",
    });
  }
}

seedActions();

/** 경미 부적합/단순조치 종결 대상 한 행(부적합 + 조치 + 파생 상태). */
export type MinorClosureRow = {
  nonconformity: Nonconformity;
  action?: SimpleAction;
  status: ActionStatus;
};

/** CAPA 불필요(minor)로 판정된 부적합(무효 제외)이 대상입니다. */
function isMinorClosureItem(nc: Nonconformity): boolean {
  return nc.capaVerdict === "minor" && nc.statusCode !== "invalid";
}

/**
 * 조치 상태 정렬 순서: 미조치 → 조치중 → 조치 완료.
 * 같은 상태 안에서는 판정일(CAPA 판정일)이 최신인 건이 위로 옵니다.
 */
const ACTION_STATUS_SORT_ORDER: Record<ActionStatus, number> = {
  none: 0,
  in_progress: 1,
  completed: 2,
};

async function getMinorClosureRows(): Promise<MinorClosureRow[]> {
  return getNonconformitiesSync()
    .filter(isMinorClosureItem)
    .map((nc) => {
      const action = actionStore.get(nc.id);
      return { nonconformity: nc, action, status: action?.status ?? "none" };
    })
    .sort((a, b) => {
      const statusDiff =
        ACTION_STATUS_SORT_ORDER[a.status] - ACTION_STATUS_SORT_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      // 판정일 = CAPA 판정일. 최신이 위로.
      return (b.nonconformity.capaJudgedAtLabel ?? "").localeCompare(
        a.nonconformity.capaJudgedAtLabel ?? ""
      );
    });
}

export const actionKeys = {
  all: ["simpleActions"] as const,
  rows: () => [...actionKeys.all, "rows"] as const,
};

export function useMinorClosureRows() {
  return useQuery({ queryKey: actionKeys.rows(), queryFn: getMinorClosureRows });
}

/** 사이드바 배지용 미처리(미조치+조치중) 건수. */
export function useMinorClosureActionCount() {
  return useQuery({
    queryKey: actionKeys.rows(),
    queryFn: getMinorClosureRows,
    select: (rows) => rows.filter((r) => r.status !== "completed").length,
  });
}

/** 이벤트의 부적합 id로 조치를 조회(상세 화면의 조치 버튼/정보에 사용). */
export function useSimpleAction(ncId: string | undefined) {
  return useQuery({
    queryKey: actionKeys.rows(),
    queryFn: getMinorClosureRows,
    enabled: Boolean(ncId),
    select: (rows) =>
      rows.find((r) => r.nonconformity.id === ncId)?.action ?? null,
  });
}
