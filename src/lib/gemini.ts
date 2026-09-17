/**
 * Gemini(Google Generative Language API) 연동 — 테스트용 프론트엔드 직접 호출.
 *
 * ⚠️ 주의: 이 모듈은 브라우저에서 API 키를 직접 사용합니다(키가 노출됨).
 *   - 로컬 테스트 전용입니다. 배포/공유 금지.
 *   - 실서비스 전환 시 반드시 백엔드 프록시로 키를 옮겨야 합니다.
 *
 * 키(VITE_GEMINI_API_KEY)가 없거나 호출이 실패하면 기존 규칙 기반
 * 소견(assessQualityEvent / assessCapaNeed)으로 자동 폴백합니다.
 * 따라서 키가 없어도 앱은 그대로 동작합니다.
 */
import {
  assessCapaNeed,
  assessQualityEvent,
  type AiReviewAssessment,
  type AiReviewSignal,
  type CapaAssessment,
  type QualityEvent,
} from "@/pages/quailty-event/queries";
import {
  buildChangeReviewOpinion,
  buildVerificationOpinion,
  type ChangeRequest,
  type ChangeReviewFinding,
  type ChangeReviewOpinion,
  type VerificationOpinion,
} from "@/pages/change-request-management/queries";
import {
  CHANGE_TYPE_OPTIONS,
  TARGET_TYPE_OPTIONS,
  type ChangeRequestValues,
} from "@/pages/change-request-management/change-request-register/schema";

// Vite 환경변수. 커스텀 키는 인덱스 시그니처가 없어 캐스팅해 읽습니다.
const env = import.meta.env as Record<string, string | undefined>;

const API_KEY = env.VITE_GEMINI_API_KEY?.trim();
/**
 * 무료 등급에서 쓸 수 있는 경량 모델. VITE_GEMINI_MODEL로 교체 가능.
 * (모델은 시기에 따라 바뀝니다. 최신 flash를 자동 추적하려면 "gemini-flash-latest" 사용.)
 */
const MODEL = env.VITE_GEMINI_MODEL?.trim() || "gemini-3.6-flash";

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/**
 * 호출 경로 선택.
 * - 로컬 개발(dev)에서 VITE_GEMINI_API_KEY가 있으면 Google을 직접 호출(기존 방식).
 * - 그 외(배포 등)에서는 서버리스 프록시(/api/gemini)를 통해 호출합니다.
 *   → 프로덕션 번들에 API 키가 노출되지 않습니다.
 */
const DIRECT = import.meta.env.DEV && Boolean(API_KEY);

/** 실제 요청 URL. DIRECT면 Google, 아니면 서버 프록시. */
function requestUrl(model: string): string {
  return DIRECT
    ? `${ENDPOINT(model)}?key=${API_KEY}`
    : `/api/gemini?model=${encodeURIComponent(model)}`;
}

/**
 * AI 호출 가능 여부.
 * dev는 키 유무로, 배포 환경은 프록시가 있다고 보고 활성으로 간주합니다
 * (서버 키가 없으면 호출이 실패해 규칙 기반으로 폴백됩니다).
 */
export function isGeminiEnabled(): boolean {
  return Boolean(API_KEY) || !import.meta.env.DEV;
}

/** 신호(근거) 항목 공용 스키마. */
const SIGNAL_SCHEMA = {
  type: "OBJECT",
  properties: {
    kind: { type: "STRING", enum: ["risk", "missing"] },
    label: { type: "STRING" },
    value: { type: "STRING" },
    detail: { type: "STRING" },
  },
  required: ["kind", "label", "value", "detail"],
} as const;

/**
 * 일시적(재시도 가치가 있는) HTTP 상태. 5xx=서버 과부하/오류만 재시도합니다.
 * 429(사용량 한도)는 분당 창이라 짧은 재시도가 무의미하고 한도만 더 소진하므로
 * 재시도하지 않고 즉시 실패시킵니다.
 */
