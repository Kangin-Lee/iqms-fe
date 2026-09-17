import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type LoopingVideoProps = {
  src: string;
  /** 크로스페이드에 사용할 시간(초). 영상 끝 이 시간만큼 남았을 때 다음 루프로 디졸브합니다. */
  fadeDuration?: number;
  className?: string;
  /** 비디오 위에 겹칠 콘텐츠(텍스트·로고 등). */
  children?: React.ReactNode;
  /** children을 감싸는 오버레이 레이어의 클래스(위치·정렬·패딩 등을 지정). */
  overlayClassName?: string;
};

/**
 * 두 개의 video를 겹쳐두고, 재생이 끝나기 직전 다음 루프를 0초부터 시작시키며
 * 서로 opacity를 교차(crossfade)시켜 loop 재시작 시의 "끊김"을 없앱니다.
 */
export default function LoopingVideo({
  src,
  fadeDuration = 1,
  className,
  children,
  overlayClassName,
}: LoopingVideoProps) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const [front, setFront] = useState<"a" | "b">("a");

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;

    let current = a;
    let other = b;
    let swapping = false;

    void current.play().catch(() => {});

    const onTime = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      if (swapping || video !== current || !video.duration) return;

      if (video.currentTime >= video.duration - fadeDuration) {
        swapping = true;
        other.currentTime = 0;
        void other.play().catch(() => {});
        setFront(current === a ? "b" : "a");

        window.setTimeout(() => {
          current.pause();
          [current, other] = [other, current];
          swapping = false;
        }, fadeDuration * 1000);
      }
    };

    a.addEventListener("timeupdate", onTime);
    b.addEventListener("timeupdate", onTime);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      b.removeEventListener("timeupdate", onTime);
    };
  }, [fadeDuration]);

  const baseVideoClass =
    "absolute inset-0 h-full w-full object-cover transition-opacity ease-linear";
  const fadeStyle = { transitionDuration: `${fadeDuration}s` };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <video
        ref={aRef}
        className={cn(baseVideoClass, front === "a" ? "opacity-100" : "opacity-0")}
        style={fadeStyle}
        muted
        playsInline
        preload="auto"
      >
        <source src={src} type="video/mp4" />
      </video>
      <video
        ref={bRef}
        className={cn(baseVideoClass, front === "b" ? "opacity-100" : "opacity-0")}
        style={fadeStyle}
        muted
        playsInline
        preload="auto"
      >
        <source src={src} type="video/mp4" />
      </video>

      {children && (
        <div className={cn("absolute inset-0 z-10", overlayClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}
