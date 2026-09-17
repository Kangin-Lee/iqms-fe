import { useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import DateRangePicker from "@/components/common/DateRangePicker";
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
import {
  EMPTY_COMPLETED_FILTER,
  type CapaActionResult,
  type CompletedActionFilterValues,
} from "@/pages/capa-management/queries";

/** Select "전체" 센티넬(표시 문구와 동일하게 사용). */
const ALL = "전체";

const RESULT_OPTIONS: CapaActionResult[] = ["완료", "일부완료", "미완료"];

type CompletedActionFilterProps = {
  onApply: (values: CompletedActionFilterValues) => void;
};

/**
 * 조치 완료 이력 필터.
 * 완료일 기간·조치 결과·통합 검색어로 실제 행을 걸러 냅니다.
 * "조회"를 눌러야 적용되며, 적용 조건은 칩으로 표시합니다.
 */
export default function CompletedActionFilter({
  onApply,
}: CompletedActionFilterProps) {
  const [draftKeyword, setDraftKeyword] = useState("");
  const [draftResult, setDraftResult] = useState<CapaActionResult | "">("");
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
  const [applied, setApplied] = useState<CompletedActionFilterValues>(
    EMPTY_COMPLETED_FILTER
  );

  function apply(values: CompletedActionFilterValues) {
    setApplied(values);
    setDraftKeyword(values.keyword);
    setDraftResult(values.result);
    // 칩 제거 등으로 기간이 지워지면 달력 선택도 비웁니다.
    if (!values.from && !values.to) setDraftRange(undefined);
    onApply(values);
  }

  function handleSearch() {
    apply({
      keyword: draftKeyword,
      result: draftResult,
      from: draftRange?.from ? format(draftRange.from, "yyyy-MM-dd") : "",
      to: draftRange?.to ? format(draftRange.to, "yyyy-MM-dd") : "",
    });
  }

  function handleReset() {
    setDraftRange(undefined);
    apply(EMPTY_COMPLETED_FILTER);
  }

  const chips: FilterChip[] = [];
  if (applied.from || applied.to)
    chips.push({
      key: "period",
      label: `완료일 ${applied.from || "…"} ~ ${applied.to || "…"}`,
      onRemove: () => apply({ ...applied, from: "", to: "" }),
    });
  if (applied.result)
    chips.push({
      key: "result",
      label: `결과 ${applied.result}`,
      onRemove: () => apply({ ...applied, result: "" }),
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
        <>
          <DateRangePicker
            value={draftRange}
            onChange={setDraftRange}
            label="완료일 기간"
          />
          <SearchBar
            value={draftKeyword}
            onChange={setDraftKeyword}
            onEnter={handleSearch}
            placeholder="조치·CAPA 제목·번호·담당자"
            className="w-64"
          />
        </>
      }
      chips={chips}
      onSearch={handleSearch}
      onReset={handleReset}
    >
      <div className="flex w-56 flex-col gap-1.5">
        <Label>조치 결과</Label>
        <Select
          value={draftResult || ALL}
          onValueChange={(v) =>
            setDraftResult(v === ALL ? "" : (v as CapaActionResult))
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>조치 결과</SelectLabel>
              <SelectItem value={ALL}>전체</SelectItem>
              {RESULT_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </FilterBar>
  );
}
