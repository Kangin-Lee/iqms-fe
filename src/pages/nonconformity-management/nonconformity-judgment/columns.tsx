import type { ColumnDef } from "@tanstack/react-table";
import {
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { NonconformityTarget } from "../queries";

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

/**
 * 부적합 판정 대상 목록 컬럼.
 * 이벤트 정보(event)와 판정 요청 정보(요청자·요청일시·의심 사유)를 함께 보여줍니다.
 * 요청자/요청일시는 품질 이벤트 검토에서 부적합 판정을 요청한 사람과 그 시각입니다.
 */
export const judgmentTargetColumns: ColumnDef<NonconformityTarget, unknown>[] = [
  {
    id: "eventNumber",
    header: "이벤트 번호",
    accessorFn: (row) => row.event.eventNumber,
    meta: { className: "w-[130px]" },
  },
  {
    accessorKey: "requestedBy",
    header: "요청자",
    meta: { className: "w-[100px]" },
  },
  {
    accessorKey: "requestedAtLabel",
    header: "요청일시",
    meta: { className: "w-[150px]" },
  },
  {
    id: "title",
    header: "제목",
    meta: { align: "left", className: "w-[260px]" },
    accessorFn: (row) => row.event.title,
    cell: ({ row }) => (
      <span className="font-medium">{row.original.event.title}</span>
    ),
  },
  {
    accessorKey: "reason",
    header: "부적합 의심 사유",
    // w-full: 남는 공간을 흡수해 헤더 폭만큼 넓게. 넘치면 셀에서 …처리.
    meta: { align: "left", className: "w-full" },
  },
  {
    id: "eventType",
    header: "이벤트 유형",
    accessorFn: (row) => row.event.eventType,
    meta: { className: "w-[120px]" },
    cell: ({ row }) =>
      EVENT_TYPE_LABEL[row.original.event.eventType] ??
      row.original.event.eventType,
  },
  {
    id: "severity",
    header: "심각도",
    meta: { className: "w-[110px]" },
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
];
