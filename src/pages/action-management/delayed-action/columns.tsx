import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  actionOverdueDays,
  CAPA_ACTION_PRIORITY_NAME,
  CAPA_PLAN_TYPE_NAME,
  type ActionRow,
  type CapaActionPriority,
} from "@/pages/capa-management/queries";

/** 우선순위 배지 색상. 높음=빨강, 보통=주황, 낮음=회색. */
const PRIORITY_CLASS: Record<CapaActionPriority, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-400/15 dark:text-zinc-300",
};

/**
 * 지연 조치 목록 컬럼(전사).
 * 조치 구분 · 우선순위 · 조치 제목 · CAPA 번호 · 담당자 · 조치 기한 · 지연일수 · 등록일
 */
export const delayedActionColumns: ColumnDef<ActionRow, unknown>[] = [
  {
    id: "type",
    header: "조치 구분",
    accessorFn: (row) => CAPA_PLAN_TYPE_NAME[row.type],
  },
  {
    id: "priority",
    header: "우선순위",
    accessorFn: (row) => CAPA_ACTION_PRIORITY_NAME[row.priority],
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={PRIORITY_CLASS[row.original.priority]}
      >
        {CAPA_ACTION_PRIORITY_NAME[row.original.priority]}
      </Badge>
    ),
  },
  {
    id: "title",
    header: "조치 제목",
    meta: { align: "left" },
    accessorFn: (row) => row.title,
    cell: ({ row }) => (
      <span className="line-clamp-1 max-w-[320px] font-medium">
        {row.original.title}
      </span>
    ),
  },
  { accessorKey: "capaNumber", header: "CAPA 번호" },
  { accessorKey: "assignee", header: "담당자" },
  { accessorKey: "dueDateLabel", header: "조치 기한" },
  {
    id: "overdue",
    header: "지연일수",
    accessorFn: (row) => actionOverdueDays(row.dueDateLabel),
    cell: ({ row }) => (
      <Badge variant="destructive">
        {actionOverdueDays(row.original.dueDateLabel)}일
      </Badge>
    ),
  },
  { accessorKey: "registeredAtLabel", header: "등록일" },
];
