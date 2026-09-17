import { PlusIcon } from "lucide-react";
import { Link } from "react-router";

import DateRangePicker from "@/components/common/DateRangePicker";
import FilterBar, { type FilterChip } from "@/components/common/FilterBar";
import SearchBar from "@/components/common/SearchBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TARGET_TYPE_OPTIONS } from "./change-request-register/schema";
import type { ChangeRequest } from "./queries";

export const ALL = "전체";

/** 상태 필터 옵션(흐름 순). */
const STATUS_OPTIONS = [
  ALL,
  "작성중",
  "검토승인대기",
  "보완요청",
  "반려",
  "적용대기",
  "적용중",
  "적용실패",
  "검증대기",
  "검증중",
  "검증실패",
  "검증완료",
  "종료",
  "취소",
];

const TARGET_TYPE_FILTER = [ALL, ...TARGET_TYPE_OPTIONS.map((o) => o.label)];
const GRADE_OPTIONS = [ALL, "긴급", "일반"];

export type ChangeRequestFilterValues = {
  keyword: string;
  status: string;
  targetType: string;
  grade: string;
};

export const DEFAULT_CR_FILTERS: ChangeRequestFilterValues = {
  keyword: "",
  status: ALL,
  targetType: ALL,
  grade: ALL,
};

/** 필터 값 기준으로 목록을 걸러냅니다(클라이언트 필터). */
export function applyChangeRequestFilters(
  rows: ChangeRequest[],
  f: ChangeRequestFilterValues
): ChangeRequest[] {
  const kw = f.keyword.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.status !== ALL && r.statusName !== f.status) return false;
    if (f.targetType !== ALL && r.targetTypeName !== f.targetType) return false;
    if (f.grade !== ALL) {
      const want = f.grade === "긴급" ? "urgent" : "normal";
      if (r.grade !== want) return false;
    }
    if (kw) {
      const hay =
        `${r.crNumber} ${r.title} ${r.targetItem} ${r.requester}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}

type Props = {
  value: ChangeRequestFilterValues;
  onChange: (value: ChangeRequestFilterValues) => void;
  /** "변경요청 등록" 버튼 노출 여부. */
  showRegister?: boolean;
  /** 상태 필터 노출 여부(내 검토/승인 대상은 상태가 고정이라 숨김). */
  showStatus?: boolean;
};

export default function ChangeRequestFilter({
  value,
  onChange,
  showRegister = true,
  showStatus = true,
}: Props) {
  const set = (key: keyof ChangeRequestFilterValues, v: string) =>
    onChange({ ...value, [key]: v });

  const fields = [
    ...(showStatus
      ? [{ key: "status" as const, label: "상태", options: STATUS_OPTIONS }]
      : []),
    { key: "targetType" as const, label: "대상 유형", options: TARGET_TYPE_FILTER },
    { key: "grade" as const, label: "긴급", options: GRADE_OPTIONS },
  ];

  // "전체"가 아닌 필드만 활성 조건(칩)으로 노출.
  const chips: FilterChip[] = fields
    .filter((f) => value[f.key] !== ALL)
    .map((f) => ({
      key: f.key,
      label: `${f.label} ${value[f.key]}`,
      onRemove: () => set(f.key, ALL),
    }));

  const handleReset = () =>
    onChange({ ...DEFAULT_CR_FILTERS });

  return (
    <FilterBar
      leading={
        <>
          <DateRangePicker />
          <SearchBar
            value={value.keyword}
            onChange={(v) => set("keyword", v)}
            placeholder="변경요청번호, 제목, 대상명, 요청자"
          />
        </>
      }
      chips={chips}
      onReset={handleReset}
      actions={
        showRegister ? (
          <Button
            nativeButton={false}
            render={<Link to="/configuration-changes/register" />}
          >
            <PlusIcon />
            변경요청 등록
          </Button>
        ) : undefined
      }
    >
      {fields.map((f) => (
        <div key={f.key} className="flex w-56 flex-col gap-1.5">
          <Label>{f.label}</Label>
          <Select value={value[f.key]} onValueChange={(v) => set(f.key, v as string)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder={ALL} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{f.label}</SelectLabel>
                {f.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      ))}
    </FilterBar>
  );
}
