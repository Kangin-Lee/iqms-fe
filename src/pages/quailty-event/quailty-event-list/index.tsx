import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import { qualityEventRowPath } from "../paths";
import { useQualityEvents, type QualityEvent } from "../queries";
import QualityEventFilter from "./components/QualityEventFilter";
import { columns } from "./columns";

/** 매 렌더마다 새 배열이 생겨 테이블이 재구성되는 것을 막습니다. */
const EMPTY_EVENTS: QualityEvent[] = [];

export default function QuailtyEventList() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useQualityEvents();

  return (
    <div className="flex flex-col gap-4">
      {/* 필터 */}
      <QualityEventFilter />

      {/* 품질 이벤트 리스트 */}
      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          품질 이벤트를 불러오지 못했습니다. {error.message}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? EMPTY_EVENTS}
          emptyMessage={
            isPending ? "불러오는 중…" : "품질 이벤트가 없습니다."
          }
          onRowClick={(row) =>
            navigate(
              qualityEventRowPath(row.id, row.status, "/quality-events/list")
            )
          }
        />
      )}
    </div>
  );
}
