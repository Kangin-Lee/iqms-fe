/**
 * Gemini API 서버리스 프록시 (Vercel Function).
 *
 * 브라우저 대신 서버에서 Google Generative Language API를 호출합니다.
 * API 키(GEMINI_API_KEY)는 서버 환경변수로만 보관되어 클라이언트 번들에
 * 노출되지 않습니다.
 *
 * 프론트엔드(src/lib/gemini.ts)는 배포 환경에서 이 엔드포인트로
 *   POST /api/gemini?model=<model>   (body: generateContent 요청 본문)
 * 형태로 호출합니다. 응답 본문/상태 코드는 그대로 전달합니다.
 *
 * 환경변수: Vercel 프로젝트 설정에 GEMINI_API_KEY 추가 (VITE_ 접두사 아님).
 */

// @vercel/node 의존성 없이 최소 타입만 정의합니다.
type Req = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type Res = {
  status: (code: number) => Res;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  send: (body: string) => void;
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// 허용 모델명 형식(경로 인젝션 방지).
const MODEL_RE = /^[a-zA-Z0-9._-]+$/;

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    return;
  }

  const raw = req.query.model;
  const model = Array.isArray(raw) ? raw[0] : raw;
  if (!model || !MODEL_RE.test(model)) {
    res.status(400).json({ error: "invalid or missing model" });
    return;
  }

  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });

    const text = await upstream.text();
    // Google의 상태 코드/본문을 그대로 전달(프론트의 재시도·폴백 로직이 활용).
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch {
    res.status(502).json({ error: "upstream request failed" });
  }
}
