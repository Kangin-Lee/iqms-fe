import type { ColumnDef } from "@tanstack/react-table";
import {
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ACTION_STATUS_NAME,
  type ActionStatus,
  type MinorClosureRow,
} from "./actions";

const SEVERITY: Record<
  string,
  {
    label: string;
    variant: "destructive" | "default" | "secondary";
    icon: LucideIcon;
  }
> = {
  HIGH: { label: "높음", variant: "destructive", icon: TrendingUpIcon },
  MEDIUM: { label: "보통", variant: "default", icon: MinusIcon },
  LOW: { label: "낮음", variant: "secondary", icon: TrendingDownIcon },
};

/** 조치 상태 배지 스타일. 미조치=붉은색(주의 환기), 조치중=기본, 조치 완료=보조. */
const STATUS_VARIANT: Record<
  ActionStatus,
  "outline" | "default" | "secondary"
> = {
  none: "outline",
  in_progress: "default",
  completed: "secondary",
};

/** 미조치는 아직 손대지 않은 상태라 눈에 띄도록 붉은 계열로 강조합니다. */
const STATUS_CLASS: Partial<Record<ActionStatus, string>> = {
  none: "border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

export const minorClosureColumns: ColumnDef<MinorClosureRow, unknown>[] = [
  {
    id: "actionStatus",
    header: "조치 상태",
    meta: { className: "w-[140px]" },
    accessorFn: (row) => row.status,
    cell: ({ row }) => (
      <Badge
        variant={STATUS_VARIANT[row.original.status]}
        className={cn("w-20", STATUS_CLASS[row.original.status])}
      >
        {ACTION_STATUS_NAME[row.original.status]}
      </Badge>
    ),
  },
  {
    id: "ncNumber",
    header: "부적합 번호",
    meta: { className: "w-[180px]" },
    accessorFn: (row) => row.nonconformity.ncNumber,
  },
  {
    id: "eventNumber",
    header: "품질 이벤트 번호",
    meta: { className: "w-[180px]" },
    accessorFn: (row) => row.nonconformity.event.eventNumber,
  },
  {
    id: "title",
    // 너비를 주지 않아 남는 공간을 모두 차지합니다(다른 컬럼의 고정 너비가 유지되도록).
    header: "제목",
    meta: { align: "left", className: "w-full" },
    accessorFn: (row) => row.nonconformity.event.title,
    cell: ({ row }) => (
      <span className="line-clamp-1 max-w-[320px] font-medium">
        {row.original.nonconformity.event.title}
      </span>
    ),
  },
  {
    id: "severity",
    header: "심각도",
    meta: { className: "w-[130px]" },
    accessorFn: (row) => row.nonconformity.event.severity,
    cell: ({ row }) => {
      const s = SEVERITY[row.original.nonconformity.event.severity];
      if (!s) return row.original.nonconformity.event.severity;
      const Icon = s.icon;
      return (
        <Badge variant={s.variant}>
          <Icon />
          {s.label}
        </Badge>
      );
    },
  },
  {
    id: "assignee",
    header: "조치 담당자",
    meta: { className: "w-[150px]" },
    accessorFn: (row) => row.action?.assignee ?? "-",
  },
  {
    id: "dueDate",
    header: "조치 기한",
    meta: { className: "w-[150px]" },
    accessorFn: (row) => row.action?.dueDateLabel ?? "-",
  },
  {
    id: "judgedAt",
    header: "판정일",
    meta: { className: "w-[200px]" },
    accessorFn: (row) => row.nonconformity.capaJudgedAtLabel ?? "-",
  },
];
