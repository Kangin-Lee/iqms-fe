import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  CAPA_PLAN_TYPE_NAME,
  CAPA_STATUS_CLASS,
  CAPA_STATUS_NAME,
  type CapaProgressRow,
} from "../queries";

/**
 * CAPA 진행 현황 목록 컬럼.
 * CAPA 상태 · 유형 · 번호 · 제목 · 부적합 번호 · 품질 이벤트 번호 ·
 * 담당자 · 계획 완료일 · 지연 여부 · 등록일
 */
export const capaStatusColumns: ColumnDef<CapaProgressRow, unknown>[] = [
  {
    id: "status",
    header: "CAPA 상태",
    accessorFn: (row) => row.status,
    cell: ({ row }) => (
      // w-28: 모든 상태 배지 너비를 통일합니다.
      <Badge
        variant="secondary"
        className={`w-28 ${CAPA_STATUS_CLASS[row.original.status]}`}
      >
        {CAPA_STATUS_NAME[row.original.status]}
      </Badge>
    ),
  },
  {
    id: "type",
    header: "CAPA 유형",
    accessorFn: (row) => CAPA_PLAN_TYPE_NAME[row.type],
  },
  { accessorKey: "capaNumber", header: "CAPA 번호" },
  {
    id: "title",
    header: "CAPA 제목",
    meta: { align: "left" },
    accessorFn: (row) => row.title,
    cell: ({ row }) => (
      <span className="line-clamp-1 max-w-[320px] font-medium">
        {row.original.title}
      </span>
    ),
  },
  { accessorKey: "ncNumber", header: "부적합 번호" },
  { accessorKey: "eventNumber", header: "품질 이벤트 번호" },
  { accessorKey: "assignee", header: "담당자" },
  { accessorKey: "dueDateLabel", header: "계획 완료일" },
  {
    id: "delayed",
    header: "지연 여부",
    accessorFn: (row) => (row.delayed ? "지연" : "정상"),
    cell: ({ row }) =>
      row.original.delayed ? (
        <Badge variant="destructive">지연</Badge>
      ) : (
        <Badge variant="secondary">정상</Badge>
      ),
  },
  { accessorKey: "createdAtLabel", header: "등록일" },
];
