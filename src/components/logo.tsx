/**
 * IQMS 브랜드 로고.
 *
 * 컨셉: 품질(Quality)을 뜻하는 열린 Q 링 + 검증·지능형 흐름을 나타내는
 * 체크 스윕. 단색(currentColor) 마크라 배경 타일 위에서 라이트/다크가
 * 자동으로 맞춰집니다. 사이드바 타일·collapsed 아이콘·favicon에 공용으로 씁니다.
 */
type LogoMarkProps = {
  className?: string;
};

/** 로고 심벌(마크)만. 색은 currentColor를 상속합니다. */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="IQMS 로고"
    >
      {/* Q 링 — 우상단을 열어 체크가 빠져나가는 통로를 만듭니다. */}
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="39 12"
      />
      {/* 검증 체크 — 링 안에서 시작해 열린 틈으로 뻗어 나가는 스윕. */}
      <path
        d="M8.2 12.4l3 3L20.5 5"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LogoProps = {
  /** 타일(배경 배지) 없이 마크만 렌더합니다. */
  bare?: boolean;
  className?: string;
};

/**
 * 타일에 담긴 로고(사이드바 헤더용).
 * bare=true면 배경 없이 마크만 반환합니다.
 */
export function Logo({ bare = false, className }: LogoProps) {
  if (bare) return <LogoMark className={className} />;
  return (
    <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
      <LogoMark className="size-5" />
    </div>
  );
}
