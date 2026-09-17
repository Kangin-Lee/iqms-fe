import type { ColumnDef } from "@tanstack/react-table";

import type { ChangeRequest } from "../queries";
import { GradeBadge, StatusBadge } from "../StatusBadge";
import { PersonHoverCard } from "./PersonHoverCard";

export const columns: ColumnDef<ChangeRequest, unknown>[] = [
  { accessorKey: "crNumber", header: "변경요청 번호" },
  {
    accessorKey: "statusName",
    header: "상태",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.status}
        statusName={row.original.statusName}
      />
    ),
  },
  {
    accessorKey: "grade",
    header: "긴급",
    cell: ({ row }) => <GradeBadge grade={row.original.grade} />,
  },
  {
    accessorKey: "title",
    header: "제목",
    meta: { align: "left" },
    cell: ({ row }) => (
      <span className="line-clamp-1 max-w-[320px] font-medium">
        {row.original.title}
      </span>
    ),
  },
  { accessorKey: "targetTypeName", header: "대상 유형" },
  {
    accessorKey: "targetItem",
    header: "대상명",
    meta: { align: "left" },
    cell: ({ row }) => (
      <span className="line-clamp-1 max-w-[200px]">{row.original.targetItem}</span>
    ),
  },
  { accessorKey: "requester", header: "요청자" },
  { accessorKey: "requestDate", header: "요청일" },
  { accessorKey: "requestedApplyDate", header: "희망 완료일" },
  {
    accessorKey: "applyAssignee",
    header: "적용 담당자",
    cell: ({ row }) => row.original.applyAssignee || "-",
  },
  {
    accessorKey: "verifyAssignee",
    header: "검증 담당자",
    cell: ({ row }) => row.original.verifyAssignee || "-",
  },
  {
    id: "reviewers",
    header: "검토자",
    accessorFn: (row) => row.reviewers.filter((p) => p.done).length,
    cell: ({ row }) => (
      <PersonHoverCard
        label="검토자"
        doneLabel="검토"
        people={row.original.reviewers}
      />
    ),
  },
  {
    id: "approvers",
    header: "승인자",
    accessorFn: (row) => row.approvers.filter((p) => p.done).length,
    cell: ({ row }) => (
      <PersonHoverCard
        label="승인자"
        doneLabel="승인"
        people={row.original.approvers}
      />
    ),
  },
];
