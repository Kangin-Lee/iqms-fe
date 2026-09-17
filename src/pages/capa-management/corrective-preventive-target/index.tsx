import { ACTION_STAGE_STATUSES } from "../queries";
import CapaStageTargetList from "../capa-stage-target/CapaStageTargetList";

/**
 * 시정/예방조치 대상.
 * 조치중 상태의 CAPA만 모아 보여 줍니다.
 */
export default function CorrectivePreventiveTargetList() {
  return (
    <CapaStageTargetList
      statuses={ACTION_STAGE_STATUSES}
      pageParamKey="actionPage"
      emptyMessage="시정/예방조치 대상 CAPA가 없습니다."
      fromPath="/capa/corrective-preventive"
    />
  );
}
