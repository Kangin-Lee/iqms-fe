/**
 * 품질 이벤트 상세는 여러 목록이 공유하는 경로입니다.
 * 어느 목록에서 들어왔는지를 from 파라미터로 남겨,
 * 사이드바가 해당 메뉴의 포커스를 유지할 수 있게 합니다.
 *
 * 값은 sidebar-navigation의 메뉴 url과 반드시 일치해야 하므로 리터럴로 좁혔습니다.
 */
export type QualityEventListPath =
  | "/quality-events/list"
  | "/quality-events/my"
  | "/quality-events/review";

export const QUALITY_EVENT_FROM_PARAM = "from";

export function qualityEventDetailPath(
  id: number | string,
  from: QualityEventListPath
) {
  const params = new URLSearchParams({ [QUALITY_EVENT_FROM_PARAM]: from });
  return `/quality-events/detail/${id}?${params.toString()}`;
}

/** 작성중 이벤트 수정 경로. */
export function qualityEventEditPath(id: number | string) {
  return `/quality-events/register/${id}`;
}

/**
 * 목록 행 클릭 시 이동 경로.
 * 작성중(status 1)은 수정 폼으로, 그 외에는 상세로 이동합니다.
 */
export function qualityEventRowPath(
  id: number | string,
  status: number,
  from: QualityEventListPath
) {
  return status === 1
    ? qualityEventEditPath(id)
    : qualityEventDetailPath(id, from);
}