const RETRIABLE_STATUS = new Set([500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

/** signal이 취소되면 즉시 reject하는 대기 헬퍼. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("aborted", "AbortError"));
    const id = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

/** generateContent 1회 호출. 재시도는 callGemini에서 처리합니다. */
async function callGeminiOnce(
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<string> {
  // 내부 타임아웃(20초)과 외부 취소 신호를 함께 처리합니다.
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const res = await fetch(requestUrl(MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const err = new Error(`Gemini API ${res.status}: ${errBody.slice(0, 300)}`);
      // 재시도 판단용 상태 코드를 함께 실어 보냅니다.
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }

    const data = await res.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini 응답에 본문이 없습니다.");
    return text;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Gemini generateContent 호출. 일시적 오류(503 등)는 지수 백오프로 재시도합니다.
 * 사용자 취소/타임아웃(AbortError)은 재시도하지 않고 즉시 전파합니다.
 */
async function callGemini(
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<string> {
  // 로컬 직접 호출 모드인데 키가 없으면 즉시 실패(→ 규칙 기반 폴백).
  // 배포 환경은 프록시(/api/gemini)가 서버 키로 처리합니다.
  if (import.meta.env.DEV && !API_KEY)
    throw new Error("VITE_GEMINI_API_KEY가 설정되지 않았습니다(로컬).");

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await callGeminiOnce(body, signal);
    } catch (err) {
      lastError = err;
      // 사용자 취소/타임아웃은 재시도하지 않습니다.
      if (signal?.aborted || (err as Error)?.name === "AbortError") throw err;

      const status = (err as { status?: number }).status;
      const isNetworkError = err instanceof TypeError; // fetch 자체 실패
      const retriable =
        (status !== undefined && RETRIABLE_STATUS.has(status)) || isNetworkError;

      if (!retriable || attempt === MAX_ATTEMPTS) throw err;

      // 600ms, 1200ms … 지수 백오프(취소되면 즉시 중단).
      console.warn(
        `[gemini] 일시적 오류로 재시도 ${attempt}/${MAX_ATTEMPTS - 1}:`,
        (err as Error).message
      );
      await delay(600 * 2 ** (attempt - 1), signal);
    }
  }
  throw lastError;
}

/**
 * Gemini에 JSON 스키마를 강제해 구조화 응답을 받습니다.
 * 실패(키 없음/네트워크/파싱)하면 예외를 던지고, 호출부에서 목으로 폴백합니다.
 */
async function generateJson<T>(
  prompt: string,
  responseSchema: unknown,
  signal?: AbortSignal
): Promise<T> {
  const text = await callGemini(
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema,
      },
    },
    signal
  );
  return JSON.parse(text) as T;
}

/** 품질 도우미 채팅용 대화 한 턴. */
export type ChatTurn = { role: "user" | "assistant"; text: string };

/** 품질 도우미 페르소나(시스템 지시). */
const QMS_SYSTEM_PROMPT = [
  "당신은 품질경영시스템(IQMS)의 '품질 도우미' AI입니다.",
  "품질 이벤트, 부적합(NC), 시정·예방조치(CAPA), 검토·판정 절차에 관한 질문에",
  "한국어로 정확하고 간결하며 실무적으로 답하세요.",
  "확실하지 않은 내용은 추측하지 말고 모른다고 밝히고, 필요한 경우 담당 부서/절차 확인을 권하세요.",
  "법률·규제 해석이 필요한 사안은 전문가 검토가 필요함을 함께 안내하세요.",
  "핵심 결론, 위험/주의 사항, 중요한 수치 등 강조가 필요한 부분은 **굵게** 표시하세요(예: **부적합**).",
  "그 외 제목(#)·목록 기호(-, *) 등 다른 마크다운 서식은 사용하지 마세요.",
  "당신은 정보 제공과 안내만 합니다. 문서(품질 이벤트·부적합·CAPA·조치)의 상태를 변경하거나 새 문서를 생성·등록·삭제할 수 없습니다.",
  "그런 요청을 받으면 직접 처리했다고 말하지 말고, 해당 메뉴/상세 화면에서 진행하도록 안내하세요.",
].join("\n");

/** Gemini 요청 파트(텍스트 또는 인라인 파일). */
type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/** 인라인(base64)으로 바로 보낼 수 있는 MIME. 이미지·PDF. */
const INLINE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
/** 인라인 첨부 크기 상한(무료 등급·요청 크기 고려). */
const MAX_INLINE_BYTES = 10 * 1024 * 1024;

/** 파일을 base64(순수 데이터)로 읽습니다. */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result); // data:<mime>;base64,XXXX
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** 첨부파일 1개를 Gemini 파트로 변환합니다(형식별 처리). */
async function fileToParts(file: File): Promise<GeminiPart[]> {
  const type = file.type || "";

  if (INLINE_MIME.has(type)) {
    if (file.size > MAX_INLINE_BYTES) {
      return [
        {
          text: `\n[첨부파일 '${file.name}'은 용량이 커서(>10MB) 분석에서 제외했습니다.]`,
        },
      ];
    }
    return [{ inlineData: { mimeType: type, data: await readAsBase64(file) } }];
  }

  // 텍스트류(txt/csv/md/json/log)는 내용을 읽어 프롬프트에 포함합니다.
  if (type.startsWith("text/") || /\.(txt|csv|md|json|log)$/i.test(file.name)) {
    const content = await file.text();
    return [
      { text: `\n[첨부파일: ${file.name}]\n${content.slice(0, 20000)}` },
    ];
  }

  const name = file.name.toLowerCase();

  // Word(.docx) — mammoth로 본문 텍스트만 추출.
  if (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    return [{ text: `\n[첨부파일: ${file.name}]\n${value.slice(0, 20000)}` }];
  }

  // Excel(.xlsx/.xls) — SheetJS로 각 시트를 CSV 텍스트로 변환.
  if (
    type.includes("spreadsheetml") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  ) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheets = wb.SheetNames.map(
      (sheetName) => `# ${sheetName}\n${XLSX.utils.sheet_to_csv(wb.Sheets[sheetName])}`
    );
    return [
      {
        text: `\n[첨부파일: ${file.name}]\n${sheets.join("\n\n").slice(0, 20000)}`,
      },
    ];
  }

  return [
    {
      text: `\n[첨부파일 '${file.name}'(${type || "형식 미상"})은 직접 읽을 수 없어 제외했습니다. 텍스트/이미지/PDF/Word/Excel만 분석 가능합니다.]`,
    },
  ];
}

/**
 * 품질 도우미 자유 대화 — 실제 Gemini 응답.
 * history는 지금까지의 대화(사용자/도우미 턴). attachments는 마지막 사용자 메시지의
 * 첨부파일로, 있으면 함께 전송해 AI가 읽고 답합니다.
 * 실패 시 예외를 던집니다(호출부에서 처리).
 */
export async function geminiChat(
  history: ChatTurn[],
  signal?: AbortSignal,
  attachments?: File[]
): Promise<string> {
  // Gemini contents는 user 턴으로 시작해야 하므로 앞쪽 assistant 턴은 제외합니다.
  const trimmed = [...history];
  while (trimmed.length > 0 && trimmed[0].role !== "user") trimmed.shift();

  const contents: { role: string; parts: GeminiPart[] }[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    const turn = trimmed[i];
    const isLast = i === trimmed.length - 1;
    const hasFiles = isLast && turn.role === "user" && !!attachments?.length;
    if (!turn.text.trim() && !hasFiles) continue;

    const parts: GeminiPart[] = [];
    if (turn.text.trim()) parts.push({ text: turn.text });
    if (hasFiles) {
      for (const file of attachments!) parts.push(...(await fileToParts(file)));
    }
    if (parts.length === 0) continue;

    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts,
    });
  }

  return callGemini(
    {
      systemInstruction: { parts: [{ text: QMS_SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.4 },
    },
    signal
  );
}

/** 이벤트를 프롬프트용 요약 텍스트로 직렬화(민감정보 최소화는 호출 데이터 단계에서 관리). */
function describeEvent(event: QualityEvent): string {
  return JSON.stringify(
    {
      제목: event.title,
      이벤트유형: event.eventType,
      심각도: event.severity,
      설명: event.description,
      관련프로젝트: event.relatedProject,
      관련제품: event.relatedProduct,
      관련공정: event.relatedProcess,
      고객영향: event.customerImpact,
      사업영향도: event.businessImpact,
      즉시조치필요: event.immediateActionRequired,
      즉시조치내용: event.immediateActionContent,
      첨부파일수: event.files?.length ?? 0,
      등록의견: event.registrationComment,
    },
    null,
    2
  );
}

/** 유효한 신호만 남깁니다(잘못된 항목은 버림). */
function sanitizeSignals(raw: unknown): AiReviewSignal[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is AiReviewSignal =>
        !!s &&
        (s.kind === "risk" || s.kind === "missing") &&
        typeof s.label === "string" &&
        typeof s.value === "string" &&
        typeof s.detail === "string"
    )
    .map((s) => ({
      kind: s.kind,
      label: s.label,
      value: s.value,
      detail: s.detail,
    }));
}

