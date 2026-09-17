import { ChevronDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type FilterChip = {
  /** React key 및 식별용 */
  key: string;
  /** 칩에 표시할 라벨 (예: "상태 진행중") */
  label: string;
  /** 칩의 × 클릭 시 해당 조건 제거 */
  onRemove: () => void;
};

type FilterBarProps = {
  /** 상단 행 앞쪽 요소 (날짜/검색 등). 페이지에서 주입. */
  leading?: React.ReactNode;
  /** "상세 조건"(Collapsible) 안에 들어갈 페이지별 필터 필드. */
  children?: React.ReactNode;
  /** 상단 행 맨 오른쪽 액션 (등록 버튼 등). 페이지에서 선택적으로 주입. */
  actions?: React.ReactNode;
  /** 적용된 조건 개수. 미지정 시 chips 개수로 대체. */
  activeCount?: number;
  /** 적용된 조건 칩 목록. */
  chips?: FilterChip[];
  onSearch?: () => void;
  onReset?: () => void;
  /** 상세 조건 콘텐츠 그리드 클래스 override. */
  contentClassName?: string;
  className?: string;
  /** Collapsible 초기 열림 여부. */
  defaultOpen?: boolean;
};

/**
 * 목록 페이지 공통 필터 껍데기.
 * 레이아웃 + 상세 조건 Collapsible + 조건 칩 영역만 담당하고,
 * 실제 필터 필드는 children으로, 앞쪽 요소는 leading으로 주입받습니다.
 */
export default function FilterBar({
  leading,
  children,
  actions,
  activeCount,
  chips = [],
  onSearch,
  onReset,
  contentClassName,
  className,
  defaultOpen = false,
}: FilterBarProps) {
  const count = activeCount ?? chips.length;

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("group/collapsible flex flex-col gap-3", className)}
    >
      {/* 상단 행 */}
      <div className="flex flex-wrap items-end gap-2">
        {leading}

        <CollapsibleTrigger
          render={
            <Button variant="outline" className="filterbar-detail-trigger" />
          }
        >
          상세 조건
          {count > 0 && <Badge>{count}</Badge>}
          <ChevronDown className="transition-transform duration-200 group-data-[open]/collapsible:rotate-180" />
        </CollapsibleTrigger>

        <Button onClick={onSearch}>조회</Button>
        <Button variant="outline" onClick={onReset}>
          초기화
        </Button>

        {actions ? <div className="ml-auto flex items-end">{actions}</div> : null}
      </div>

      {/* 상세 조건 펼침 영역 — 페이지별 필드 slot */}
      <CollapsibleContent>
        <div
          className={cn(
            "flex w-fit gap-2 rounded-lg border bg-card p-4",
            contentClassName,
          )}
        >
          {children}
        </div>
      </CollapsibleContent>

      {/*
        필터와 아래 테이블 사이 구분선. 조건 칩이 있으면 칩 줄의 상단 테두리가,
        없으면 빈 구분선이 그 역할을 하도록 항상 렌더합니다.
      */}
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="outline"
              className="gap-1 bg-card pr-1"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`${chip.label} 제거`}
                className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <span className="text-sm text-muted-foreground">조건 {count}개</span>
        </div>
      ) : (
        <div className="border-t" />
      )}
    </Collapsible>
  );
}
