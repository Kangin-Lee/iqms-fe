/**
 * 문서 폴더 트리 mock. parentId로 계층을 표현합니다(최상위는 parentId=null).
 * TODO: 실제 문서 저장소 API가 생기면 교체.
 */
export type Folder = { id: string; name: string; parentId: string | null };

export const INITIAL_FOLDERS: Folder[] = [
  // 최상위 문서 분류
  { id: "f-1000", name: "1000_품질경영 매뉴얼", parentId: null },
  { id: "f-4100", name: "4100_품질경영 방침", parentId: null },
  { id: "f-4200", name: "4200_품질경영 문서", parentId: null },
  { id: "f-5100", name: "5100_조직의 역할책임 및 권한", parentId: null },
  { id: "f-6100", name: "6100_위험관리", parentId: null },
  { id: "f-7100", name: "7100_자원 관리", parentId: null },
  { id: "f-8100", name: "8100_관제기술 연구 개발", parentId: null },
  { id: "f-8200", name: "8200_위성운영(공동)", parentId: null },
  { id: "f-8200-1", name: "8210_공동운영", parentId: "f-8200" },
  { id: "f-8300", name: "8300_위성운영(임무별)", parentId: null },
  { id: "f-8300-geo1", name: "8310_GEO_1_임무연장 및 종료", parentId: "f-8300" },
  { id: "f-8300-geo2", name: "8310_GEO_2_초기운영", parentId: "f-8300" },
  { id: "f-8300-geo3", name: "8310_GEO_3_정상운영", parentId: "f-8300" },
  { id: "f-8300-geo4", name: "8310_GEO_4_긴급조치", parentId: "f-8300" },
  { id: "f-8300-leo1", name: "8310_LEO_1_임무연장 및 종료", parentId: "f-8300" },
  { id: "f-8300-leo2", name: "8310_LEO_2_초기운영", parentId: "f-8300" },
  { id: "f-8300-leo3", name: "8310_LEO_3_정상운영", parentId: "f-8300" },
  { id: "f-8300-leo3-1", name: "8311_정상운영 상세", parentId: "f-8300-leo3" },
  { id: "f-8300-leo4", name: "8310_LEO_4_긴급조치", parentId: "f-8300" },
  { id: "f-8400", name: "8400_운영문서", parentId: null },
  { id: "f-8500", name: "8500_품질경영 보고", parentId: null },
  { id: "f-8600", name: "8600_교육관리", parentId: null },
  { id: "f-8700", name: "8700_보안관리", parentId: null },
  { id: "f-8800", name: "8800_주파수관리", parentId: null },
  { id: "f-9100", name: "9100_품질관리", parentId: null },
  { id: "f-9200", name: "9200_평가 및 품질심사", parentId: null },
  { id: "f-9300", name: "9300_품질경영 성과관리", parentId: null },
  { id: "f-9400", name: "9400_", parentId: null },
];

/** parentId의 직속 하위 폴더. parentId=null이면 최상위 폴더들. */
export function folderChildren(folders: Folder[], parentId: string | null) {
  return folders.filter((f) => f.parentId === parentId);
}

/** 폴더 자신 + 모든 하위(자손) 폴더 id 집합(삭제 시 사용). */
export function folderDescendantIds(folders: Folder[], id: string): Set<string> {
  const result = new Set<string>([id]);
  const walk = (pid: string) => {
    for (const c of folders.filter((f) => f.parentId === pid)) {
      result.add(c.id);
      walk(c.id);
    }
  };
  walk(id);
  return result;
}

/** 루트 → 대상까지의 경로(브레드크럼용). */
export function folderPath(folders: Folder[], id: string): Folder[] {
  const chain: Folder[] = [];
  let cur = folders.find((f) => f.id === id) ?? null;
  while (cur) {
    chain.unshift(cur);
    cur = cur.parentId ? folders.find((f) => f.id === cur!.parentId) ?? null : null;
  }
  return chain;
}
