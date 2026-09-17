import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import { capaDetailPath } from "@/pages/capa-management/paths";
import {
  EMPTY_MY_ACTION_FILTER,
  filterMyActions,
  hasActiveMyActionFilter,
  useMyActionTargets,
  type ActionRow,
  type MyActionFilterValues,
} from "@/pages/capa-management/queries";
import { myActionColumns } from "./columns";
import MyActionFilter from "./MyActionFilter";

const EMPTY: ActionRow[] = [];

/**
 * 내 조치 대상.
 * 현재 사용자가 담당자로 지정된 시정/예방조치를 보여 줍니다(진행중 우선 정렬).
 * 검색어·상태·구분·우선순위로 필터링하고, 페이지 단위로 조회합니다.
 * 행을 클릭하면 소속 CAPA 상세로 이동합니다.
 */
export default function MyActionList() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useMyActionTargets();
  const [filters, setFilters] = useState<MyActionFilterValues>(
    EMPTY_MY_ACTION_FILTER
  );

  const rows = useMemo(
    () => filterMyActions(data ?? EMPTY, filters),
    [data, filters]
  );

  const resolvedEmpty = isPending
    ? "불러오는 중…"
    : (data?.length ?? 0) > 0 && hasActiveMyActionFilter(filters)
      ? "조건에 맞는 조치가 없습니다."
      : "담당으로 지정된 조치가 없습니다.";

  return (
    <div className="flex flex-col gap-4">
      <MyActionFilter onApply={setFilters} />

      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          내 조치 대상을 불러오지 못했습니다. {error.message}
        </p>
      ) : (
        <DataTable
          columns={myActionColumns}
          data={rows}
          emptyMessage={resolvedEmpty}
          onRowClick={(row) => navigate(capaDetailPath(row.ncId, "/actions/my"))}
        />
      )}
    </div>
  );
}
