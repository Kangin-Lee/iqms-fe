import type { ColumnDef } from "@tanstack/react-table";
import {
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  CAPA_JUDGMENT_SHORT,
  type Nonconformity,
  type NonconformityStatus,
} from "../queries";

const EVENT_TYPE_LABEL: Record<string, string> = {
  INTERNAL_ISSUE: "내부 이슈",
  PROCESS_DEVIATION: "프로세스 이탈",
  AUDIT_ISSUE: "심사 이슈",
  PRODUCT_SERVICE_DEFECT: "제품/서비스 결함",
  SUPPLIER_ISSUE: "공급업체 이슈",
  CUSTOMER_COMPLAINT: "고객 불만",
  IMPROVEMENT_OPPORTUNITY: "개선 기회",
  ETC: "기타",
};

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

/** 부적합 상태 배지 스타일. 진행 중=녹색, 종료=보조, 무효=외곽선(흐림). */
const STATUS_STYLE: Record<
  NonconformityStatus,
  {
    variant: "destructive" | "default" | "secondary" | "outline";
    className: string;
  }
> = {
  open: {
    variant: "outline",
    className:
      "w-16 border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  }, // 진행 중
  closed: { variant: "secondary", className: "w-16" }, // 종료
  invalid: { variant: "outline", className: "w-16 text-muted-foreground" }, // 무효
};

/** CAPA 판정 배지 스타일. 필요=강조, 불필요=보조, 미판정=외곽선. */
const CAPA_BADGE = {
  required: { variant: "destructive" as const },
  minor: { variant: "secondary" as const },
};

export const nonconformityColumns: ColumnDef<Nonconformity, unknown>[] = [
  {
    accessorKey: "statusName",
    header: "부적합 상태",
    meta: { className: "w-[178px]" },
    cell: ({ row }) => {
      const style = STATUS_STYLE[row.original.statusCode];
      return (
        <Badge variant={style.variant} className={style.className}>
          {row.original.statusName}
        </Badge>
      );
    },
  },
  { accessorKey: "ncNumber", header: "부적합 번호", meta: { className: "w-[194px]" } },
  {
    id: "eventNumber",
    header: "이벤트 번호",
    meta: { className: "w-[174px]" },
    accessorFn: (row) => row.event.eventNumber,
  },
  {
    accessorKey: "confirmedAtLabel",
    header: "부적합 판정일시",
    meta: { className: "w-[260px]" },
  },
  {
    id: "title",
    header: "제목",
    meta: { align: "left" },
    accessorFn: (row) => row.event.title,
    cell: ({ row }) => (
      <span className="line-clamp-1 max-w-[320px] font-medium">
        {row.original.event.title}
      </span>
    ),
  },
  {
    id: "eventType",
    header: "이벤트 유형",
    meta: { className: "w-[190px]" },
    accessorFn: (row) => row.event.eventType,
    cell: ({ row }) =>
      EVENT_TYPE_LABEL[row.original.event.eventType] ??
      row.original.event.eventType,
  },
  {
    id: "severity",
    header: "심각도",
    meta: { className: "w-[150px]" },
    accessorFn: (row) => row.event.severity,
    cell: ({ row }) => {
      const s = SEVERITY[row.original.event.severity];
      if (!s) return row.original.event.severity;
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
    id: "capaJudgment",
    header: "CAPA 판정",
    meta: { className: "w-[160px]" },
    accessorFn: (row) => row.capaVerdict ?? "none",
    cell: ({ row }) => {
      const verdict = row.original.capaVerdict;
      // 미판정: 아직 CAPA 판정을 받지 않은 부적합.
      if (!verdict) return <Badge variant="outline">미판정</Badge>;
      return (
        <Badge variant={CAPA_BADGE[verdict].variant}>
          {CAPA_JUDGMENT_SHORT[verdict]}
        </Badge>
      );
    },
  },
];
