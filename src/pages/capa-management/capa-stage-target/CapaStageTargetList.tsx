import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import {
  ALL_CAPA_STATUSES,
  EMPTY_CAPA_FILTER,
  filterCapaRows,
  hasActiveCapaFilter,
  useCapaProgress,
  type CapaFilterValues,
  type CapaProgressRow,
  type CapaStatus,
} from "../queries";
import { capaStatusColumns } from "../capa-status/columns";
import CapaFilter from "../components/CapaFilter";
import { capaDetailPath, type CapaDetailFrom } from "../paths";

const EMPTY: CapaProgressRow[] = [];

type CapaStageTargetListProps = {
  /**
   * 이 화면에서 보여 줄 CAPA 상태 묶음.
   * 생략하면 전체(진행 현황)를 보여 주고, 상태 필터 옵션도 전체가 됩니다.
   */
  statuses?: CapaStatus[];
  /** 대상이 없을 때 안내 문구. */
  emptyMessage: string;
  /** 페이지 상태를 URL에 저장할 때 쓰는 키(메뉴별로 달라야 함). */
  pageParamKey: string;
  /** 상세 진입 시 사이드바 포커스를 맞출 출처 메뉴(기본 진행 현황). */
  fromPath?: CapaDetailFrom;
};

/**
 * CAPA 목록(진행 현황·단계별 대상 공통).
 * 지정한 상태로 1차 필터링한 뒤, 상단 필터(검색어·상태·유형·지연)로 2차 필터링합니다.
 * 행을 클릭하면 CAPA 진행 현황 상세로 이동합니다.
 */
export default function CapaStageTargetList({
  statuses,
  emptyMessage,
  pageParamKey,
  fromPath = "/capa/status",
}: CapaStageTargetListProps) {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useCapaProgress(statuses);
  const [filters, setFilters] = useState<CapaFilterValues>(EMPTY_CAPA_FILTER);

  const statusOptions = statuses ?? ALL_CAPA_STATUSES;
  const rows = useMemo(
    () => filterCapaRows(data ?? EMPTY, filters),
    [data, filters]
  );

  // 데이터는 있으나 필터로 다 걸러진 경우와, 애초에 대상이 없는 경우를 구분합니다.
  const resolvedEmpty = isPending
    ? "불러오는 중…"
    : (data?.length ?? 0) > 0 && hasActiveCapaFilter(filters)
      ? "조건에 맞는 CAPA가 없습니다."
      : emptyMessage;

  return (
    <div className="flex flex-col gap-4">
      <CapaFilter statusOptions={statusOptions} onApply={setFilters} />

      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          목록을 불러오지 못했습니다. {error.message}
        </p>
      ) : (
        <DataTable
          columns={capaStatusColumns}
          data={rows}
          pageParamKey={pageParamKey}
          emptyMessage={resolvedEmpty}
          onRowClick={(row) => navigate(capaDetailPath(row.ncId, fromPath))}
        />
      )}
    </div>
  );
}
