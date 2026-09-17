import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import { capaDetailPath } from "@/pages/capa-management/paths";
import {
  EMPTY_DELAYED_FILTER,
  filterDelayedActions,
  hasActiveDelayedFilter,
  useDelayedActions,
  type ActionRow,
  type DelayedActionFilterValues,
} from "@/pages/capa-management/queries";
import { delayedActionColumns } from "./columns";
import DelayedActionFilter from "./DelayedActionFilter";

const EMPTY: ActionRow[] = [];

/**
 * 지연 조치.
 * 기한이 지난 진행중 시정/예방조치만 전사 기준으로 보여 줍니다(지연이 큰 순).
 * 검색어·조치 구분·우선순위로 필터링하고, 페이지 단위로 조회합니다.
 * 행을 클릭하면 소속 CAPA 상세로 이동합니다.
 */
export default function DelayedActionList() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useDelayedActions();
  const [filters, setFilters] = useState<DelayedActionFilterValues>(
    EMPTY_DELAYED_FILTER
  );

  const rows = useMemo(
    () => filterDelayedActions(data ?? EMPTY, filters),
    [data, filters]
  );

  const resolvedEmpty = isPending
    ? "불러오는 중…"
    : (data?.length ?? 0) > 0 && hasActiveDelayedFilter(filters)
      ? "조건에 맞는 지연 조치가 없습니다."
      : "지연된 조치가 없습니다.";

  return (
    <div className="flex flex-col gap-4">
      <DelayedActionFilter onApply={setFilters} />

      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          지연 조치를 불러오지 못했습니다. {error.message}
        </p>
      ) : (
        <DataTable
          columns={delayedActionColumns}
          data={rows}
          emptyMessage={resolvedEmpty}
          onRowClick={(row) =>
            navigate(capaDetailPath(row.ncId, "/actions/delayed"))
          }
        />
      )}
    </div>
  );
}
