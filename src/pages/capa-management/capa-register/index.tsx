import { useMemo } from "react";
import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import type { Nonconformity } from "../../nonconformity-management/queries";
import { capaRegisterColumns } from "./columns";
import QualityEventFilter from "../../quailty-event/quailty-event-list/components/QualityEventFilter";
import { QUALITY_EVENT_FROM_PARAM } from "../../quailty-event/paths";
import { CAPA_REGISTER_PATH, useCapaRegisterTargets } from "../queries";

const EMPTY: Nonconformity[] = [];

/**
 * CAPA 계획 등록 대상.
 * 부적합 판정에서 "CAPA 필요"로 판정된 부적합이 여기 모입니다.
 */
export default function CapaRegisterList() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useCapaRegisterTargets();

  // 표에는 부적합 컬럼을 그대로 재사용합니다.
  const rows = useMemo(
    () => (data ? data.map((target) => target.nonconformity) : EMPTY),
    [data]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 필터 — 등록 버튼은 이 화면에 없으므로 숨깁니다. */}
      <QualityEventFilter showRegister={false} />

      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          CAPA 계획 등록 대상을 불러오지 못했습니다. {error.message}
        </p>
      ) : (
        <DataTable
          columns={capaRegisterColumns}
          data={rows}
          emptyMessage={
            isPending
              ? "불러오는 중…"
              : "CAPA 계획 등록 대상이 없습니다. 부적합 판정에서 CAPA 필요로 판정하면 이곳에 표시됩니다."
          }
          onRowClick={(row) =>
            navigate(
              `/quality-events/detail/${row.event.id}?${QUALITY_EVENT_FROM_PARAM}=${encodeURIComponent(CAPA_REGISTER_PATH)}`
            )
          }
        />
      )}
    </div>
  );
}
