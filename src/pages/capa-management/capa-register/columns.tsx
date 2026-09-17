import type { ColumnDef } from "@tanstack/react-table";
import {
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Nonconformity } from "../../nonconformity-management/queries";

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
 * CAPA 계획 등록 대상 목록 컬럼.
 * 부적합 번호 · 품질 이벤트 번호 · 제목 · CAPA 필요 사유 · 심각도 · CAPA 판정자 · CAPA 판정일
 * (ioqcs-project의 capaRegisterColumns 구성을 iqms-fe 데이터 모델에 맞춰 옮김)
 */
export const capaRegisterColumns: ColumnDef<Nonconformity, unknown>[] = [
  { accessorKey: "ncNumber", header: "부적합 번호" },
  {
    id: "eventNumber",
    header: "품질 이벤트 번호",
    accessorFn: (row) => row.event.eventNumber,
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
    id: "capaReason",
    header: "CAPA 필요 사유",
    meta: { align: "left" },
    accessorFn: (row) => row.capaReason ?? "-",
    cell: ({ row }) => (
      <span className="line-clamp-1 max-w-[280px]">
        {row.original.capaReason ?? "-"}
      </span>
    ),
  },
  {
    id: "severity",
    header: "심각도",
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
    id: "capaJudgedBy",
    header: "CAPA 판정자",
    accessorFn: (row) => row.capaJudgedBy ?? "-",
  },
  {
    id: "capaJudgedAt",
    header: "CAPA 판정일",
    accessorFn: (row) => row.capaJudgedAtLabel ?? "-",
  },
];
