/**
 * 채팅 차트/이미지 다운로드 유틸리티.
 *
 * 차트는 화면에 렌더된 recharts SVG를 캡처하는 대신, 차트 스펙(ChatChartSpec)에서
 * 독립적인 SVG를 새로 그립니다. 이렇게 하면 CSS 변수(var(--card) 등)나 HTML 범례가
 * 빠지는 문제 없이 제목·범례·값이 모두 포함된 완전한 이미지를 얻을 수 있습니다.
 * 생성한 SVG를 캔버스로 래스터화해 PNG(투명 없음, 2배 해상도)로 저장합니다.
 */
/** 내보내기용 차트 데이터 한 항목. */
export type ExportChartDatum = { label: string; value: number; color: string };

/**
 * 내보내기용 차트 스펙(도넛/막대/라인).
 * 채팅 차트(ChatChartSpec: donut|bar)와 대시보드 차트가 공통으로 사용합니다.
 */
export type ExportChartSpec = {
  title: string;
  kind: "donut" | "bar" | "line";
  data: ExportChartDatum[];
};

/** 내보내기 이미지는 공유·인쇄를 고려해 항상 라이트 테마 색으로 고정합니다. */
const COLORS = {
  text: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
  bg: "#ffffff",
};

const FONT =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

/** XML 텍스트에 안전하게 넣기 위한 이스케이프. */
function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 파일명으로 쓸 수 없는 문자를 정리합니다. */
function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim() || "chart";
}

/** 각도(위=0, 시계방향)를 도넛 위 좌표로 변환합니다. */
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** 도넛 한 조각(도넛 링 세그먼트)의 path d 속성을 만듭니다. */
function donutSegment(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  startDeg: number,
  endDeg: number
): string {
  const p0 = polar(cx, cy, outer, startDeg);
  const p1 = polar(cx, cy, outer, endDeg);
  const p2 = polar(cx, cy, inner, endDeg);
  const p3 = polar(cx, cy, inner, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/** 도넛 차트 SVG(도넛 + 범례 + 중앙 합계). */
function buildDonutSvg(spec: ExportChartSpec): { svg: string; width: number; height: number } {
  const total = spec.data.reduce((s, d) => s + d.value, 0);
  const slices = spec.data.filter((d) => d.value > 0);

  const cx = 100;
  const cy = 150;
  const outer = 70;
  const inner = 44;

  // 범례가 도넛보다 길면 그만큼 높이를 늘립니다.
  const legendRowH = 24;
  const legendH = spec.data.length * legendRowH;
  const contentBottom = Math.max(cy + outer, 96 + legendH);
  const width = 400;
  const height = contentBottom + 40;

  const parts: string[] = [];

  // 도넛 조각(값이 0이면 그리지 않음).
  if (total > 0) {
    let acc = 0;
    for (const d of slices) {
      const startDeg = (acc / total) * 360;
      acc += d.value;
      const endDeg = (acc / total) * 360;
      parts.push(
        `<path d="${donutSegment(cx, cy, outer, inner, startDeg, endDeg)}" fill="${d.color}" stroke="${COLORS.bg}" stroke-width="2" />`
      );
    }
  } else {
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${(outer + inner) / 2}" fill="none" stroke="${COLORS.border}" stroke-width="${outer - inner}" />`
    );
  }

  // 중앙 합계.
  parts.push(
    `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="18" font-weight="700" fill="${COLORS.text}">${total}</text>`
  );

  // 범례.
  const legendX = 200;
  const legendTop = cy - legendH / 2 + legendRowH / 2;
  spec.data.forEach((d, i) => {
    const y = legendTop + i * legendRowH;
    parts.push(
      `<rect x="${legendX}" y="${y - 7}" width="10" height="10" rx="2" fill="${d.color}" />`,
      `<text x="${legendX + 18}" y="${y}" dominant-baseline="central" font-family="${FONT}" font-size="12" fill="${COLORS.muted}">${esc(d.label)}</text>`,
      `<text x="${width - 16}" y="${y}" text-anchor="end" dominant-baseline="central" font-family="${FONT}" font-size="12" font-weight="600" fill="${COLORS.text}">${d.value}</text>`
    );
  });

  return { svg: parts.join("\n"), width, height };
}

/** 정수 눈금에 어울리는 최댓값으로 올림합니다. */
function niceMax(value: number): number {
  if (value <= 5) return Math.max(value, 1);
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) {
    const candidate = s * pow;
    if (candidate >= value) return candidate;
  }
  return 10 * pow;
}

/** 막대 차트 SVG(세로 막대 + 값 라벨 + x축 라벨 + y축). */
function buildBarSvg(spec: ExportChartSpec): { svg: string; width: number; height: number } {
  const width = 400;
  const height = 260;
  const left = 40;
  const right = 16;
  const top = 44;
  const bottom = 48;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const baseY = top + plotH;

  const rawMax = Math.max(...spec.data.map((d) => d.value), 0);
  const max = rawMax > 0 ? niceMax(rawMax) : 1;

  const parts: string[] = [];

  // y축 눈금선(0, 중간, 최대)과 라벨.
  const ticks = [0, max / 2, max];
  for (const t of ticks) {
    const y = baseY - (t / max) * plotH;
    parts.push(
      `<line x1="${left}" y1="${y.toFixed(1)}" x2="${left + plotW}" y2="${y.toFixed(1)}" stroke="${COLORS.border}" stroke-width="1" />`,
      `<text x="${left - 6}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="central" font-family="${FONT}" font-size="10" fill="${COLORS.muted}">${Number.isInteger(t) ? t : t.toFixed(1)}</text>`
    );
  }

  // 막대.
  const n = spec.data.length || 1;
  const slot = plotW / n;
  const barW = Math.min(40, slot * 0.6);
  spec.data.forEach((d, i) => {
    const cxSlot = left + slot * i + slot / 2;
    const x = cxSlot - barW / 2;
    const h = max > 0 ? (d.value / max) * plotH : 0;
    const y = baseY - h;
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="3" fill="${d.color}" />`,
      `<text x="${cxSlot.toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="600" fill="${COLORS.text}">${d.value}</text>`,
      `<text x="${cxSlot.toFixed(1)}" y="${baseY + 16}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="${COLORS.muted}">${esc(d.label)}</text>`
    );
  });

  return { svg: parts.join("\n"), width, height };
}

