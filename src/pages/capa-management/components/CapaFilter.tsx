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
  CAPA_PLAN_TYPE_NAME,
  CAPA_STATUS_NAME,
  EMPTY_CAPA_FILTER,
  type CapaFilterValues,
  type CapaPlanType,
  type CapaStatus,
} from "../queries";

/**
 * Select에서 "전체"를 나타내는 센티넬 값(빈 문자열은 Base UI Select가 허용하지 않음).
 * SelectValue가 선택 값 문자열을 그대로 표시하므로, 표시 문구와 동일한 "전체"를 씁니다.
 */
const ALL = "전체";

const TYPE_OPTIONS = Object.entries(CAPA_PLAN_TYPE_NAME) as [
  CapaPlanType,
  string,
][];

const DELAYED_OPTIONS = [
  { value: "delayed", label: "지연" },
  { value: "normal", label: "정상" },
] as const;

/** 지연 여부 코드 → 라벨(트리거 표시용). */
const DELAYED_LABEL: Record<string, string> = { delayed: "지연", normal: "정상" };

type CapaFilterProps = {
  /** 상태 셀렉트에 노출할 CAPA 상태 목록(진행 현황=전체, 단계별=해당 단계만). */
  statusOptions: CapaStatus[];
  /** 조회/초기화/칩 제거 등으로 적용 조건이 바뀔 때 호출됩니다. */
  onApply: (values: CapaFilterValues) => void;
};

/**
 * CAPA 목록 공통 필터.
 * 검색어·CAPA 상태·CAPA 유형·지연 여부로 실제 행을 걸러 냅니다.
 * "조회"를 눌러야 적용되며(초안 → 적용), 적용 조건은 칩으로 표시합니다.
 * 상태 옵션이 1개뿐인 화면(예: 시정/예방조치 대상)에서는 상태 셀렉트를 숨깁니다.
 */
export default function CapaFilter({ statusOptions, onApply }: CapaFilterProps) {
  // 편집 중인 초안과 실제 적용된 조건을 분리합니다.
  const [draft, setDraft] = useState<CapaFilterValues>(EMPTY_CAPA_FILTER);
  const [applied, setApplied] = useState<CapaFilterValues>(EMPTY_CAPA_FILTER);

  const showStatus = statusOptions.length > 1;

  function apply(next: CapaFilterValues) {
    setApplied(next);
    setDraft(next);
    onApply(next);
  }

  function handleSearch() {
    apply(draft);
  }

  function handleReset() {
    apply(EMPTY_CAPA_FILTER);
  }

  // 적용된 조건만 칩으로. 제거 시 즉시 재적용합니다.
  const chips: FilterChip[] = [];
  if (applied.status)
    chips.push({
      key: "status",
      label: `상태 ${CAPA_STATUS_NAME[applied.status]}`,
      onRemove: () => apply({ ...applied, status: "" }),
    });
  if (applied.type)
    chips.push({
      key: "type",
      label: `유형 ${CAPA_PLAN_TYPE_NAME[applied.type]}`,
      onRemove: () => apply({ ...applied, type: "" }),
    });
  if (applied.delayed)
    chips.push({
      key: "delayed",
      label: `지연 여부 ${applied.delayed === "delayed" ? "지연" : "정상"}`,
      onRemove: () => apply({ ...applied, delayed: "" }),
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
          onEnter={handleSearch}
          placeholder="CAPA 번호·제목·부적합/이벤트 번호·담당자"
          className="w-72"
        />
      }
      chips={chips}
      onSearch={handleSearch}
      onReset={handleReset}
    >
      {showStatus && (
        <div className="flex w-56 flex-col gap-1.5">
          <Label>CAPA 상태</Label>
          <Select
            value={draft.status || ALL}
            onValueChange={(v) =>
              setDraft((p) => ({
                ...p,
                status: v === ALL ? "" : (v as CapaStatus),
              }))
            }
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="전체">
                {selectValueLabel(CAPA_STATUS_NAME)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>CAPA 상태</SelectLabel>
                <SelectItem value={ALL}>전체</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CAPA_STATUS_NAME[s]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex w-56 flex-col gap-1.5">
        <Label>CAPA 유형</Label>
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
              <SelectLabel>CAPA 유형</SelectLabel>
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
        <Label>지연 여부</Label>
        <Select
          value={draft.delayed || ALL}
          onValueChange={(v) =>
            setDraft((p) => ({
              ...p,
              delayed: v === ALL ? "" : (v as "delayed" | "normal"),
            }))
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="전체">
              {selectValueLabel(DELAYED_LABEL)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>지연 여부</SelectLabel>
              <SelectItem value={ALL}>전체</SelectItem>
              {DELAYED_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </FilterBar>
  );
}
