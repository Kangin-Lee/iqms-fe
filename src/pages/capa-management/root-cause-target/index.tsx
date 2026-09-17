import { ROOT_CAUSE_STAGE_STATUSES } from "../queries";
import CapaStageTargetList from "../capa-stage-target/CapaStageTargetList";

/**
 * 원인분석 대상.
 * 원인분석 대기·완료 상태의 CAPA만 모아 보여 줍니다.
 */
export default function RootCauseTargetList() {
  return (
    <CapaStageTargetList
      statuses={ROOT_CAUSE_STAGE_STATUSES}
      pageParamKey="rcPage"
      emptyMessage="원인분석 대상 CAPA가 없습니다."
      fromPath="/capa/root-cause"
    />
  );
}
