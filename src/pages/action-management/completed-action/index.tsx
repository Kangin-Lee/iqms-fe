import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import { capaDetailPath } from "@/pages/capa-management/paths";
import {
  EMPTY_COMPLETED_FILTER,
  filterCompletedActions,
  hasActiveCompletedFilter,
  useCompletedActions,
  type ActionRow,
  type CompletedActionFilterValues,
} from "@/pages/capa-management/queries";
import { completedActionColumns } from "./columns";
import CompletedActionFilter from "./CompletedActionFilter";

const EMPTY: ActionRow[] = [];

/**
 * 조치 완료 이력.
 * 완료된 시정/예방조치를 완료일 최신순 표로 보여 줍니다(전사).
 * 완료일 기간·결과·검색어로 필터링하고, 페이지 단위로 조회합니다.
 * (완료 건이 늘어나도 렌더/탐색이 가능하도록 필터 + 페이지네이션 구조)
 * 행을 클릭하면 소속 CAPA 상세로 이동합니다.
 */
export default function CompletedActionList() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useCompletedActions();
  const [filters, setFilters] = useState<CompletedActionFilterValues>(
    EMPTY_COMPLETED_FILTER
  );

  const rows = useMemo(
    () => filterCompletedActions(data ?? EMPTY, filters),
    [data, filters]
  );

  const resolvedEmpty = isPending
    ? "불러오는 중…"
    : (data?.length ?? 0) > 0 && hasActiveCompletedFilter(filters)
      ? "조건에 맞는 완료 조치가 없습니다."
      : "완료된 조치가 없습니다.";

  return (
    <div className="flex flex-col gap-4">
      <CompletedActionFilter onApply={setFilters} />

      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          조치 완료 이력을 불러오지 못했습니다. {error.message}
        </p>
      ) : (
        <DataTable
          columns={completedActionColumns}
          data={rows}
          emptyMessage={resolvedEmpty}
          onRowClick={(row) =>
            navigate(capaDetailPath(row.ncId, "/actions/completed"))
          }
        />
      )}
    </div>
  );
}
