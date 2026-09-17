import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import { QUALITY_EVENT_FROM_PARAM } from "../../quailty-event/paths";
import QualityEventFilter from "../../quailty-event/quailty-event-list/components/QualityEventFilter";
import { MINOR_CLOSURE_PATH } from "../queries";
import { useMinorClosureRows, type MinorClosureRow } from "./actions";
import { minorClosureColumns } from "./columns";

const EMPTY: MinorClosureRow[] = [];

/**
 * 경미 부적합/단순조치 종결 대상.
 * CAPA 판정에서 "불필요(경미부적합/단순조치)"로 판정된 부적합이 여기 모입니다.
 * 각 건은 미조치 → 조치중 → 조치 완료 순으로 단순조치를 진행합니다.
 */
export default function MinorClosureList() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useMinorClosureRows();

  return (
    <div className="flex flex-col gap-4">
      {/* 필터 — 등록 버튼은 이 화면에 없으므로 숨깁니다. */}
      <QualityEventFilter showRegister={false} />

      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          경미 부적합/단순조치 종결 대상을 불러오지 못했습니다. {error.message}
        </p>
      ) : (
        <DataTable
          columns={minorClosureColumns}
          data={data ?? EMPTY}
          layout="fixed"
          emptyMessage={
            isPending
              ? "불러오는 중…"
              : "종결 대상이 없습니다. CAPA 판정에서 경미부적합/단순조치로 판정하면 이곳에 표시됩니다."
          }
          onRowClick={(row) =>
            navigate(
              `/quality-events/detail/${row.nonconformity.event.id}?${QUALITY_EVENT_FROM_PARAM}=${encodeURIComponent(MINOR_CLOSURE_PATH)}`
            )
          }
        />
      )}
    </div>
  );
}
