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
  CAPA_ACTION_PRIORITY_NAME,
  CAPA_PLAN_TYPE_NAME,
  EMPTY_DELAYED_FILTER,
  type CapaActionPriority,
  type CapaPlanType,
  type DelayedActionFilterValues,
} from "@/pages/capa-management/queries";

/** Select "전체" 센티넬(표시 문구와 동일하게 사용). */
const ALL = "전체";

const TYPE_OPTIONS = Object.entries(CAPA_PLAN_TYPE_NAME) as [
  CapaPlanType,
  string,
][];
const PRIORITY_OPTIONS = Object.entries(CAPA_ACTION_PRIORITY_NAME) as [
  CapaActionPriority,
  string,
][];

type DelayedActionFilterProps = {
  onApply: (values: DelayedActionFilterValues) => void;
};

/**
 * 지연 조치 필터.
 * 검색어·조치 구분·우선순위로 실제 행을 걸러 냅니다.
 * "조회"를 눌러야 적용되며, 적용 조건은 칩으로 표시합니다.
 */
export default function DelayedActionFilter({
  onApply,
}: DelayedActionFilterProps) {
  const [draft, setDraft] = useState<DelayedActionFilterValues>(
    EMPTY_DELAYED_FILTER
  );
  const [applied, setApplied] = useState<DelayedActionFilterValues>(
    EMPTY_DELAYED_FILTER
  );

  function apply(next: DelayedActionFilterValues) {
    setApplied(next);
    setDraft(next);
    onApply(next);
  }

  const chips: FilterChip[] = [];
  if (applied.type)
    chips.push({
      key: "type",
      label: `구분 ${CAPA_PLAN_TYPE_NAME[applied.type]}`,
      onRemove: () => apply({ ...applied, type: "" }),
    });
  if (applied.priority)
    chips.push({
      key: "priority",
      label: `우선순위 ${CAPA_ACTION_PRIORITY_NAME[applied.priority]}`,
      onRemove: () => apply({ ...applied, priority: "" }),
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
      onReset={() => apply(EMPTY_DELAYED_FILTER)}
    >
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
        <Label>우선순위</Label>
        <Select
          value={draft.priority || ALL}
          onValueChange={(v) =>
            setDraft((p) => ({
              ...p,
              priority: v === ALL ? "" : (v as CapaActionPriority),
            }))
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="전체">
              {selectValueLabel(CAPA_ACTION_PRIORITY_NAME)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>우선순위</SelectLabel>
              <SelectItem value={ALL}>전체</SelectItem>
              {PRIORITY_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </FilterBar>
  );
}