/** 라인 차트 SVG(추이) — 영역 채움 + 선 + 포인트 + 값/x축 라벨 + y축. */
function buildLineSvg(spec: ExportChartSpec): { svg: string; width: number; height: number } {
  const width = 400;
  const height = 260;
  const left = 40;
  const right = 16;
  const top = 44;
  const bottom = 48;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const baseY = top + plotH;

  const color = spec.data[0]?.color ?? "#3b82f6";
  const rawMax = Math.max(...spec.data.map((d) => d.value), 0);
  const max = rawMax > 0 ? niceMax(rawMax) : 1;

  const parts: string[] = [];

  // y축 눈금선(0, 중간, 최대)과 라벨.
  for (const t of [0, max / 2, max]) {
    const y = baseY - (t / max) * plotH;
    parts.push(
      `<line x1="${left}" y1="${y.toFixed(1)}" x2="${left + plotW}" y2="${y.toFixed(1)}" stroke="${COLORS.border}" stroke-width="1" />`,
      `<text x="${left - 6}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="central" font-family="${FONT}" font-size="10" fill="${COLORS.muted}">${Number.isInteger(t) ? t : t.toFixed(1)}</text>`
    );
  }

  // 각 포인트 좌표(점이 1개면 가운데, 여러 개면 균등 분포).
  const n = spec.data.length;
  const px = (i: number) =>
    n <= 1 ? left + plotW / 2 : left + (plotW / (n - 1)) * i;
  const py = (v: number) => baseY - (v / max) * plotH;
  const points = spec.data.map((d, i) => ({ x: px(i), y: py(d.value), d }));

  if (points.length > 0) {
    // 영역 채움(선 아래).
    const areaPath =
      `M ${points[0].x.toFixed(1)} ${baseY} ` +
      points.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") +
      ` L ${points[points.length - 1].x.toFixed(1)} ${baseY} Z`;
    parts.push(`<path d="${areaPath}" fill="${color}" fill-opacity="0.12" />`);

    // 선.
    if (points.length > 1) {
      const linePath =
        `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(" ");
      parts.push(
        `<path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`
      );
    }

    // 포인트 + 값 라벨 + x축 라벨.
    points.forEach((p) => {
      parts.push(
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}" stroke="${COLORS.bg}" stroke-width="1.5" />`,
        `<text x="${p.x.toFixed(1)}" y="${(p.y - 9).toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="600" fill="${COLORS.text}">${p.d.value}</text>`,
        `<text x="${p.x.toFixed(1)}" y="${baseY + 16}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="${COLORS.muted}">${esc(p.d.label)}</text>`
      );
    });
  }

  return { svg: parts.join("\n"), width, height };
}

/** 차트 스펙으로부터 독립적인 SVG 문서 문자열을 만듭니다. */
export function buildChartSvg(spec: ExportChartSpec): {
  svg: string;
  width: number;
  height: number;
} {
  const titleH = 36;
  const body =
    spec.kind === "donut"
      ? buildDonutSvg(spec)
      : spec.kind === "line"
        ? buildLineSvg(spec)
        : buildBarSvg(spec);
  const width = body.width;
  const height = body.height + titleH;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" rx="12" fill="${COLORS.bg}" stroke="${COLORS.border}" stroke-width="1" />`,
    `<text x="16" y="26" font-family="${FONT}" font-size="14" font-weight="600" fill="${COLORS.text}">${esc(spec.title)}</text>`,
    `<g transform="translate(0 ${titleH})">${body.svg}</g>`,
    `</svg>`,
  ].join("\n");

  return { svg, width, height };
}

/** 브라우저에서 URL을 파일로 저장하도록 트리거합니다. */
function triggerDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** SVG 문자열을 2배 해상도 PNG Blob으로 래스터화합니다. */
function svgToPngBlob(
  svg: string,
  width: number,
  height: number,
  scale = 2
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgUrl = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    );
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("캔버스 컨텍스트를 만들 수 없습니다.");
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("PNG 변환에 실패했습니다."));
        }, "image/png");
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error("SVG 이미지를 불러오지 못했습니다."));
    };
    img.src = svgUrl;
  });
}

/** 차트를 PNG 파일로 저장합니다. */
export async function downloadChartPng(spec: ExportChartSpec): Promise<void> {
  const { svg, width, height } = buildChartSvg(spec);
  const blob = await svgToPngBlob(svg, width, height);
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${safeFileName(spec.title)}.png`);
  URL.revokeObjectURL(url);
}

/** data URL(생성 이미지)을 파일로 저장합니다. */
export function downloadDataUrl(dataUrl: string, baseName = "생성이미지"): void {
  // data:image/png;base64,... 에서 확장자를 뽑습니다.
  const mimeMatch = dataUrl.match(/^data:([^;]+)/);
  const mime = mimeMatch?.[1] ?? "image/png";
  const ext = mime.split("/")[1]?.split("+")[0] || "png";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  triggerDownload(dataUrl, `${safeFileName(baseName)}-${stamp}.${ext}`);
}
