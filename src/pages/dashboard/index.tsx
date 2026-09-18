import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlarmClockIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  FileWarningIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import { Badge } from "@/components/ui/badge";
import ChartDownloadButton from "@/components/chart-download-button";
import { cn } from "@/lib/utils";
import type { ExportChartSpec } from "@/lib/chart-export";
import {
  actionOverdueDays,
  useAllActions,
  useCapaProgress,
  useCompletedActions,
  useDelayedActions,
  useMyActionTargets,
} from "@/pages/capa-management/queries";
import { capaDetailPath } from "@/pages/capa-management/paths";
import {
  useNonconformities,
  useNonconformityJudgmentCount,
} from "@/pages/nonconformity-management/queries";
import {
  useMyReviewPendingCount,
  useQualityEvents,
} from "@/pages/quailty-event/queries";
import AssigneeLoadChart, {
  type AssigneeDatum,
} from "./components/AssigneeLoadChart";
import EventTrendChart, { type TrendDatum } from "./components/EventTrendChart";
import MiniDonut from "./components/MiniDonut";
import MonthRangePicker from "./components/MonthRangePicker";
import ProportionBar, { type ShareDatum } from "./components/ProportionBar";
import SortablePanel from "./components/SortablePanel";
import StageBoxes, { type StageBox } from "./components/StageBoxes";
import StatusBars, { type StatusBar } from "./components/StatusBars";

/** 재배치 가능한 패널 id와 기본 순서. */
const PANEL_IDS = [
  "myTasks",
  "eventStatus",
  "trend",
  "ncVerdict",
  "pipeline",
  "assigneeLoad",
  "delayed",
  "completed",
] as const;
type PanelId = (typeof PANEL_IDS)[number];

const ORDER_STORAGE_KEY = "dashboard-panel-order";

/** localStorage에서 저장된 순서를 읽되, 항목이 바뀌었으면 기본값으로 보정합니다. */
function loadPanelOrder(): PanelId[] {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return [...PANEL_IDS];
    const saved = JSON.parse(raw) as string[];
    const valid = saved.filter((id): id is PanelId =>
      PANEL_IDS.includes(id as PanelId)
    );
    // 저장분에 없는 신규 패널은 뒤에 붙입니다.
    const missing = PANEL_IDS.filter((id) => !valid.includes(id));
    const merged = [...valid, ...missing];
    return merged.length === PANEL_IDS.length ? merged : [...PANEL_IDS];
  } catch {
    return [...PANEL_IDS];
  }
}

/** 상단 KPI 카드. 클릭하면 해당 목록으로 이동합니다. */
function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  hoverAccent,
  onClick,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
  /** hover 시 아이콘 색 계열로 배경을 물들입니다. */
  hoverAccent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border bg-card p-4 text-left transition-colors",
        hoverAccent
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-lg",
            accent
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="truncate text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="shrink-0 text-3xl font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </button>
  );
}

function MoreLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      자세히
      <ChevronRightIcon className="size-3.5" />
    </button>
  );
}

/** startKey~endKey(yyyy-MM) 사이의 월을 연속으로 나열합니다. */
function enumerateMonths(startKey: string, endKey: string): string[] {
  const [sy, sm] = startKey.split("-").map(Number);
  const [ey, em] = endKey.split("-").map(Number);
  const out: string[] = [];
  let y = sy;
  let mo = sm;
  while (y < ey || (y === ey && mo <= em)) {
    out.push(`${y}-${String(mo).padStart(2, "0")}`);
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
  }
  return out;
}

