import { useNavigate } from "react-router";

import DataTable from "@/components/common/DataTable";
import QualityEventFilter from "../../quailty-event/quailty-event-list/components/QualityEventFilter";
import { QUALITY_EVENT_FROM_PARAM } from "../../quailty-event/paths";
import {
  NONCONFORMITY_JUDGMENT_PATH,
  useNonconformityJudgmentTargets,
  type NonconformityTarget,
} from "../queries";
import { judgmentTargetColumns } from "./columns";

const EMPTY_TARGETS: NonconformityTarget[] = [];

/**
 * 부적합 판정 대상.
 * 품질 이벤트 검토에서 "부적합 판정 요청"이 접수된 이벤트가 여기 모입니다.
 */
export default function NonconformityJudgmentList() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useNonconformityJudgmentTargets();

  return (
    <div className="flex flex-col gap-4">
      {/* 필터 — 등록 버튼은 이 화면에 없으므로 숨깁니다. */}
      <QualityEventFilter showRegister={false} />

      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          부적합 판정 대상을 불러오지 못했습니다. {error.message}
        </p>
      ) : (
        <DataTable
          layout="fixed"
          columns={judgmentTargetColumns}
          data={data ?? EMPTY_TARGETS}
          emptyMessage={
            isPending
              ? "불러오는 중…"
              : "부적합 판정 대상이 없습니다. 품질 이벤트 검토에서 부적합 판정을 요청하면 이곳에 표시됩니다."
          }
          onRowClick={(row) =>
            navigate(
              `/quality-events/detail/${row.event.id}?${QUALITY_EVENT_FROM_PARAM}=${encodeURIComponent(NONCONFORMITY_JUDGMENT_PATH)}`
            )
          }
        />
      )}
    </div>
  );
}
