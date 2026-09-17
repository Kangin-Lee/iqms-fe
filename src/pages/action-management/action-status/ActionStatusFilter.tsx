import { useState } from "react";

import FilterBar, { type FilterChip } from "@/components/common/FilterBar";
import SearchBar from "@/components/common/SearchBar";
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
import { selectValueLabel } from "@/lib/utils";
import {
  CAPA_ACTION_STATUS_NAME,
  CAPA_PLAN_TYPE_NAME,
  EMPTY_ACTION_PROGRESS_FILTER,
  type ActionProgressFilterValues,
  type CapaActionRecord,
  type CapaPlanType,
} from "@/pages/capa-management/queries";

/** Select "전체" 센티넬(표시 문구와 동일하게 사용). */
const ALL = "전체";

const STATUS_OPTIONS = Object.entries(CAPA_ACTION_STATUS_NAME) as [
  CapaActionRecord["status"],
  string,
][];
const TYPE_OPTIONS = Object.entries(CAPA_PLAN_TYPE_NAME) as [
  CapaPlanType,
  string,
][];

type ActionStatusFilterProps = {
  /** 담당자 셀렉트 옵션(현재 데이터에 존재하는 담당자 목록). */
  assigneeOptions: string[];
  onApply: (values: ActionProgressFilterValues) => void;
};

/**
 * 조치 진행 현황 필터.
 * 검색어·조치 상태·조치 구분·담당자로 실제 행을 걸러 냅니다.
 * "조회"를 눌러야 적용되며, 적용 조건은 칩으로 표시합니다.
 */
export default function ActionStatusFilter({
  assigneeOptions,
  onApply,
}: ActionStatusFilterProps) {
  const [draft, setDraft] = useState<ActionProgressFilterValues>(
    EMPTY_ACTION_PROGRESS_FILTER
  );
  const [applied, setApplied] = useState<ActionProgressFilterValues>(
    EMPTY_ACTION_PROGRESS_FILTER
  );

  function apply(next: ActionProgressFilterValues) {
    setApplied(next);
    setDraft(next);
    onApply(next);
  }

  const chips: FilterChip[] = [];
  if (applied.status)
    chips.push({
      key: "status",
      label: `상태 ${CAPA_ACTION_STATUS_NAME[applied.status]}`,
      onRemove: () => apply({ ...applied, status: "" }),
    });
  if (applied.type)
    chips.push({
      key: "type",
      label: `구분 ${CAPA_PLAN_TYPE_NAME[applied.type]}`,
      onRemove: () => apply({ ...applied, type: "" }),
    });
  if (applied.assignee)
    chips.push({
      key: "assignee",
      label: `담당자 ${applied.assignee}`,
      onRemove: () => apply({ ...applied, assignee: "" }),
    });
  if (applied.keyword.trim())
    chips.push({
      key: "keyword",
      label: `검색어 "${applied.keyword.trim()}"`,
      onRemove: () => apply({ ...applied, keyword: "" }),
    });

  return (
    <FilterBar
      leading={
        <SearchBar
          value={draft.keyword}
          onChange={(v) => setDraft((p) => ({ ...p, keyword: v }))}
          onEnter={() => apply(draft)}
          placeholder="조치·CAPA 제목·번호·담당자"
          className="w-64"
        />
      }
      chips={chips}
      onSearch={() => apply(draft)}
      onReset={() => apply(EMPTY_ACTION_PROGRESS_FILTER)}
    >
      <div className="flex w-56 flex-col gap-1.5">
        <Label>조치 상태</Label>
        <Select
          value={draft.status || ALL}
          onValueChange={(v) =>
            setDraft((p) => ({
              ...p,
              status: v === ALL ? "" : (v as CapaActionRecord["status"]),
            }))
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="전체">
              {selectValueLabel(CAPA_ACTION_STATUS_NAME)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>조치 상태</SelectLabel>
              <SelectItem value={ALL}>전체</SelectItem>
              {STATUS_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-56 flex-col gap-1.5">
        <Label>조치 구분</Label>
        <Select
          value={draft.type || ALL}
          onValueChange={(v) =>
            setDraft((p) => ({
              ...p,
              type: v === ALL ? "" : (v as CapaPlanType),
            }))
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="전체">
              {selectValueLabel(CAPA_PLAN_TYPE_NAME)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>조치 구분</SelectLabel>
              <SelectItem value={ALL}>전체</SelectItem>
              {TYPE_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-56 flex-col gap-1.5">
        <Label>담당자</Label>
        <Select
          value={draft.assignee || ALL}
          onValueChange={(v) =>
            setDraft((p) => ({ ...p, assignee: v === ALL ? "" : v }))
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>담당자</SelectLabel>
              <SelectItem value={ALL}>전체</SelectItem>
              {assigneeOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </FilterBar>
  );
}
