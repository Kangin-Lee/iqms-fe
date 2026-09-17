import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import QualityEventFilter from "../../quailty-event/quailty-event-list/components/QualityEventFilter";
import { QUALITY_EVENT_FROM_PARAM } from "../../quailty-event/paths";
import {
  NONCONFORMITY_LIST_PATH,
  useNonconformities,
  type Nonconformity,
} from "../queries";
import { nonconformityColumns } from "./columns";

const EMPTY: Nonconformity[] = [];

/**
 * 부적합 목록.
 * 부적합 판정에서 "부적합 확정"된 건이 여기 모입니다.
 */
export default function NonconformityList() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useNonconformities();

  return (
    <div className="flex flex-col gap-4">
      {/* 필터 — 등록 버튼은 이 화면에 없으므로 숨깁니다. */}
      <QualityEventFilter showRegister={false} />

      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          부적합 목록을 불러오지 못했습니다. {error.message}
        </p>
      ) : (
        <DataTable
          columns={nonconformityColumns}
          data={data ?? EMPTY}
          emptyMessage={
            isPending
              ? "불러오는 중…"
              : "부적합이 없습니다. 부적합 판정에서 확정하면 이곳에 표시됩니다."
          }
          onRowClick={(row) =>
            navigate(
              `/quality-events/detail/${row.event.id}?${QUALITY_EVENT_FROM_PARAM}=${encodeURIComponent(NONCONFORMITY_LIST_PATH)}`
            )
          }
        />
      )}
    </div>
  );
}
