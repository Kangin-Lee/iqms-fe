import { PlusIcon } from "lucide-react";
import { useState } from "react";
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

const ALL = "전체";

/** 상세 조건 필드 정의 (라벨 + 옵션). 값은 라벨 문자열을 그대로 사용합니다. */
const FIELDS = [
  { key: "eventType", label: "이벤트 유형", options: [ALL, "프로세스", "제품", "문서", "시스템"] },
  { key: "status", label: "상태", options: [ALL, "대기", "진행중", "완료", "보류"] },
  { key: "severity", label: "심각도", options: [ALL, "높음", "보통", "낮음"] },
  { key: "department", label: "담당 부서", options: [ALL, "품질팀", "생산팀", "개발팀", "구매팀"] },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];
type Filters = Record<FieldKey, string>;

// 디폴트는 아무 필터도 걸리지 않은 상태(모두 "전체").
const DEFAULT_FILTERS: Filters = {
  eventType: ALL,
  status: ALL,
  severity: ALL,
  department: ALL,
};

type QualityEventFilterProps = {
  /** "등록" 버튼 노출 여부. 등록이 없는 화면(예: 부적합 판정 대상)에서는 끕니다. */
  showRegister?: boolean;
};

export default function QualityEventFilter({
  showRegister = true,
}: QualityEventFilterProps = {}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [keyword, setKeyword] = useState("");

  const setField = (key: FieldKey, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  // 값이 "전체"가 아닌 필드만 활성 조건으로 간주 → 칩/개수 생성
  const chips: FilterChip[] = FIELDS.filter((f) => filters[f.key] !== ALL).map(
    (f) => ({
      key: f.key,
      label: `${f.label} ${filters[f.key]}`,
      onRemove: () => setField(f.key, ALL),
    }),
  );

  const handleSearch = () => {
    console.log({ keyword, ...filters });
  };

  const handleReset = () => {
    setFilters({ eventType: ALL, status: ALL, severity: ALL, department: ALL });
    setKeyword("");
  };

  return (
    <FilterBar
      leading={
        <>
          <DateRangePicker />
          <SearchBar
            value={keyword}
            onChange={setKeyword}
            onEnter={handleSearch}
            placeholder="이벤트명, ID, 담당자명"
          />
        </>
      }
      chips={chips}
      onSearch={handleSearch}
      onReset={handleReset}
      actions={
        showRegister ? (
          <Button
            nativeButton={false}
            render={<Link to="/quality-events/register" />}
          >
            <PlusIcon />
            이벤트 등록
          </Button>
        ) : undefined
      }
    >
      {FIELDS.map((f) => (
        <div key={f.key} className="flex w-56 flex-col gap-1.5">
          <Label>{f.label}</Label>
          <Select
            value={filters[f.key]}
            onValueChange={(v) => setField(f.key, v as string)}
          >
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
