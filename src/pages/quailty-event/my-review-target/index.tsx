import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import { qualityEventDetailPath } from "../paths";
import { useMyReviewEvents, type QualityEvent } from "../queries";
import QualityEventFilter from "../quailty-event-list/components/QualityEventFilter";
import { columns } from "../quailty-event-list/columns";

/** 매 렌더마다 새 배열이 생겨 테이블이 재구성되는 것을 막습니다. */
const EMPTY_EVENTS: QualityEvent[] = [];

/**
 * 내 검토 대상.
 * 전체 목록과 화면 구성은 같고, 데이터만 내 검토가 남아 있는 건으로 한정됩니다.
 * 판정 규칙은 queries.ts의 isMyReviewPending을 따릅니다(사이드바 배지와 동일한 기준).
 */
export default function MyReviewTargetList() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useMyReviewEvents();

  return (
    <div className="flex flex-col gap-4">
      {/* 필터 */}
      <QualityEventFilter />

      {/* 내가 검토해야 할 품질 이벤트 리스트 */}
      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          품질 이벤트를 불러오지 못했습니다. {error.message}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? EMPTY_EVENTS}
          emptyMessage={
            isPending ? "불러오는 중…" : "검토할 품질 이벤트가 없습니다."
          }
          onRowClick={(row) =>
            navigate(qualityEventDetailPath(row.id, "/quality-events/review"))
          }
        />
      )}
    </div>
  );
}
