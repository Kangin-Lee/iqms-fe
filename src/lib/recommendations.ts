/**
 * 품질 도우미 추천 엔진 (규칙 기반).
 *
 * 자연어 질의의 의도를 규칙으로 감지하고, 현재 앱의 실제 데이터(부적합·조치·
 * 검토 대상·형상변경)를 점수화·정렬해 "추천 문서 카드"를 만듭니다.
 * AI가 창작하지 않고 실제 데이터에 근거하므로 정확하며, 프론트 데이터만 씁니다.
 */

import { qualityEventData } from "@/mock/quailty-event/quailtyEventData";
import { getMyActionTargets } from "@/pages/capa-management/queries";
import { capaDetailPath } from "@/pages/capa-management/paths";
import { getMyChangeReviews } from "@/pages/change-request-management/queries";
import {
  getNonconformitiesSync,
} from "@/pages/nonconformity-management/queries";
import { isMyReviewPending } from "@/pages/quailty-event/queries";

export type RecTone = "danger" | "warn" | "ok" | "info" | "muted";

export type RecItem = {
  key: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; tone: RecTone };
  href: string;
};

export type RecResult = {
  intro: string;
  items: RecItem[];
  /** "전체 보기" 링크(더 많은 건이 있을 때). */
  more?: { label: string; href: string };
};

export type RecIntent =
  | "urgent"
  | "priority-nc"
  | "due-actions"
  | "delayed"
  | "my-review";

