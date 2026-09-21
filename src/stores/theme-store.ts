import { create } from "zustand";

/**
 * 테마(라이트/다크) 전역 스토어.
 *
 * 색상 토큰은 index.css의 `:root`(라이트)와 `.dark`(다크)에 정의돼 있어,
 * 문서 루트(html)에 `dark` 클래스를 붙였다 떼는 것으로 테마가 전환됩니다.
 * 선택값은 localStorage에 저장해 새로고침·재방문 시에도 유지합니다.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "iqms-theme";

/** 저장된 값 → 없으면 OS 설정을 따릅니다. */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage 접근 불가(프라이빗 모드 등) 시 OS 설정으로 폴백.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** 문서 루트에 테마 클래스를 반영합니다. */
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // 저장 실패는 무시합니다(테마 자체는 이번 세션 동안 적용됨).
    }
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));

// 모듈 로드 시 초기 테마를 DOM에 즉시 반영합니다(스토어 상태와 클래스 동기화).
if (typeof window !== "undefined") {
  applyTheme(useThemeStore.getState().theme);
}
