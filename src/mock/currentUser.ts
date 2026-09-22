/**
 * 현재 로그인 사용자 stub.
 * TODO: 실제 인증(auth store/context)이 생기면 교체.
 */
export const currentUser = {
  name: "홍길동",
  email: "hong@i-ops.co.kr",
  phone: "010-1234-5678",
  department: "품질관리실",
  role: "주임연구원",
  /** 관리자 여부. 실제 인증 연동 시 서버 권한값으로 교체. (false로 두면 설정 메뉴 숨김) */
  isAdmin: true,
};
