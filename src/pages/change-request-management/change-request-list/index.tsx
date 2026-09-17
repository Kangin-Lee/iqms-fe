import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import { useChangeRequests, type ChangeRequest } from "../queries";
import ChangeRequestFilter, {
  applyChangeRequestFilters,
  DEFAULT_CR_FILTERS,
  type ChangeRequestFilterValues,
} from "../ChangeRequestFilter";
import { columns } from "./columns";

/** 매 렌더마다 새 배열이 생겨 테이블이 재구성되는 것을 막습니다. */
const EMPTY_ROWS: ChangeRequest[] = [];

export default function ChangeRequestList() {
  const navigate = useNavigate();
  const { data, isPending } = useChangeRequests();
  const [filters, setFilters] =
    useState<ChangeRequestFilterValues>(DEFAULT_CR_FILTERS);

  const rows = useMemo(
    () => applyChangeRequestFilters(data ?? EMPTY_ROWS, filters),
    [data, filters]
  );

  return (
    <div className="flex flex-col gap-4">
      <ChangeRequestFilter value={filters} onChange={setFilters} />

      <DataTable
        columns={columns}
        data={rows}
        emptyMessage={
          isPending ? "불러오는 중…" : "등록된 형상변경요청이 없습니다."
        }
        onRowClick={(row) =>
          navigate(`/configuration-changes/detail/${row.id}`)
        }
      />
    </div>
  );
}
