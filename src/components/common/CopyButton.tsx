import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * 텍스트를 클립보드로 복사하는 작은 아이콘 버튼.
 * 복사 성공 시 잠시 체크 아이콘으로 바뀝니다.
 */
export default function CopyButton({
  text,
  label = "복사",
  className,
}: {
  /** 복사할 텍스트(또는 클릭 시 생성하는 함수). */
  text: string | (() => string);
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const value = typeof text === "function" ? text() : text;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // 클립보드 API가 막힌 환경 폴백.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* 무시 */
      }
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={copied ? "복사됨" : label}
      onClick={handleCopy}
      className={className}
    >
      {copied ? (
        <CheckIcon className="text-emerald-600 dark:text-emerald-400" />
      ) : (
        <CopyIcon />
      )}
    </Button>
  );
}
