import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CAPA_PLAN_TYPE_NAME,
  type ActionRow,
  type CapaActionResult,
} from "@/pages/capa-management/queries";

/** 조치 결과 배지 색상. 완료=초록, 일부완료=주황, 미완료=빨강. */
const RESULT_CLASS: Record<CapaActionResult, string> = {
  완료: "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  일부완료:
    "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  미완료: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
};

/**
 * 조치 완료 이력 목록 컬럼(전사, 완료일 최신순).
 * 완료일 · 조치 결과 · 조치 구분 · 조치 제목 · CAPA 번호 · CAPA 제목 · 담당자
 */
export const completedActionColumns: ColumnDef<ActionRow, unknown>[] = [
  { accessorKey: "completedDateLabel", header: "완료일" },
  {
    id: "result",
    header: "조치 결과",
    accessorFn: (row) => row.result ?? "-",
    cell: ({ row }) =>
      row.original.result ? (
        <Badge
          variant="secondary"
          className={cn(
            "w-20 justify-center",
            RESULT_CLASS[row.original.result]
          )}
        >
          {row.original.result}
        </Badge>
      ) : (
        "-"
      ),
  },
  {
    id: "type",
    header: "조치 구분",
    accessorFn: (row) => CAPA_PLAN_TYPE_NAME[row.type],
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
  {
    id: "capaTitle",
    header: "CAPA 제목",
    meta: { align: "left" },
    accessorFn: (row) => row.capaTitle,
    cell: ({ row }) => (
      <span className="line-clamp-1 max-w-[240px]">{row.original.capaTitle}</span>
    ),
  },
  { accessorKey: "assignee", header: "담당자" },
];
