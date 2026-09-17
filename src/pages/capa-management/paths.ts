import { QUALITY_EVENT_FROM_PARAM } from "@/pages/quailty-event/paths";

/**
 * CAPA 상세는 CAPA 진행 현황·단계별 대상뿐 아니라 조치 관리에서도 진입합니다.
 * 상세를 목록 경로(/capa/status) 아래에 두면 어디서 들어와도 사이드바가
 * CAPA 관리로 잡히므로, 독립 경로(/capa/detail)로 분리하고 진입 출처를
 * from 파라미터(사이드바/브레드크럼이 공유)로 남깁니다.
 */
export const CAPA_DETAIL_PREFIX = "/capa/detail";

/** CAPA 상세로 진입할 수 있는 목록 메뉴 경로(= 사이드바 url과 일치). */
export type CapaDetailFrom =
  | "/capa/status"
  | "/capa/root-cause"
  | "/capa/corrective-preventive"
  | "/capa/effectiveness"
  | "/actions/my"
  | "/actions/status"
  | "/actions/delayed"
  | "/actions/completed";

/** CAPA 상세 경로. from에 진입한 목록 메뉴 url을 넘겨 사이드바 포커스를 맞춥니다. */
export function capaDetailPath(ncId: string, from: CapaDetailFrom) {
  const params = new URLSearchParams({ [QUALITY_EVENT_FROM_PARAM]: from });
  return `${CAPA_DETAIL_PREFIX}/${encodeURIComponent(ncId)}?${params.toString()}`;
}
