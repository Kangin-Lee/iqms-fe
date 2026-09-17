/**
 * 검토자 선택용 사람 목록 stub.
 * TODO: 실제 사용자/조직 API가 생기면 교체.
 */
export type Reviewer = {
  id: string;
  name: string;
  teamName: string;
  positionName: string;
};

export const reviewers: Reviewer[] = [
  { id: "r1", name: "박준호", teamName: "품질관리실", positionName: "책임" },
  { id: "r2", name: "한대희", teamName: "품질관리실", positionName: "수석" },
  { id: "r3", name: "양형모", teamName: "운영관리실", positionName: "선임" },
  { id: "r4", name: "이우민", teamName: "품질관리실", positionName: "선임" },
  { id: "r5", name: "홍길동", teamName: "위성영상팀", positionName: "책임" },
  { id: "r6", name: "최유진", teamName: "품질관리실", positionName: "책임" },
  { id: "r7", name: "오세린", teamName: "운영관리실", positionName: "책임" },
  { id: "r8", name: "강서연", teamName: "위성관제팀", positionName: "선임" },
];
