import type { ColumnDef } from "@tanstack/react-table";
import {
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QualityEvent } from "../queries";
import { ReviewerHoverCard } from "./ReviewerHoverCard";

export type { QualityEvent };

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
 * 상태(status) 코드별 배지 스타일.
 * 작성중=하늘색, 검토중=초록색은 디자인 토큰에 없어 Tailwind 색상으로 직접 지정합니다.
 * (destructive 배지의 "연한 배경 + 진한 글자" 톤에 맞춰 라이트/다크 모두 처리)
 */
const STATUS_BADGE: Record<
  number,
  {
    variant: "outline" | "default" | "secondary" | "destructive";
    className?: string;
  }
> = {
  1: {
    // 작성중 — 하늘색
    variant: "outline",
    className:
      "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
  2: {
    // 검토중 — 초록색
    variant: "outline",
    className:
      "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  3: { variant: "secondary" }, // 종료
  4: { variant: "destructive" }, // 반려
};

export const columns: ColumnDef<QualityEvent, unknown>[] = [
  {
    accessorKey: "statusName",
    header: "상태",
    cell: ({ row }) => {
      const style = STATUS_BADGE[row.original.status] ?? { variant: "outline" };
      return (
        // w-16: 상태별 글자 수가 달라도 배지 폭을 동일하게 맞춥니다.
        <Badge variant={style.variant} className={cn("w-16", style.className)}>
          {row.original.statusName}
        </Badge>
      );
    },
  },
  { accessorKey: "eventNumber", header: "이벤트 번호" },
  { accessorKey: "registerDate", header: "등록일" },
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
  {
    accessorKey: "eventType",
    header: "이벤트 유형",
    cell: ({ row }) =>
      EVENT_TYPE_LABEL[row.original.eventType] ?? row.original.eventType,
  },
  {
    accessorKey: "severity",
    header: "심각도",
    cell: ({ row }) => {
      const s = SEVERITY[row.original.severity];
      if (!s) return row.original.severity;
      const Icon = s.icon;
      return (
        <Badge variant={s.variant}>
          <Icon />
          {s.label}
        </Badge>
      );
    },
  },
  { accessorKey: "discoveryDate", header: "발견일" },
  { accessorKey: "registrationDepartment", header: "등록부서" },
  {
    id: "reviewers",
    header: "검토자",
    // 검토 완료 인원 / 전체 검토자 수 (예: 1/3)
    accessorFn: (row) =>
      `${row.reviewers.filter((r) => r.reviewed).length}/${row.reviewers.length}`,
    cell: ({ row }) => <ReviewerHoverCard reviewers={row.original.reviewers} />,
  },
];
