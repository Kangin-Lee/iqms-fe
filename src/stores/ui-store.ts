import { create } from "zustand";

/**
 * 전역 UI 상태 스토어(Zustand).
 *
 * 서버 데이터(TanStack Query)·폼 상태(React Hook Form)와 별개로,
 * 여러 화면·컴포넌트가 공유하는 순수 UI 상태만 여기서 관리합니다.
 * 지금은 품질 도우미 챗 패널의 열림 상태를 담습니다.
 * (앱 레이아웃의 플로팅 버튼이 열고, 챗 패널 내부의 닫기 버튼이 닫습니다.)
 */
type UiState = {
  /** 품질 도우미 챗 패널 열림 여부. */
  chatOpen: boolean;
  /** 챗 패널 열림 상태를 설정합니다. */
  setChatOpen: (open: boolean) => void;
  /** 챗 패널 열림/닫힘을 토글합니다. */
  toggleChat: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  chatOpen: false,
  setChatOpen: (open) => set({ chatOpen: open }),
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
}));
