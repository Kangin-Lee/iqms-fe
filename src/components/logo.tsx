/**
 * IQMS 브랜드 로고.
 *
 * 의미:
 * - 중심 코어(구) = 품질경영 시스템의 핵심(데이터/기준).
 * - 은은한 궤도 = 지속적 개선의 순환이자, 모기업 IOPS의 시그니처 궤도(orbit)
 *   모티프 계승(항공·위성 도메인).
 * - 궤도 위 크림슨 노드 = 지능형(AI) 데이터 노드.
 * 색: IOPS 네이비(#13234d) 타일 + 크림슨(#e60a3c) — 브랜드 패밀리 정체성.
 *
 * 코어는 currentColor를 상속하므로 배경(네이비 타일=흰색, 밝은 칩=네이비)에 맞춰
 * 자동으로 대비됩니다. 궤도(슬레이트)·노드(크림슨)는 브랜드 색으로 고정합니다.
 */
const BRAND_CRIMSON = "#e60a3c";
const BRAND_ORBIT = "#5064a0";

type LogoMarkProps = {
  className?: string;
};

/** 로고 심벌(마크)만. 코어는 currentColor, 궤도는 슬레이트, 노드는 크림슨. */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="IQMS 로고"
    >
      {/* 노드 글로우 */}
      <circle cx="35.5" cy="13.5" r="6.5" fill={BRAND_CRIMSON} opacity="0.16" />
      {/* 코어 — 품질경영 시스템의 핵심 */}
      <circle cx="24" cy="24" r="5.5" fill="currentColor" />
      {/* 은은한 궤도 — 지속 개선 + IOPS 궤도 */}
      <ellipse
        cx="24"
        cy="24"
        rx="18"
        ry="8"
        transform="rotate(-25 24 24)"
        stroke={BRAND_ORBIT}
        strokeWidth="2.2"
      />
      {/* 궤도 노드 — 지능형(AI) 데이터 노드 */}
      <circle cx="35.5" cy="13.5" r="3.3" fill={BRAND_CRIMSON} />
    </svg>
  );
}

type LogoProps = {
  /** true면 네이비 배경 타일에 담아 렌더합니다. 기본은 타일 없이 마크만. */
  tile?: boolean;
  className?: string;
};

/**
 * 사이드바 헤더용 로고. 배경 타일 없이 마크만 렌더합니다.
 * 코어는 currentColor(사이드바 글자색)를 따르고, 궤도·노드는 브랜드 색입니다.
 * (tile=true면 이전처럼 네이비 배경 타일에 담아 렌더합니다.)
 */
export function Logo({ tile = false, className }: LogoProps) {
  if (tile) {
    return (
      <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-[#13234d] text-white">
        <LogoMark className="size-5" />
      </div>
    );
  }
  // SidebarMenuButton이 하위 모든 svg를 [&_svg]:size-4로 16px 고정하므로,
  // Tailwind v4 important(!)로 눌러 실제 크기를 반영합니다.
  // 접힘(collapsed) 상태에서는 32px 버튼에 맞게 줄입니다.
  return (
    <LogoMark
      className={
        className ?? "size-11! group-data-[collapsible=icon]:size-7! shrink-0"
      }
    />
  );
}
