import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import { useApplyPendingChanges, type ChangeRequest } from "../queries";
import ChangeRequestFilter, {
  applyChangeRequestFilters,
  DEFAULT_CR_FILTERS,
  type ChangeRequestFilterValues,
} from "../ChangeRequestFilter";
import { columns } from "../change-request-list/columns";

const EMPTY_ROWS: ChangeRequest[] = [];

export default function ChangeRequestApplyPending() {
  const navigate = useNavigate();
  const { data, isPending } = useApplyPendingChanges();
  const [filters, setFilters] =
    useState<ChangeRequestFilterValues>(DEFAULT_CR_FILTERS);

  const rows = useMemo(
    () => applyChangeRequestFilters(data ?? EMPTY_ROWS, filters),
    [data, filters]
  );

  return (
    <div className="flex flex-col gap-4">
      <ChangeRequestFilter
        value={filters}
        onChange={setFilters}
        showRegister={false}
        showStatus={false}
      />

      <DataTable
        columns={columns}
        data={rows}
        emptyMessage={
          isPending ? "불러오는 중…" : "적용 대기중인 변경이 없습니다."
        }
        onRowClick={(row) =>
          navigate(
            `/configuration-changes/detail/${row.id}?from=/configuration-changes/pending-apply`
          )
        }
      />
    </div>
  );
}