/** 단계/상태 원형 배지 색상(연한 배경 + 진한 텍스트). */
const STAGE_ACCENT: Record<string, string> = {
  zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-400/15 dark:text-zinc-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  violet:
    "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  green: "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  red: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: events } = useQualityEvents();
  const { data: capa } = useCapaProgress();
  const { data: delayedActions } = useDelayedActions();
  const { data: myActions } = useMyActionTargets();
  const { data: completed } = useCompletedActions();
  const { data: allActions } = useAllActions();
  const { data: nonconformities } = useNonconformities();
  const { data: judgmentCount } = useNonconformityJudgmentCount();
  const { data: reviewCount } = useMyReviewPendingCount();

  // 패널 순서(드래그 재배치, localStorage 저장).
  const [order, setOrder] = useState<PanelId[]>(loadPanelOrder);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const from = prev.indexOf(active.id as PanelId);
      const to = prev.indexOf(over.id as PanelId);
      if (from === -1 || to === -1) return prev;
      const next = arrayMove(prev, from, to);
      try {
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 저장 실패는 무시(비공개 모드 등).
      }
      return next;
    });
  }

  const eventRows = useMemo(() => events ?? [], [events]);
  const capaRows = useMemo(() => capa ?? [], [capa]);
  const delayedRows = delayedActions ?? [];
  const myActionRows = myActions ?? [];
  const completedRows = completed ?? [];

  // CAPA 상태별 건수 헬퍼(도넛·막대 공용).
  const cc = (s: string) => capaRows.filter((r) => r.status === s).length;

  const reviewingEvents = eventRows.filter((e) => e.status === 2).length;
  const activeCapa = capaRows.filter(
    (r) => r.status !== "closed" && r.status !== "cancelled"
  ).length;
  const myInProgress = myActionRows.filter(
    (a) => a.status === "in_progress"
  ).length;
  const myDelayed = myActionRows.filter((a) => a.delayed).length;
  // 이번 달 내가 완료한 조치 수(실적). 완료일이 이번 달(yyyy-MM)인 건.
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const myMonthlyDone = myActionRows.filter(
    (a) =>
      a.status === "completed" &&
      (a.completedDateLabel ?? "").startsWith(thisMonth)
  ).length;

  // 부적합 CAPA 판정 분포(CAPA 필요 / 경미·단순조치 / 미판정 / 무효).
  // 무효(상태)는 판정 결과보다 우선해 별도 집계 → 각 부적합은 한 번만 셉니다.
  const ncRows = nonconformities ?? [];
  const isInvalid = (n: (typeof ncRows)[number]) => n.statusCode === "invalid";
  const ncVerdictData: ShareDatum[] = [
    { label: "CAPA 필요", value: ncRows.filter((n) => !isInvalid(n) && n.capaVerdict === "required").length, color: "#8b5cf6", href: "/capa/register" },
    { label: "경미/단순조치", value: ncRows.filter((n) => !isInvalid(n) && n.capaVerdict === "minor").length, color: "#22c55e", href: "/nonconformities/minor-closure" },
    { label: "미판정", value: ncRows.filter((n) => !isInvalid(n) && !n.capaVerdict).length, color: "#a1a1aa", href: "/nonconformities/list" },
    { label: "무효", value: ncRows.filter((n) => isInvalid(n)).length, color: "#64748b", href: "/nonconformities/list" },
  ];

  // CAPA 진행 파이프라인 — 6개 진행 상태(도넛 + 가로 막대 공용).
  const capaBars: StatusBar[] = [
    { label: "원인분석 대기", value: cc("root_cause_pending"), color: "#f59e0b", href: "/capa/root-cause" },
    { label: "원인분석 완료", value: cc("root_cause_done"), color: "#84cc16", href: "/capa/root-cause" },
    { label: "조치중", value: cc("in_action"), color: "#3b82f6", href: "/capa/corrective-preventive" },
    { label: "효과성 검증 대기", value: cc("effectiveness_pending"), color: "#ef4444", href: "/capa/effectiveness" },
    { label: "효과성 검증 중", value: cc("effectiveness_ongoing"), color: "#8b5cf6", href: "/capa/effectiveness" },
    { label: "효과성 검증 완료", value: cc("effectiveness_done"), color: "#14b8a6", href: "/capa/effectiveness" },
  ];

  // 이벤트 월별 건수 + 선택 가능한 월 목록(가장 이른 이벤트 월 ~ 현재 월).
  const eventMonthCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of eventRows) {
      const key = e.registerDate.slice(0, 7); // yyyy-MM
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [eventRows]);

  const dataMonths = useMemo(
    () => [...eventMonthCounts.keys()].sort(),
    [eventMonthCounts]
  );
  const monthOptions = useMemo(() => {
    if (dataMonths.length === 0) return [];
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const last = dataMonths[dataMonths.length - 1];
    return enumerateMonths(dataMonths[0], last > curKey ? last : curKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMonths]);

  // 선택 기간(기본값 = 이벤트가 존재하는 구간).
  const [trendRange, setTrendRange] = useState<{ start: string; end: string } | null>(
    null
  );
  const trendStart = trendRange?.start ?? dataMonths[0];
  const trendEnd = trendRange?.end ?? dataMonths[dataMonths.length - 1];

  const trend: TrendDatum[] = useMemo(() => {
    if (!trendStart || !trendEnd) return [];
    return enumerateMonths(trendStart, trendEnd).map((key) => ({
      label: `${Number(key.slice(5, 7))}월`,
      count: eventMonthCounts.get(key) ?? 0,
    }));
  }, [trendStart, trendEnd, eventMonthCounts]);

  // 품질 이벤트 상태 분포(작성중/검토중/종료/반려) — 단계 흐름형 디자인.
  const eventBoxes: StageBox[] = [
    { label: "작성중", count: eventRows.filter((e) => e.status === 1).length, accentClass: STAGE_ACCENT.zinc, href: "/quality-events/list" },
    { label: "검토중", count: eventRows.filter((e) => e.status === 2).length, accentClass: STAGE_ACCENT.blue, href: "/quality-events/list" },
    { label: "종료", count: eventRows.filter((e) => e.status === 3).length, accentClass: STAGE_ACCENT.green, href: "/quality-events/list" },
    { label: "반려", count: eventRows.filter((e) => e.status === 4).length, accentClass: STAGE_ACCENT.red, href: "/quality-events/list" },
  ];

  // 담당자별 진행중 조치 수(전사, 상위 6명).
  const assigneeLoad: AssigneeDatum[] = useMemo(() => {
    const byAssignee = new Map<string, number>();
    for (const a of allActions ?? []) {
      if (a.status !== "in_progress") continue;
      byAssignee.set(a.assignee, (byAssignee.get(a.assignee) ?? 0) + 1);
    }
    return [...byAssignee.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [allActions]);

  // 차트 패널 다운로드용 스펙(현재 화면 데이터·선택 기간을 그대로 PNG로 저장).
  const trendSpec: ExportChartSpec = {
    title: "월별 품질 이벤트 등록 추이",
    kind: "line",
    data: trend.map((d) => ({ label: d.label, value: d.count, color: "#3b82f6" })),
  };
  const ncVerdictSpec: ExportChartSpec = {
    title: "부적합 CAPA 판정 분포",
    kind: "donut",
    data: ncVerdictData.map((d) => ({
      label: d.label,
      value: d.value,
      color: d.color,
    })),
  };
  const pipelineSpec: ExportChartSpec = {
    title: "CAPA 진행 파이프라인",
    kind: "donut",
    data: capaBars.map((b) => ({
      label: b.label,
      value: b.value,
      color: b.color,
    })),
  };
  const assigneeLoadSpec: ExportChartSpec = {
    title: "담당자별 진행중 조치",
    kind: "bar",
    data: assigneeLoad.map((d) => ({
      label: d.name,
      value: d.value,
      color: "#8b5cf6",
    })),
  };

  // 각 패널의 제목·액션·본문 정의. 순서 배열(order)에 따라 렌더합니다.
  const panels: Record<
    PanelId,
    { title: string; action?: React.ReactNode; wide?: boolean; content: React.ReactNode }
  > = {
    myTasks: {
      title: "내 할 일",
      content: (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { label: "내 검토 대상", value: reviewCount ?? 0, to: "/quality-events/review", valueClass: "text-foreground" },
            { label: "진행중 조치", value: myInProgress, to: "/actions/my", valueClass: "text-foreground" },
            { label: "지연 조치", value: myDelayed, to: "/actions/my", valueClass: myDelayed > 0 ? "text-red-600 dark:text-red-400" : "text-foreground" },
            { label: "이번 달 완료", value: myMonthlyDone, to: "/actions/completed", valueClass: "text-green-600 dark:text-green-400" },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => navigate(s.to)}
              className="flex flex-col items-center gap-1 rounded-lg border bg-card px-2 py-3 text-center transition-colors hover:bg-muted/40"
            >
              <span
                className={cn(
                  "text-2xl font-semibold tabular-nums",
                  s.valueClass
                )}
              >
                {s.value}
              </span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </button>
          ))}
        </div>
      ),
    },
    pipeline: {
      title: "CAPA 진행 파이프라인",
      action: (
        <div className="flex items-center gap-2.5">
          <ChartDownloadButton
            spec={pipelineSpec}
            label="CAPA 진행 파이프라인 다운로드"
          />
          <MoreLink onClick={() => navigate("/capa/status")} />
        </div>
      ),
      content: (
        <div className="flex flex-wrap items-center gap-5">
          <MiniDonut items={capaBars} centerLabel="진행중" size={200} />
          <div className="min-w-[220px] flex-1">
            <StatusBars
              items={capaBars}
              labelWidthClass="w-24"
              onNavigate={(href) => navigate(href)}
            />
          </div>
        </div>
      ),
    },
    ncVerdict: {
      title: "부적합 CAPA 판정 분포",
      action: (
        <div className="flex items-center gap-2.5">
          <ChartDownloadButton
            spec={ncVerdictSpec}
            label="부적합 CAPA 판정 분포 다운로드"
          />
          <MoreLink onClick={() => navigate("/nonconformities/list")} />
        </div>
      ),
      content: (
        <ProportionBar
          items={ncVerdictData}
          totalLabel="총 부적합"
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    trend: {
      title: "월별 품질 이벤트 등록 추이",
      action: (
        <ChartDownloadButton
          spec={trendSpec}
          label="월별 품질 이벤트 등록 추이 다운로드"
        />
      ),
      content: (
        <div className="flex flex-col gap-3">
          {monthOptions.length > 0 && trendStart && trendEnd && (
            <div className="flex justify-end">
              <MonthRangePicker
                options={monthOptions}
                start={trendStart}
                end={trendEnd}
                onChange={(start, end) => setTrendRange({ start, end })}
              />
            </div>
          )}
          <EventTrendChart data={trend} />
        </div>
      ),
    },
    eventStatus: {
      title: "품질 이벤트 상태 분포",
      action: <MoreLink onClick={() => navigate("/quality-events/list")} />,
      content: (
        <StageBoxes items={eventBoxes} onNavigate={(href) => navigate(href)} />
      ),
    },
    assigneeLoad: {
      title: "담당자별 진행중 조치",
      action: (
        <div className="flex items-center gap-2.5">
          <ChartDownloadButton
            spec={assigneeLoadSpec}
            label="담당자별 진행중 조치 다운로드"
          />
          <MoreLink onClick={() => navigate("/actions/status")} />
        </div>
      ),
      content: <AssigneeLoadChart data={assigneeLoad} />,
    },
    delayed: {
      title: "지연·위험 조치",
      action: <MoreLink onClick={() => navigate("/actions/delayed")} />,
      content:
        delayedRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            지연된 조치가 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {delayedRows.slice(0, 6).map((r, i) => (
              <li key={`${r.ncId}-${i}`}>
                <button
                  type="button"
                  onClick={() => navigate(capaDetailPath(r.ncId, "/actions/delayed"))}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <Badge variant="destructive" className="shrink-0">
                    {actionOverdueDays(r.dueDateLabel)}일
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {r.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.assignee}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ),
    },
    completed: {
      title: "최근 완료 조치",
      action: <MoreLink onClick={() => navigate("/actions/completed")} />,
      content:
        completedRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            완료된 조치가 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {completedRows.slice(0, 6).map((r, i) => (
              <li key={`${r.ncId}-${i}`}>
                <button
                  type="button"
                  onClick={() => navigate(capaDetailPath(r.ncId, "/actions/completed"))}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {r.completedDateLabel ?? "-"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {r.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.assignee}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ),
    },
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {/* ① KPI (고정) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="검토중 품질 이벤트"
          value={reviewingEvents}
          icon={ClipboardCheckIcon}
          accent="bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300"
          hoverAccent="hover:bg-blue-50 dark:hover:bg-blue-400/10"
          onClick={() => navigate("/quality-events/list")}
        />
        <KpiCard
          label="미판정 부적합"
          value={judgmentCount ?? 0}
          icon={FileWarningIcon}
          accent="bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
          hoverAccent="hover:bg-amber-50 dark:hover:bg-amber-400/10"
          onClick={() => navigate("/nonconformities/judgment")}
        />
        <KpiCard
          label="진행중 CAPA"
          value={activeCapa}
          icon={ShieldCheckIcon}
          accent="bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300"
          hoverAccent="hover:bg-violet-50 dark:hover:bg-violet-400/10"
          onClick={() => navigate("/capa/status")}
        />
        <KpiCard
          label="지연 조치"
          value={delayedRows.length}
          icon={AlarmClockIcon}
          accent="bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300"
          hoverAccent="hover:bg-red-50 dark:hover:bg-red-400/10"
          onClick={() => navigate("/actions/delayed")}
        />
      </div>

      {/* ②~⑥ 드래그로 순서 변경 가능한 패널 그리드 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {order.map((id) => {
              const p = panels[id];
              return (
                <SortablePanel key={id} id={id} title={p.title} action={p.action}>
                  {p.content}
                </SortablePanel>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
