import { EFFECTIVENESS_STAGE_STATUSES } from "../queries";
import CapaStageTargetList from "../capa-stage-target/CapaStageTargetList";

/**
 * 효과성 검증 대상.
 * 효과성 검증 대기·중·완료 상태의 CAPA만 모아 보여 줍니다.
 */
export default function EffectivenessTargetList() {
  return (
    <CapaStageTargetList
      statuses={EFFECTIVENESS_STAGE_STATUSES}
      pageParamKey="effPage"
      emptyMessage="효과성 검증 대상 CAPA가 없습니다."
      fromPath="/capa/effectiveness"
    />
  );
}
