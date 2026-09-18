import { useState } from "react";
import { Download } from "lucide-react";

import { cn } from "@/lib/utils";
import { downloadChartPng, type ExportChartSpec } from "@/lib/chart-export";

/**
 * 차트를 PNG로 저장하는 아이콘 버튼(변환 중 표시·실패 방어).
 * 대시보드 패널 헤더 등에서 재사용합니다.
 */
export default function ChartDownloadButton({
  spec,
  label = "차트 PNG 다운로드",
  className,
}: {
  spec: ExportChartSpec;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      await downloadChartPng(spec);
    } catch (err) {
      console.error("[chart-export] 차트 다운로드 실패:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={handleDownload}
      disabled={busy}
      className={cn(
        "flex shrink-0 items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",
        className
      )}
    >
      <Download className={cn("size-4", busy && "animate-pulse")} />
    </button>
  );
}
