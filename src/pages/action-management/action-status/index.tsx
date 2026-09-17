import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import { capaDetailPath } from "@/pages/capa-management/paths";
import {
  EMPTY_ACTION_PROGRESS_FILTER,
  filterActionProgress,
  hasActiveActionProgressFilter,
  useAllActions,
  type ActionProgressFilterValues,
  type ActionRow,
} from "@/pages/capa-management/queries";
import { actionStatusColumns } from "./columns";
import ActionStatusFilter from "./ActionStatusFilter";

const EMPTY: ActionRow[] = [];

/**
 * 조치 진행 현황.
 * 전사의 시정/예방조치를 상태 무관하게 보여 줍니다(진행중·지연 우선 정렬).
 * 검색어·상태·구분·담당자로 필터링하고, 페이지 단위로 조회합니다.
 * 행을 클릭하면 소속 CAPA 상세로 이동합니다.
 */
export default function ActionStatusList() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useAllActions();
  const [filters, setFilters] = useState<ActionProgressFilterValues>(
    EMPTY_ACTION_PROGRESS_FILTER
  );

  // 담당자 셀렉트 옵션 — 현재 데이터에 존재하는 담당자만(가나다순).
  const assigneeOptions = useMemo(
    () =>
      [...new Set((data ?? EMPTY).map((r) => r.assignee))].sort((a, b) =>
        a.localeCompare(b, "ko")
      ),
    [data]
  );

  const rows = useMemo(
    () => filterActionProgress(data ?? EMPTY, filters),
    [data, filters]
  );

  const resolvedEmpty = isPending
    ? "불러오는 중…"
    : (data?.length ?? 0) > 0 && hasActiveActionProgressFilter(filters)
      ? "조건에 맞는 조치가 없습니다."
      : "등록된 조치가 없습니다.";

  return (
    <div className="flex flex-col gap-4">
      <ActionStatusFilter
        assigneeOptions={assigneeOptions}
        onApply={setFilters}
      />

      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          조치 진행 현황을 불러오지 못했습니다. {error.message}
        </p>
      ) : (
        <DataTable
          columns={actionStatusColumns}
          data={rows}
          emptyMessage={resolvedEmpty}
          onRowClick={(row) =>
            navigate(capaDetailPath(row.ncId, "/actions/status"))
          }
        />
      )}
    </div>
  );
}