/**
 * 검토 단계 AI 소견 — 실제 Gemini 호출.
 * 실패 시 규칙 기반 assessQualityEvent로 폴백합니다.
 */
export async function geminiAssessQualityEvent(
  event: QualityEvent,
  signal?: AbortSignal
): Promise<AiReviewAssessment> {
  try {
    const prompt = [
      "당신은 품질경영시스템(QMS)의 부적합 검토를 돕는 AI 어시스턴트입니다.",
      "아래 품질 이벤트가 '부적합 의심(suspect)'인지, '정상 추정(normal)'인지,",
      "판단 정보가 부족(insufficient)한지 평가하세요.",
      "- 심각도·고객영향·사업영향·즉시조치 필요는 부적합 의심 신호입니다.",
      "- 설명이 짧거나 첨부파일이 없거나 즉시조치 내용이 비면 정보 부족 신호입니다.",
      "각 신호는 kind(risk=위험, missing=정보부족), label, value, detail(한국어 근거)로 작성하세요.",
      "summary와 detail은 모두 한국어로 간결하게 작성하세요. 결정이 아니라 참고 소견입니다.",
      "",
      "[품질 이벤트]",
      describeEvent(event),
    ].join("\n");

    const schema = {
      type: "OBJECT",
      properties: {
        verdict: {
          type: "STRING",
          enum: ["suspect", "normal", "insufficient"],
        },
        summary: { type: "STRING" },
        signals: { type: "ARRAY", items: SIGNAL_SCHEMA },
      },
      required: ["verdict", "summary", "signals"],
    };

    const out = await generateJson<{
      verdict: AiReviewAssessment["verdict"];
      summary: string;
      signals: unknown;
    }>(prompt, schema, signal);

    const verdictOk =
      out.verdict === "suspect" ||
      out.verdict === "normal" ||
      out.verdict === "insufficient";
    if (!verdictOk || typeof out.summary !== "string") {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }

    return {
      verdict: out.verdict,
      summary: out.summary,
      signals: sanitizeSignals(out.signals),
    };
  } catch (err) {
    console.warn("[gemini] 검토 소견 폴백(규칙 기반 사용):", err);
    return assessQualityEvent(event);
  }
}

/**
 * CAPA 필요 여부 AI 소견 — 실제 Gemini 호출.
 * 실패 시 규칙 기반 assessCapaNeed로 폴백합니다.
 */
export async function geminiAssessCapaNeed(
  event: QualityEvent,
  signal?: AbortSignal
): Promise<CapaAssessment> {
  try {
    const prompt = [
      "당신은 품질경영시스템(QMS)에서 CAPA(시정·예방조치) 필요 여부를 판단하는 AI 어시스턴트입니다.",
      "아래 부적합/품질 이벤트에 대해 근본원인 분석과 재발방지가 필요한 'required(CAPA 필요)'인지,",
      "경미하여 단순조치로 종결 가능한 'minor(경미/단순조치)'인지 평가하세요.",
      "- 심각도 높음·고객영향·사업영향 높음·즉시조치 필요 등은 CAPA 필요 신호입니다.",
      "각 신호는 kind(risk=위험, missing=정보부족), label, value, detail(한국어 근거)로 작성하세요.",
      "summary와 detail은 모두 한국어로 간결하게 작성하세요. 결정이 아니라 참고 소견입니다.",
      "",
      "[품질 이벤트]",
      describeEvent(event),
    ].join("\n");

    const schema = {
      type: "OBJECT",
      properties: {
        verdict: { type: "STRING", enum: ["required", "minor"] },
        summary: { type: "STRING" },
        signals: { type: "ARRAY", items: SIGNAL_SCHEMA },
      },
      required: ["verdict", "summary", "signals"],
    };

    const out = await generateJson<{
      verdict: CapaAssessment["verdict"];
      summary: string;
      signals: unknown;
    }>(prompt, schema, signal);

    const verdictOk = out.verdict === "required" || out.verdict === "minor";
    if (!verdictOk || typeof out.summary !== "string") {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }

    return {
      verdict: out.verdict,
      summary: out.summary,
      signals: sanitizeSignals(out.signals),
    };
  } catch (err) {
    console.warn("[gemini] CAPA 소견 폴백(규칙 기반 사용):", err);
    return assessCapaNeed(event);
  }
}

/* ------------------------------------------------------------------ */
/* 형상변경요청 AI 검토 소견 — 실제 Gemini 호출                          */
/* ------------------------------------------------------------------ */

const CHANGE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CHANGE_TYPE_OPTIONS.map((o) => [o.value, o.label])
);
const TARGET_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TARGET_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

/** 변경요청 폼 값을 프롬프트용 텍스트로 정리합니다(현행 등록 폼 기준). */
function describeChangeRequest(v: ChangeRequestValues): string {
  return [
    `- 변경 구분: ${CHANGE_TYPE_LABEL[v.changeType] ?? v.changeType}`,
    `- 긴급 여부(사용자 표기): ${v.grade === "urgent" ? "긴급" : "일반"}`,
    `- 변경 대상 유형: ${TARGET_TYPE_LABEL[v.targetType] ?? v.targetType}`,
    `- 대상 형상항목: ${v.targetItem} (리비전 ${v.currentRevision} → ${v.targetRevision})`,
    `- 변경 요청 사유: ${v.reason}`,
    `- 현재 문제점: ${v.asIs.trim() || "없음"}`,
    `- 기대효과: ${v.toBe.trim() || "없음"}`,
    `- 영향 범위(사용자 체크): ${v.impactScope.length ? v.impactScope.join(", ") : "없음"}`,
    `- 영향도(사용자 표기): 품질 ${v.qualityImpact} / 일정 ${v.scheduleImpact} / 원가 ${v.costImpact}`,
    `- 재검증·재인증 필요: ${v.revalidationRequired}`,
    `- 고객·규제 승인 필요: ${v.customerApprovalRequired}`,
    `- 적용 방법: ${v.applyMethod.trim() || "없음"}`,
    `- 롤백 필요 여부: ${v.rollbackNeeded} / 배포 필요 여부: ${v.deployNeeded}`,
    `- 검증 방법: ${v.verifyMethod.trim() || "없음"}`,
    `- 검증 기준: ${v.verifyCriteria.trim() || "없음"}`,
    `- 검증 증적 필요 여부: ${v.verifyEvidenceNeeded}`,
  ].join("\n");
}