/** 오늘 기준 남은 일수(음수=지연). 파싱 실패 시 null. */
function daysFromToday(label: string): number | null {
  const [y, m, d] = label.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function ddayTag(label: string): string {
  const d = daysFromToday(label);
  if (d === null) return "";
  if (d < 0) return `지연 ${-d}일`;
  if (d === 0) return "오늘";
  return `D-${d}`;
}

/** 자연어에서 추천 의도를 감지합니다. 없으면 null. */
export function detectRecommendationIntent(text: string): RecIntent | null {
  // 지연된 건/조치
  if (/(지연|밀린|늦[은어]|기한\s*초과|밀려)/.test(text) && /(조치|건|업무|알려|추천|뭐)/.test(text)) {
    // "지연"이 명확하면 지연 우선
    if (/(지연|기한\s*초과|밀린|밀려)/.test(text)) return "delayed";
  }
  // 기한 임박 조치
  if (/(임박|곧\s*마감|마감\s*(임박|가까)|기한\s*(임박|가까|다가)|급한\s*조치)/.test(text))
    return "due-actions";
  // 내 검토/승인 대상
  if (/(내|제|나)\s*(검토|승인)|검토\s*(할|대상|건)|승인\s*(할|대상|건)/.test(text))
    return "my-review";
  // 우선순위 높은 부적합 (부적합을 명시한 경우)
  if (/부적합/.test(text) && /(우선순위|우선|중요|급한|위험|먼저|추천)/.test(text))
    return "priority-nc";
  // 급한 업무/우선순위(종합) — 부적합 특정이 없으면 내 급한 업무 전체를 종합.
  if (
    /(우선순위|급한|긴급|가장\s*급|먼저\s*(할|처리|볼)|바쁜|중요한\s*(업무|일))/.test(
      text
    ) &&
    /(업무|일|순위|처리|뭐|해야|건|것|추천|보여|알려|정리)/.test(text)
  )
    return "urgent";
  if (/(우선순위|우선\s*처리|먼저\s*(볼|처리))/.test(text)) return "urgent";
  return null;
}

/** 부적합 상세(품질 이벤트 상세) 경로. */
function ncHref(eventId: string | number): string {
  return `/quality-events/detail/${eventId}?from=${encodeURIComponent("/nonconformities/list")}`;
}

const SEVERITY_WEIGHT: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const SEVERITY_LABEL: Record<string, string> = {
  HIGH: "심각도 높음",
  MEDIUM: "심각도 보통",
  LOW: "심각도 낮음",
};

/** 우선순위 높은 부적합: 진행 중인 부적합을 심각도·CAPA 필요 기준으로 정렬. */
function priorityNonconformities(): RecResult {
  const open = getNonconformitiesSync().filter(
    (n) => n.statusCode !== "invalid" && n.statusCode !== "closed"
  );
  const score = (n: (typeof open)[number]) =>
    (SEVERITY_WEIGHT[n.event.severity] ?? 0) * 10 +
    (n.capaVerdict === "required" ? 5 : 0) +
    (!n.capaVerdict ? 2 : 0); // 미판정도 살짝 우선(판정 필요)

  const ranked = [...open].sort((a, b) => score(b) - score(a));
  const items: RecItem[] = ranked.slice(0, 5).map((n) => ({
    key: n.id,
    title: n.event.title,
    subtitle: `${n.ncNumber} · ${SEVERITY_LABEL[n.event.severity] ?? n.event.severity}`,
    badge: {
      label: n.event.severity === "HIGH" ? "높음" : n.statusName,
      tone: n.event.severity === "HIGH" ? "danger" : "warn",
    },
    href: ncHref(n.event.id),
  }));

  return {
    intro: items.length
      ? `지금 우선 처리가 필요한 **부적합 ${ranked.length}건** 중 상위 ${items.length}건이에요. 심각도와 CAPA 필요 여부를 기준으로 정렬했습니다.`
      : "현재 진행 중인 부적합이 없습니다. 👍",
    items,
    more:
      ranked.length > items.length
        ? { label: "부적합 목록 전체 보기", href: "/nonconformities/list" }
        : undefined,
  };
}

/** 기한 임박 조치: 진행중 조치 중 오늘~7일 이내(지연 포함), 기한 순. */
async function dueActions(): Promise<RecResult> {
  const actions = (await getMyActionTargets()).filter(
    (a) => a.status === "in_progress"
  );
  const soon = actions
    .filter((a) => {
      const d = daysFromToday(a.dueDateLabel);
      return d !== null && d <= 7;
    })
    .sort(
      (a, b) =>
        (daysFromToday(a.dueDateLabel) ?? 0) -
        (daysFromToday(b.dueDateLabel) ?? 0)
    );

  const items: RecItem[] = soon.slice(0, 6).map((a) => {
    const d = daysFromToday(a.dueDateLabel) ?? 0;
    return {
      key: a.capaNumber,
      title: a.title,
      subtitle: `${a.capaNumber} · 기한 ${a.dueDateLabel} · 담당 ${a.assignee}`,
      badge: {
        label: ddayTag(a.dueDateLabel),
        tone: d < 0 ? "danger" : d === 0 ? "warn" : "info",
      },
      href: capaDetailPath(a.ncId, "/actions/my"),
    };
  });

  return {
    intro: items.length
      ? `기한이 가까운 **조치 ${soon.length}건**이에요. 기한이 임박한 순으로 정리했습니다.`
      : "기한이 임박한(7일 이내) 진행중 조치가 없습니다.",
    items,
    more:
      soon.length > items.length
        ? { label: "내 조치 대상 전체 보기", href: "/actions/my" }
        : undefined,
  };
}

/** 지연 조치: 진행중 조치 중 기한 초과, 지연일 많은 순. */
async function delayedActions(): Promise<RecResult> {
  const actions = (await getMyActionTargets()).filter(
    (a) => a.status === "in_progress" && a.delayed
  );
  const ranked = [...actions].sort(
    (a, b) =>
      (daysFromToday(a.dueDateLabel) ?? 0) - (daysFromToday(b.dueDateLabel) ?? 0)
  );
  const items: RecItem[] = ranked.slice(0, 8).map((a) => ({
    key: a.capaNumber,
    title: a.title,
    subtitle: `${a.capaNumber} · 기한 ${a.dueDateLabel} · 담당 ${a.assignee}`,
    badge: { label: ddayTag(a.dueDateLabel), tone: "danger" },
    href: capaDetailPath(a.ncId, "/actions/delayed"),
  }));

  return {
    intro: items.length
      ? `⚠️ 기한이 지난 **지연 조치 ${ranked.length}건**이에요. 지연이 큰 순으로 정리했습니다.`
      : "지연된 조치가 없습니다. 👍",
    items,
    more:
      ranked.length > items.length
        ? { label: "지연 조치 전체 보기", href: "/actions/delayed" }
        : undefined,
  };
}

/** 내 검토/승인 대상: 품질 이벤트 검토 + 형상변경 검토·승인. */
function myReviewTargets(): RecResult {
  const events = qualityEventData.filter(isMyReviewPending);
  const crs = getMyChangeReviews();

  const items: RecItem[] = [
    ...events.map<RecItem>((e) => ({
      key: `qe-${e.id}`,
      title: e.title,
      subtitle: `${e.eventNumber} · 품질 이벤트`,
      badge: { label: "검토 대기", tone: "info" },
      href: `/quality-events/detail/${e.id}?from=${encodeURIComponent("/quality-events/review")}`,
    })),
    ...crs.map<RecItem>((c) => ({
      key: `cr-${c.id}`,
      title: c.title,
      subtitle: `${c.crNumber} · 형상변경요청`,
      badge: { label: "검토/승인 대기", tone: "info" },
      href: `/configuration-changes/detail/${c.id}?from=${encodeURIComponent("/configuration-changes/review")}`,
    })),
  ];

  return {
    intro: items.length
      ? `내가 처리할 **검토/승인 대상 ${items.length}건**이에요. 품질 이벤트와 형상변경요청을 함께 모았습니다.`
      : "지금 검토하거나 승인할 대상이 없습니다. 👍",
    items: items.slice(0, 8),
    more:
      items.length > 8
        ? { label: "내 검토 대상 보기", href: "/quality-events/review" }
        : undefined,
  };
}

/** 급한 업무(종합): 진행중 조치(기한순) + 내 검토/승인 대상을 급한 순으로. */
async function urgentWork(): Promise<RecResult> {
  const actions = (await getMyActionTargets())
    .filter((a) => a.status === "in_progress")
    .sort(
      (a, b) =>
        (daysFromToday(a.dueDateLabel) ?? 0) -
        (daysFromToday(b.dueDateLabel) ?? 0)
    );
  const reviews = qualityEventData.filter(isMyReviewPending);
  const crs = getMyChangeReviews();

  const actionItems: RecItem[] = actions.map((a) => {
    const d = daysFromToday(a.dueDateLabel) ?? 0;
    return {
      key: `ca-${a.capaNumber}`,
      title: a.title,
      subtitle: `${a.capaNumber} · 기한 ${a.dueDateLabel} · 담당 ${a.assignee}`,
      badge: {
        label: ddayTag(a.dueDateLabel),
        tone: d < 0 ? "danger" : d === 0 ? "warn" : "info",
      },
      href: capaDetailPath(a.ncId, "/actions/my"),
    };
  });

  const reviewItems: RecItem[] = [
    ...reviews.map<RecItem>((e) => ({
      key: `qe-${e.id}`,
      title: e.title,
      subtitle: `${e.eventNumber} · 품질 이벤트 검토`,
      badge: { label: "검토 대기", tone: "info" },
      href: `/quality-events/detail/${e.id}?from=${encodeURIComponent("/quality-events/review")}`,
    })),
    ...crs.map<RecItem>((c) => ({
      key: `cr-${c.id}`,
      title: c.title,
      subtitle: `${c.crNumber} · 형상변경 검토/승인`,
      badge: { label: "검토/승인 대기", tone: "info" },
      href: `/configuration-changes/detail/${c.id}?from=${encodeURIComponent("/configuration-changes/review")}`,
    })),
  ];

  const all = [...actionItems, ...reviewItems];
  const delayedN = actions.filter((a) => a.delayed).length;

  return {
    intro: all.length
      ? `가장 급한 업무 순으로 정리했어요. 진행중 조치 **${actions.length}건**(지연 ${delayedN}건)과 검토/승인 대기 **${reviewItems.length}건**이 있습니다. (지연·기한 임박 조치를 먼저 보여드려요.)`
      : "지금 급하게 처리할 업무가 없습니다. 👍",
    items: all.slice(0, 8),
    more:
      all.length > 8
        ? { label: "내 조치 대상 보기", href: "/actions/my" }
        : undefined,
  };
}

/** 의도에 맞는 추천 결과를 만듭니다. */
export async function getRecommendation(intent: RecIntent): Promise<RecResult> {
  switch (intent) {
    case "urgent":
      return urgentWork();
    case "priority-nc":
      return priorityNonconformities();
    case "due-actions":
      return dueActions();
    case "delayed":
      return delayedActions();
    case "my-review":
      return myReviewTargets();
  }
}
