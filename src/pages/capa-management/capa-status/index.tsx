import CapaStageTargetList from "../capa-stage-target/CapaStageTargetList";

/**
 * CAPA 진행 현황.
 * CAPA 계획 등록 대상에서 계획을 등록한 CAPA가 모여 진행 상태를 보여 줍니다.
 * 전체 상태를 대상으로 하며, 상단 필터로 상태·유형·지연·검색어를 걸를 수 있습니다.
 * 행을 클릭하면 CAPA 진행 현황 상세로 이동합니다.
 */
export default function CapaStatusList() {
  return (
    <CapaStageTargetList
      pageParamKey="page"
      emptyMessage="진행 중인 CAPA가 없습니다. CAPA 계획 등록 대상에서 계획을 등록하면 이곳에 표시됩니다."
    />
  );
}
