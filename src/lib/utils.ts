import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Select 트리거 표시용 렌더 함수.
 * Base UI의 SelectValue는 선택 값(코드)을 그대로 보여 주므로, 코드→라벨 맵을 받아
 * 라벨을 표시합니다. 맵에 없는 값(예: "전체" 센티넬)은 그대로 노출합니다.
 * 사용: <SelectValue placeholder="전체">{selectValueLabel(MAP)}</SelectValue>
 */
export function selectValueLabel<K extends string>(map: Record<K, string>) {
  return (value: string) => (map as Record<string, string>)[value] ?? value
}