/**
 * 신뢰도(%)를 0~100 정수로 정규화합니다.
 * 모델이 0~1 확률로 반환하면(예: 0.9) ×100 해서 %로 맞춥니다.
 */
function normalizeConfidence(raw: unknown): number {
  const n = Number(raw) || 0;
  const pct = n > 0 && n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** 검토 소견 finding 배열을 안전하게 정규화합니다(형식 오류 방어). */
function sanitizeFindings(raw: unknown): ChangeReviewFinding[] {
  if (!Array.isArray(raw)) return [];
  const OK: ChangeReviewFinding["status"][] = ["ok", "warn", "risk", "na"];
  return raw
    .filter((f): f is Record<string, unknown> => Boolean(f) && typeof f === "object")
    .map((f) => ({
      label: typeof f.label === "string" ? f.label : "",
      status: OK.includes(f.status as ChangeReviewFinding["status"])
        ? (f.status as ChangeReviewFinding["status"])
        : "warn",
      message: typeof f.message === "string" ? f.message : "",
    }))
    .filter((f) => f.label || f.message);
}

/**
 * 형상변경요청 AI 검토 소견 — 실제 Gemini 호출.
 * 변경 '내용'은 창작하지 않고, 자기신고 심각도와 실제 내용을 대조해
 * 과대/과소평가·누락·정합성을 점검합니다.
 * 키 없음/실패/한도 초과 시 규칙 기반 buildChangeReviewOpinion으로 폴백합니다.
 */
export async function geminiAssessChangeImpact(
  values: ChangeRequestValues,
  signal?: AbortSignal
): Promise<ChangeReviewOpinion> {
  const requestedUrgency: "일반" | "긴급" =
    values.grade === "urgent" ? "긴급" : "일반";

  try {
    const prompt = [
      "당신은 형상변경관리(Change Control)의 변경요청을 검토하는 QMS AI입니다.",
      "아래 변경요청을 읽고, 승인 전에 검토자·승인자가 확인해야 할 '검토 소견'을 작성하세요.",
      "원칙:",
      "- 변경 '내용'을 새로 작성·제안하지 마세요. 오직 점검·판정만 합니다.",
      "- 사용자가 표기한 긴급 여부·영향도를 그대로 믿지 말고, 실제 변경 내용(사유·현재 문제점·기대효과)과 대조하세요.",
      "  · 내용은 사소한데 긴급·높음으로 표기 → 과대평가 의심(consistency에 status=warn)",
      "  · 내용은 중대(안전·장애·보안·규제 등)한데 일반·낮음으로 표기 → 과소평가 의심",
      "- 변경 대상 유형(문서/소스/설정/DB/절차/산출물) 대비 통상 동반될 영향범위(문서/도면·검사/시험·공정·교육 등) 누락을 impactCheck로 점검하세요.",
      "- 적용 계획(적용 방법·롤백/배포 필요 여부)과 검증 계획(검증 방법·기준·증적)의 완성도·정합성을 consistency로 점검하세요.",
      "  · 삭제·DB/설정 변경인데 롤백 불필요, 소스/설정/DB 변경인데 재검증 아니오 → 재확인 지적",
      "  · 검증 방법·기준이 비었으면 지적",
      "- recommendedUrgency는 실제 내용 기준으로 판단하고, 요청과 다르면 urgencyRationale에 근거를 쓰세요.",
      "- 판단 근거가 부족하면 verdict=hold, insufficientEvidence=true.",
      "- verdict는 approve(승인 권고)/revise(보완 필요)/reject(반려 권고)/hold(판단 보류) 중 하나.",
      "- confidence는 0~100 사이의 정수(신뢰도 %)로 출력하세요. (0~1 소수 아님)",
      "- finding.status는 ok(확인)/warn(주의·누락)/risk(중대 결함)/na(해당없음).",
      "- 모든 문장은 한국어로 간결하게. 결정이 아니라 참고 소견입니다.",
      "",
      "[변경요청]",
      describeChangeRequest(values),
    ].join("\n");

    const FINDING_SCHEMA = {
      type: "OBJECT",
      properties: {
        label: { type: "STRING" },
        status: { type: "STRING", enum: ["ok", "warn", "risk", "na"] },
        message: { type: "STRING" },
      },
      required: ["label", "status", "message"],
    };

    const schema = {
      type: "OBJECT",
      properties: {
        verdict: {
          type: "STRING",
          enum: ["approve", "revise", "reject", "hold"],
        },
        confidence: { type: "NUMBER" },
        summary: { type: "STRING" },
        recommendedUrgency: { type: "STRING", enum: ["일반", "긴급"] },
        urgencyRationale: { type: "STRING" },
        impactCheck: { type: "ARRAY", items: FINDING_SCHEMA },
        consistency: { type: "ARRAY", items: FINDING_SCHEMA },
        questions: { type: "ARRAY", items: { type: "STRING" } },
        insufficientEvidence: { type: "BOOLEAN" },
      },
      required: [
        "verdict",
        "confidence",
        "summary",
        "recommendedUrgency",
        "urgencyRationale",
        "impactCheck",
        "consistency",
        "questions",
        "insufficientEvidence",
      ],
    };

    const out = await generateJson<{
      verdict: ChangeReviewOpinion["verdict"];
      confidence: number;
      summary: string;
      recommendedUrgency: "일반" | "긴급";
      urgencyRationale: string;
      impactCheck: unknown;
      consistency: unknown;
      questions: unknown;
      insufficientEvidence: unknown;
    }>(prompt, schema, signal);

    const verdictOk = ["approve", "revise", "reject", "hold"].includes(
      out.verdict
    );
    if (!verdictOk || typeof out.summary !== "string") {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }

    const recommendedUrgency: "일반" | "긴급" =
      out.recommendedUrgency === "긴급" ? "긴급" : "일반";
    const confidence = normalizeConfidence(out.confidence);
    const questions = Array.isArray(out.questions)
      ? out.questions.filter((q): q is string => typeof q === "string")
      : [];

    return {
      verdict: out.verdict,
      confidence,
      summary: out.summary,
      urgency: {
        requested: requestedUrgency,
        recommended: recommendedUrgency,
        rationale:
          typeof out.urgencyRationale === "string" ? out.urgencyRationale : "",
      },
      impactCheck: sanitizeFindings(out.impactCheck),
      consistency: sanitizeFindings(out.consistency),
      questions,
      insufficientEvidence: out.insufficientEvidence === true,
      generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      source: "ai",
    };
  } catch (err) {
    console.warn("[gemini] 형상변경 검토 소견 폴백(규칙 기반 사용):", err);
    return buildChangeReviewOpinion(values);
  }
}

/** 검증 판정 입력 요약(검증 결과 vs 기준 대조용). */
function describeVerification(cr: ChangeRequest, resultText: string): string {
  return [
    `- 변경 대상: ${cr.targetTypeName} '${cr.targetItem}' (리비전 ${cr.currentRevision} → ${cr.targetRevision})`,
    `- 변경 요청 사유: ${cr.reason || "없음"}`,
    `- 적용 방법: ${cr.applyMethod.trim() || "없음"}`,
    `- 검증 방법: ${cr.verifyMethod.trim() || "없음"}`,
    `- 검증 기준: ${cr.verifyCriteria.trim() || "없음"}`,
    `- 검증 증적 필요 여부: ${cr.verifyEvidenceNeeded}`,
    `- 입력된 검증 결과: ${resultText.trim() || "없음"}`,
  ].join("\n");
}

/**
 * 형상변경 검증 판정 소견 — 실제 Gemini 호출.
 * 입력된 '검증 결과'를 '검증 기준'과 대조해 적합/부적합을 사전 판정합니다.
 * 결과를 창작하지 않으며, 최종 판단은 검증 담당자가 합니다.
 * 키 없음/실패/한도 초과 시 규칙 기반 buildVerificationOpinion으로 폴백합니다.
 */
export async function geminiAssessVerification(
  cr: ChangeRequest,
  resultText: string,
  signal?: AbortSignal
): Promise<VerificationOpinion> {
  try {
    const prompt = [
      "당신은 형상변경관리(Change Control)의 변경 검증을 돕는 QMS AI입니다.",
      "아래 '검증 결과'가 '검증 기준'을 충족하는지 대조해 '검증 판정 소견'을 작성하세요.",
      "원칙:",
      "- 검증 결과를 새로 창작·가정하지 마세요. 입력된 결과만 근거로 판단합니다.",
      "- verdict: pass(검증 기준 충족)/fail(미충족·오류)/unclear(결과만으로 판단 불가) 중 하나.",
      "- 검증 결과가 비었거나 근거가 부족하면 verdict=unclear.",
      "- 검증 기준이 비어 있으면 대조가 어렵다는 점을 checks에 표시하고 대체로 unclear로 판단.",
      "- checks에는 검증 기준 정의 여부, 결과-기준 대조, 증적 충분성 등을 점검해 담으세요.",
      "- confidence는 0~100 사이의 정수(신뢰도 %)로 출력하세요. (0~1 소수 아님)",
      "- finding.status는 ok(확인)/warn(주의·부족)/risk(중대 결함·미충족)/na(해당없음).",
      "- 모든 문장은 한국어로 간결하게. 결정이 아니라 참고 소견입니다.",
      "",
      "[검증 대상·기준·결과]",
      describeVerification(cr, resultText),
    ].join("\n");

    const FINDING_SCHEMA = {
      type: "OBJECT",
      properties: {
        label: { type: "STRING" },
        status: { type: "STRING", enum: ["ok", "warn", "risk", "na"] },
        message: { type: "STRING" },
      },
      required: ["label", "status", "message"],
    };

    const schema = {
      type: "OBJECT",
      properties: {
        verdict: { type: "STRING", enum: ["pass", "fail", "unclear"] },
        confidence: { type: "NUMBER" },
        summary: { type: "STRING" },
        checks: { type: "ARRAY", items: FINDING_SCHEMA },
      },
      required: ["verdict", "confidence", "summary", "checks"],
    };

    const out = await generateJson<{
      verdict: VerificationOpinion["verdict"];
      confidence: number;
      summary: string;
      checks: unknown;
    }>(prompt, schema, signal);

    const verdictOk = ["pass", "fail", "unclear"].includes(out.verdict);
    if (!verdictOk || typeof out.summary !== "string") {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }

    const confidence = normalizeConfidence(out.confidence);

    return {
      verdict: out.verdict,
      confidence,
      summary: out.summary,
      checks: sanitizeFindings(out.checks),
      generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      source: "ai",
    };
  } catch (err) {
    console.warn("[gemini] 형상변경 검증 판정 폴백(규칙 기반 사용):", err);
    return buildVerificationOpinion(cr, resultText);
  }
}

/** CAPA 계획 초안(판정이 아니라 폼 채우기용 제안). */
export type CapaPlanDraft = {
  type: "corrective" | "preventive" | "both";
  title: string;
  content: string;
  /** 우선순위 제안(심각도·영향 기반). 조치 등록 폼에서 사용합니다. */
  priority?: "high" | "medium" | "low";
};

/** 규칙 기반 CAPA 계획 초안(폴백용). */
function mockCapaPlanDraft(event: QualityEvent): CapaPlanDraft {
  const high =
    event.severity === "HIGH" ||
    event.customerImpact === "예" ||
    event.businessImpact === "높음";
  const priority: "high" | "medium" | "low" = high
    ? "high"
    : event.severity === "LOW"
      ? "low"
      : "medium";
  return {
    type: high ? "both" : "corrective",
    priority,
    title: `${event.title} 시정·예방조치`,
    content: [
      `[근본원인(가설)] ${event.title} 관련 프로세스/관리 미비로 추정됩니다.`,
      "[시정조치] 발생 건을 즉시 조치하고 관련 절차/기록을 보완합니다.",
      high
        ? "[예방조치] 재발 방지를 위해 표준·체크리스트를 강화하고 담당자 교육을 실시합니다."
        : "",
      "※ AI 초안입니다. 담당 부서 검토 후 확정해 주세요.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/**
 * CAPA 계획 초안 추천 — 실제 Gemini 호출.
 * 판정이 아니라 계획 폼(유형·제목·내용) 초안을 제안합니다.
 * 실패 시 규칙 기반 초안으로 폴백합니다.
 */
export async function geminiSuggestCapaPlan(
  event: QualityEvent,
  signal?: AbortSignal
): Promise<CapaPlanDraft> {
  try {
    const prompt = [
      "당신은 품질경영시스템(QMS)에서 CAPA(시정·예방조치) 계획 수립을 돕는 AI입니다.",
      "아래 품질 이벤트/부적합에 대해 CAPA 계획 초안을 제안하세요. 판정이 아니라 작성 보조입니다.",
      "- type: 시정조치만이면 corrective, 예방조치만이면 preventive, 둘 다면 both.",
      "- title: 간결한 CAPA 제목.",
      "- content: 근본원인(가설), 시정조치, (필요 시) 예방조치를 포함한 계획 초안. 한국어로 실무적으로.",
      "- priority: 조치 우선순위를 심각도·고객/사업 영향으로 판단해 high(높음)/medium(보통)/low(낮음) 중 하나로 제안하세요.",
      "content에서 여러 단계·항목이면 각 항목을 줄바꿈(\\n)으로 구분해 한 줄에 하나씩 쓰세요(예: \"1. …\\n2. …\"). 굵게(**)·제목(#) 등 마크다운 서식은 쓰지 마세요.",
      "",
      "[품질 이벤트]",
      describeEvent(event),
    ].join("\n");

    const schema = {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", enum: ["corrective", "preventive", "both"] },
        title: { type: "STRING" },
        content: { type: "STRING" },
        priority: { type: "STRING", enum: ["high", "medium", "low"] },
      },
      required: ["type", "title", "content", "priority"],
    };

    const out = await generateJson<CapaPlanDraft>(prompt, schema, signal);
    const typeOk =
      out.type === "corrective" ||
      out.type === "preventive" ||
      out.type === "both";
    if (!typeOk || typeof out.title !== "string" || typeof out.content !== "string") {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }
    const priorityOk =
      out.priority === "high" ||
      out.priority === "medium" ||
      out.priority === "low";
    return {
      type: out.type,
      title: out.title,
      content: formatPlanText(out.content),
      priority: priorityOk ? out.priority : "medium",
    };
  } catch (err) {
    console.warn("[gemini] CAPA 계획 초안 폴백(규칙 기반 사용):", err);
    return mockCapaPlanDraft(event);
  }
}

/**
 * 한 줄로 붙은 번호 항목(1. 2. 3.)을 줄바꿈으로 분리합니다.
 * 모델이 개행을 빼먹고 항목을 붙여 내보내는 경우를 보정합니다.
 * ("2.5" 처럼 뒤에 공백이 없는 소수는 건드리지 않습니다.)
 */
function formatPlanText(text: string): string {
  return (
    text
      // "1. …" 형태(숫자+마침표) 항목 앞에서 줄바꿈
      .replace(/\s+(?=\d+\.\s)/g, "\n")
      // "1 Why:", "2 Why …" 형태(5 Why 분석) 단계 앞에서 줄바꿈
      .replace(/\s+(?=\d+\s*Why\b)/gi, "\n")
      // "Why 1:", "Why 2 …" 형태(Why 뒤 숫자) 단계 앞에서 줄바꿈
      .replace(/\s+(?=Why\s*\d+\b)/gi, "\n")
      // "1)" 형태 항목 앞에서 줄바꿈
      .replace(/\s+(?=\d+\)\s)/g, "\n")
      .trim()
  );
}

/** 규칙 기반 단순조치 계획 초안(폴백용). */
function mockActionPlanDraft(event: QualityEvent): string {
  return [
    `[단순조치 계획] ${event.title} 관련 표기/기록 오류를 정정하고 관련 문서를 재확인합니다.`,
    "필요 시 담당자에게 재공지하고 처리 결과를 기록합니다.",
    "※ AI 초안입니다. 실제 상황에 맞게 수정해 주세요.",
  ].join("\n");
}

/**
 * 단순조치 계획 초안 추천 — 실제 Gemini 호출.
 * 판정이 아니라 조치 계획(자유 텍스트) 초안을 제안합니다.
 * 실패 시 규칙 기반 초안으로 폴백합니다.
 */
export async function geminiSuggestActionPlan(
  event: QualityEvent,
  signal?: AbortSignal
): Promise<string> {
  try {
    const prompt = [
      "당신은 품질경영시스템(QMS)에서 경미 부적합/단순조치 계획 작성을 돕는 AI입니다.",
      "아래 부적합/품질 이벤트에 대해 간단한 단순조치 계획 초안을 제안하세요. 판정이 아니라 작성 보조입니다.",
      "간결하고 실무적으로 한국어로 작성하세요.",
      "여러 단계·항목이면 각 항목을 줄바꿈(\\n)으로 구분해 한 줄에 하나씩 쓰세요(예: \"1. …\\n2. …\\n3. …\"). 굵게(**)·제목(#) 등 마크다운 서식은 쓰지 마세요.",
      "",
      "[품질 이벤트]",
      describeEvent(event),
    ].join("\n");

    const schema = {
      type: "OBJECT",
      properties: { plan: { type: "STRING" } },
      required: ["plan"],
    };

    const out = await generateJson<{ plan: string }>(prompt, schema, signal);
    if (typeof out.plan !== "string" || !out.plan.trim()) {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }
    return formatPlanText(out.plan);
  } catch (err) {
    console.warn("[gemini] 조치 계획 초안 폴백(규칙 기반 사용):", err);
    return mockActionPlanDraft(event);
  }
}

/** 원인분석 초안(제안). 판정이 아니라 분석 보조이며, 분석자가 검토·수정합니다. */
export type RootCauseDraft = {
  /** 5why | fishbone | fta | etc */
  method: string;
  directCause: string;
  rootCause: string;
  content: string;
};

/** 규칙 기반 원인분석 초안(폴백용). 심각도에 따라 기법을 달리 제안합니다. */
function mockRootCauseDraft(event: QualityEvent): RootCauseDraft {
  const method =
    event.severity === "HIGH"
      ? "fta"
      : event.severity === "MEDIUM"
        ? "fishbone"
        : "5why";
  return {
    method,
    directCause: `${event.title} 발생 시점에 절차가 정해진 대로 수행되지 않은 것이 직접 원인으로 추정됩니다.`,
    rootCause:
      "점검·확인 체계가 미흡해 동일 문제가 재발할 수 있는 구조적 원인이 있습니다.",
    content: [
      "1. 왜? — 해당 작업이 절차대로 수행되지 않았습니다.",
      "2. 왜? — 절차 확인/점검 단계가 누락되었습니다.",
      "3. 왜? — 점검 체크리스트가 최신 절차를 반영하지 못했습니다.",
      "4. 왜? — 절차 개정 시 교육·공지가 충분하지 않았습니다.",
      "5. 왜? — 개정 관리 프로세스가 명확히 정의되어 있지 않습니다.",
      "※ AI 초안입니다. 분석자가 검토·수정 후 확정해 주세요.",
    ].join("\n"),
  };
}

/**
 * 원인분석 초안 추천 — 실제 Gemini 호출.
 * 판정이 아니라 분석 보조입니다(직접 원인·근본 원인·분석 과정 초안).
 * 실패 시 규칙 기반 초안으로 폴백합니다.
 */
export async function geminiSuggestRootCause(
  event: QualityEvent,
  signal?: AbortSignal
): Promise<RootCauseDraft> {
  try {
    const prompt = [
      "당신은 품질경영시스템(QMS)에서 원인분석(Root Cause Analysis)을 돕는 AI입니다.",
      "아래 품질 이벤트/부적합에 대해 원인분석 초안을 제안하세요. 판정이 아니라 분석 보조이며, 분석자가 검토·수정해 확정합니다.",
      "- method: 문제 성격에 맞는 기법을 고르세요. 단일 인과 사슬이 뚜렷하면 5why, 여러 요인(사람·설비·방법·자재·환경 등)이 복합되면 fishbone(특성요인도), 복합 고장·안전 위험이 크거나 결함이 여러 경로로 전파되면 fta, 위 셋에 해당하지 않으면 etc. 항상 5why만 고르지 말고 이벤트 특성에 맞게 다르게 선택하세요.",
      "- directCause: 현상 수준의 직접 원인.",
      "- rootCause: 구조적/시스템 수준의 근본 원인.",
      "- content: 선택한 method에 맞춰 분석 과정을 단계별로 작성하세요(5why면 Why 5단계, fishbone이면 요인 범주별 원인, fta면 상위 사건→기여 원인). 각 단계·항목은 줄바꿈(\\n)으로 한 줄씩 쓰세요. 굵게(**)·제목(#) 등 마크다운 서식은 쓰지 마세요.",
      "",
      "[품질 이벤트]",
      describeEvent(event),
    ].join("\n");

    const schema = {
      type: "OBJECT",
      properties: {
        method: { type: "STRING", enum: ["5why", "fishbone", "fta", "etc"] },
        directCause: { type: "STRING" },
        rootCause: { type: "STRING" },
        content: { type: "STRING" },
      },
      required: ["method", "directCause", "rootCause", "content"],
    };

    const out = await generateJson<RootCauseDraft>(prompt, schema, signal);
    if (
      typeof out.directCause !== "string" ||
      typeof out.rootCause !== "string" ||
      typeof out.content !== "string" ||
      !out.content.trim()
    ) {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }
    const methodOk = ["5why", "fishbone", "fta", "etc"].includes(out.method);
    return {
      method: methodOk ? out.method : "5why",
      directCause: out.directCause,
      rootCause: out.rootCause,
      content: formatPlanText(out.content),
    };
  } catch (err) {
    console.warn("[gemini] 원인분석 초안 폴백(규칙 기반 사용):", err);
    return mockRootCauseDraft(event);
  }
}

/**
 * 조치 완료 의견 요약 — 실제 Gemini 호출.
 * 사실을 지어내지 않고, 사용자가 입력한 '실제 조치 내용'을 1~2문장으로 요약·정리합니다.
 * (실제 조치 내용 자체는 사실 기록이므로 AI가 생성하지 않습니다.)
 */
export async function geminiSummarizeActionCompletion(
  actualContent: string,
  signal?: AbortSignal
): Promise<string> {
  const src = actualContent.trim();
  try {
    if (!src) throw new Error("요약할 실제 조치 내용이 없습니다.");
    const prompt = [
      "당신은 품질경영시스템(QMS)에서 조치 완료 보고 작성을 돕는 AI입니다.",
      "아래 '실제 수행한 조치 내용'을 바탕으로 완료 의견을 1~2문장으로 간결히 요약·정리하세요.",
      "중요: 주어진 내용에 없는 새로운 사실을 지어내지 마세요. 마크다운 서식(**, # 등)은 쓰지 마세요.",
      "",
      "[실제 조치 내용]",
      src,
    ].join("\n");

    const schema = {
      type: "OBJECT",
      properties: { opinion: { type: "STRING" } },
      required: ["opinion"],
    };

    const out = await generateJson<{ opinion: string }>(prompt, schema, signal);
    if (typeof out.opinion !== "string" || !out.opinion.trim()) {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }
    return out.opinion.trim();
  } catch (err) {
    console.warn("[gemini] 완료 의견 요약 폴백(규칙 기반 사용):", err);
    // 폴백: 새 사실 없이 입력 앞부분을 정리.
    return src
      ? `${src.split("\n")[0].slice(0, 80)} 등 계획된 조치를 수행하여 완료했습니다.`
      : "";
  }
}

/** 효과성 검증 계획 초안(방법·기준). 판정이 아니라 작성 보조입니다. */
export type EffectivenessPlanDraft = { method: string; criteria: string };

/** 규칙 기반 효과성 검증 계획 초안(폴백용). */
function mockEffectivenessPlanDraft(event: QualityEvent): EffectivenessPlanDraft {
  return {
    method: `${event.title} 관련 조치 전후 지표를 비교하고, 현장 점검과 기록 확인으로 일정 기간 재발 여부를 검증한다.`,
    criteria: "동일 부적합 재발 0건, 관련 절차 준수율 100% 달성.",
  };
}

/**
 * 효과성 검증 계획 초안 추천 — 실제 Gemini 호출.
 * "어떻게 검증할지(방법)"와 "효과 판정 기준(기준)" 초안을 제안합니다.
 * 실패 시 규칙 기반 초안으로 폴백합니다.
 */
export async function geminiSuggestEffectivenessPlan(
  event: QualityEvent,
  signal?: AbortSignal
): Promise<EffectivenessPlanDraft> {
  try {
    const prompt = [
      "당신은 품질경영시스템(QMS)에서 CAPA 효과성 검증 계획 수립을 돕는 AI입니다.",
      "아래 품질 이벤트/부적합에 대해, 시정·예방조치가 효과 있었는지 검증할 방법과 기준 초안을 제안하세요. 판정이 아니라 작성 보조입니다.",
      "- method: 어떻게 검증할지(예: 조치 전후 지표 비교, 현장 점검, 기록/데이터 확인, 모니터링 기간 등).",
      "- criteria: 효과 있음으로 판정할 정량/정성 기준.",
      "한국어로 간결하고 실무적으로 작성하세요. 마크다운 서식(**, # 등)은 쓰지 마세요.",
      "",
      "[품질 이벤트]",
      describeEvent(event),
    ].join("\n");

    const schema = {
      type: "OBJECT",
      properties: {
        method: { type: "STRING" },
        criteria: { type: "STRING" },
      },
      required: ["method", "criteria"],
    };

    const out = await generateJson<EffectivenessPlanDraft>(
      prompt,
      schema,
      signal
    );
    if (
      typeof out.method !== "string" ||
      !out.method.trim() ||
      typeof out.criteria !== "string" ||
      !out.criteria.trim()
    ) {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }
    return { method: out.method.trim(), criteria: out.criteria.trim() };
  } catch (err) {
    console.warn("[gemini] 효과성 검증 계획 초안 폴백(규칙 기반 사용):", err);
    return mockEffectivenessPlanDraft(event);
  }
}

/**
 * 효과성 검증 의견 초안 추천 — 실제 Gemini 호출.
 * 검증자가 이미 정한 결과(효과있음/효과없음)와 일관되게 검증 의견을 정리합니다.
 * (결과 판단은 사람이 하며, AI는 판단을 뒤집지 않습니다.)
 */
export async function geminiSuggestEffectivenessOpinion(
  result: "effective" | "ineffective",
  criteria: string,
  event: QualityEvent,
  signal?: AbortSignal
): Promise<string> {
  const resultLabel = result === "effective" ? "효과있음" : "효과없음";
  try {
    const prompt = [
      "당신은 품질경영시스템(QMS)에서 CAPA 효과성 검증 의견 작성을 돕는 AI입니다.",
      `검증자가 이미 결과를 '${resultLabel}'으로 판단했습니다. 이 결과와 일관되게 검증 의견을 1~2문장으로 정리하세요.`,
      "중요: 결과를 바꾸거나 판단을 뒤집지 마세요. 주어진 검증 기준과 결과에 근거해 간결히 작성하세요. 마크다운 서식은 쓰지 마세요.",
      "",
      `[검증 기준] ${criteria.trim() || "(미입력)"}`,
      "[품질 이벤트]",
      describeEvent(event),
    ].join("\n");

    const schema = {
      type: "OBJECT",
      properties: { opinion: { type: "STRING" } },
      required: ["opinion"],
    };

    const out = await generateJson<{ opinion: string }>(prompt, schema, signal);
    if (typeof out.opinion !== "string" || !out.opinion.trim()) {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }
    return out.opinion.trim();
  } catch (err) {
    console.warn("[gemini] 효과성 검증 의견 초안 폴백(규칙 기반 사용):", err);
    return result === "effective"
      ? "설정한 검증 기준을 충족하여 조치가 효과적인 것으로 판단합니다."
      : "설정한 검증 기준을 충족하지 못해 추가 조치가 필요한 것으로 판단합니다.";
  }
}

/**
 * CAPA 종료 의견 초안 추천 — 실제 Gemini 호출.
 * 효과성 검증에서 '효과있음'이 확인되어 종료하는 상황에 맞는 종료 의견을 제안합니다.
 * (종료 판단은 이미 검증 결과로 정해졌으며, AI는 그 근거를 정리만 합니다.)
 */
export async function geminiSuggestCapaClosure(
  event: QualityEvent,
  effectivenessOpinion: string,
  signal?: AbortSignal
): Promise<string> {
  try {
    const prompt = [
      "당신은 품질경영시스템(QMS)에서 CAPA 종료 의견 작성을 돕는 AI입니다.",
      "효과성 검증에서 '효과있음'이 확인되어 CAPA를 종료합니다. 이에 맞는 종료 의견을 1~2문장으로 정리하세요.",
      "중요: 새로운 판단을 만들지 말고, 효과성 검증 결과와 이벤트 맥락에 근거해 간결히 작성하세요. 마크다운 서식은 쓰지 마세요.",
      "",
      effectivenessOpinion.trim()
        ? `[효과성 검증 의견] ${effectivenessOpinion.trim()}`
        : "",
      "[품질 이벤트]",
      describeEvent(event),
    ]
      .filter(Boolean)
      .join("\n");

    const schema = {
      type: "OBJECT",
      properties: { comment: { type: "STRING" } },
      required: ["comment"],
    };

    const out = await generateJson<{ comment: string }>(prompt, schema, signal);
    if (typeof out.comment !== "string" || !out.comment.trim()) {
      throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }
    return out.comment.trim();
  } catch (err) {
    console.warn("[gemini] CAPA 종료 의견 초안 폴백(규칙 기반 사용):", err);
    return "효과성 검증에서 효과가 확인되어 재발 위험이 해소되었으므로 CAPA를 종료합니다.";
  }
}

/** 이미지 생성 모델. 텍스트 모델과 별개이며 VITE_GEMINI_IMAGE_MODEL로 교체 가능. */
const IMAGE_MODEL =
  env.VITE_GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";

/** 생성된 이미지(인라인 base64). */
export type GeneratedImage = { mimeType: string; data: string };

/**
 * 이미지/차트 생성 — 이미지 모델 호출. 성공 시 인라인 이미지를 반환합니다.
 * 실패(모델 미지원/한도/취소)하면 예외를 던집니다(호출부에서 처리).
 */
export async function geminiGenerateImage(
  prompt: string,
  signal?: AbortSignal
): Promise<GeneratedImage> {
  if (import.meta.env.DEV && !API_KEY)
    throw new Error("VITE_GEMINI_API_KEY가 설정되지 않았습니다(로컬).");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 40000);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const res = await fetch(requestUrl(IMAGE_MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const err = new Error(
        `Gemini 이미지 API ${res.status}: ${errBody.slice(0, 300)}`
      );
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }

    const data = await res.json();
    const parts: { inlineData?: { mimeType?: string; data?: string } }[] =
      data?.candidates?.[0]?.content?.parts ?? [];
    const image = parts.find((p) => p.inlineData?.data)?.inlineData;
    if (!image?.data) throw new Error("이미지 응답이 없습니다.");
    return { mimeType: image.mimeType || "image/png", data: image.data };
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}
