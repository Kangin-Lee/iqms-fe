import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  Bot,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  Paperclip,
  Plus,
  SendHorizontal,
  UserRound,
  X,
} from "lucide-react";

import {
  geminiAssessCapaNeed,
  geminiAssessQualityEvent,
  geminiChat,
  geminiGenerateImage,
  type ChatTurn,
} from "@/lib/gemini";
import { useNavigate } from "react-router";

import { cn } from "@/lib/utils";
import { currentUser } from "@/mock/currentUser";
import { qualityEventData } from "@/mock/quailty-event/quailtyEventData";
import {
  AI_VERDICT_META,
  isMyReviewPending,
  type AiReviewAssessment,
  type AiReviewSignal,
  type CapaAssessment,
  type QualityEvent,
} from "@/pages/quailty-event/queries";
import {
  getCapaProgress,
  getMyActionTargets,
  type ActionRow,
} from "@/pages/capa-management/queries";
import {
  getNonconformitiesSync,
  MINOR_CLOSURE_PATH,
} from "@/pages/nonconformity-management/queries";
import ChatDataChart, {
  type ChatChartSpec,
} from "@/components/chat-data-chart";
import { QUALITY_EVENT_FROM_PARAM } from "@/pages/quailty-event/paths";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent } from "@/components/ui/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Textarea } from "@/components/ui/textarea";

type ChatRole = "assistant" | "user";

type ChatAttachment = {
  id: string;
  file: File;
  previewUrl?: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  attachments?: ChatAttachment[];
  /** 생성된 이미지(data URL). 있으면 말풍선 아래에 표시합니다. */
  imageUrl?: string;
  /** 실제 데이터 차트. 있으면 말풍선 아래에 렌더합니다. */
  chart?: ChatChartSpec;
  /** 사용자가 바로 고를 수 있는 보기. 해당 메시지가 마지막일 때만 노출됩니다. */
  suggestions?: string[];
};

type MenuOption = {
  label: string;
  /** 선택 시 이벤트 번호 입력을 먼저 요구합니다. */
  requiresEventNumber?: boolean;
};

/** 도우미가 제안하는 보기 항목. 표시 순서가 곧 선택 번호입니다. */
const MENU_OPTIONS: MenuOption[] = [
  { label: "내 할 일" },
  { label: "부적합 판정", requiresEventNumber: true },
  { label: "CAPA 판정", requiresEventNumber: true },
  { label: "기타" },
];

const MENU_SUGGESTIONS = MENU_OPTIONS.map((option) => option.label);

const EVENT_NUMBER_EXAMPLE = "QE-2026-005";

/** mock 응답 지연. 실제 연동 시 제거합니다. */
const MOCK_REPLY_DELAY = 500;

/**
 * 대화 진행 상태.
 * - menu: 보기 선택 대기
 * - event-number: 이벤트 번호 입력 대기
 * - freeform: 자유 질문 입력 대기
 */
type FlowState =
  | { kind: "menu" }
  | { kind: "event-number"; topic: string }
  | { kind: "freeform" };

const GREETING_TEXT =
  "안녕하세요. IQMS 품질 도우미입니다. 무엇을 도와드릴까요?\n번호를 입력해 보기를 선택하거나, 궁금한 점을 자유롭게 물어보세요.";

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    role: "assistant",
    text: GREETING_TEXT,
    suggestions: MENU_SUGGESTIONS,
  },
];

/** 개별 채팅 세션. 메시지·진행 상태·입력 초안을 각자 보유합니다. */
type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  flow: FlowState;
  draft: string;
  attachments: ChatAttachment[];
  /** 이 대화에서 mock 응답을 기다리는 중인지. */
  isResponding: boolean;
  /** 내 업무 질문이 한 번이라도 나온 대화. 이후 AI 응답에 업무 데이터를 함께 넘깁니다. */
  workAware: boolean;
};

/** seq는 대화 id와 기본 제목에 함께 쓰이는 표시용 번호입니다. */
function createConversation(seq: number): Conversation {
  return {
    id: `c${seq}`,
    title: `새 대화 ${seq}`,
    messages: [...INITIAL_MESSAGES],
    flow: { kind: "menu" },
    draft: "",
    attachments: [],
    isResponding: false,
    workAware: false,
  };
}

/** 첫 사용자 입력을 대화 제목으로 승격시켜 목록에서 구분되게 합니다. */
function deriveTitle(conversation: Conversation, text: string) {
  const trimmed = text.trim();
  const hasUserMessage = conversation.messages.some(
    (item) => item.role === "user"
  );

  if (hasUserMessage || !trimmed) return conversation.title;
  return trimmed.length > 20 ? `${trimmed.slice(0, 20)}…` : trimmed;
}

/** 입력값을 보기 번호(1~3) 또는 보기 이름으로 해석합니다. */
function findMenuOption(input: string) {
  const normalized = input.trim().replace(/[.)]$/, "").trim();

  const index = Number(normalized);
  if (Number.isInteger(index) && index >= 1 && index <= MENU_OPTIONS.length) {
    return MENU_OPTIONS[index - 1];
  }

  return MENU_OPTIONS.find((option) => option.label === normalized);
}

/** CAPA 판정 결과 표시명. */
const CAPA_JUDGMENT_LABEL: Record<CapaAssessment["verdict"], string> = {
  required: "CAPA 필요",
  minor: "경미 부적합/단순조치",
};

/**
 * 자유 텍스트 안에서 등록된 품질 이벤트를 찾습니다.
 * "QE-2026-006 부적합 판정 해줘"처럼 번호 앞뒤에 다른 말이 붙어도 인식합니다.
 */
function findEventInText(text: string): QualityEvent | undefined {
  const lower = text.toLowerCase();
  // 1) 이벤트 번호가 텍스트 안에 그대로 포함된 경우.
  const direct = qualityEventData.find((e) =>
    lower.includes(e.eventNumber.toLowerCase())
  );
  if (direct) return direct;

  // 2) QE-YYYY-NNN 패턴을 추출해 숫자만 비교(공백·구분자 차이 허용).
  const match = lower.match(/qe[-\s]?\d{4}[-\s]?\d{1,4}/);
  if (!match) return undefined;
  const digits = match[0].replace(/\D/g, "");
  return qualityEventData.find(
    (e) => e.eventNumber.replace(/\D/g, "") === digits
  );
}

/**
 * 자유 텍스트에서 판정 의도(부적합/CAPA)를 추정합니다.
 * "판정"이라는 단어가 있어야 판정으로 봅니다.
 * (예: "경미 부적합/단순조치…" 처럼 '부적합'만 포함된 문구를 오인하지 않도록)
 */
function detectJudgmentTopic(text: string): string | null {
  if (!/판정/.test(text)) return null;
  if (/capa/i.test(text) || text.includes("시정") || text.includes("예방")) {
    return "CAPA 판정";
  }
  if (text.includes("부적합")) return "부적합 판정";
  return null;
}

/**
 * 문서 상태 변경/생성 명령인지 추정합니다.
 * (품질 도우미는 이런 실행을 하지 않고 화면으로 안내만 합니다.)
 * 정보 질문("~가 뭐야", "어떻게", "알려줘" 등)은 명령으로 보지 않습니다.
 */
function isStateChangeCommand(text: string): boolean {
  if (/(뭐|무엇|어떻게|왜\b|언제|알려|설명|차이|의미|\?)/.test(text)) {
    return false;
  }
  return /(조치\s*완료|완료\s*처리|등록해|생성해|만들어\s*줘|삭제해|무효\s*처리|종결\s*처리|상태\s*(를)?\s*변경)/.test(
    text
  );
}

/**
 * 화면 이동 요청을 감지합니다. 이동 동사 + 대상(이벤트 번호 또는 페이지명)을 해석해
 * 이동할 경로와 표시명을 반환합니다. 해당 없으면 null.
 */
function detectNavigation(
  text: string
): { path: string; label: string } | null {
  const wantsNav =
    /(이동|가\s*줘|가자|열어|열어\s*줘|보여\s*줘|띄워|상세\s*페이지|페이지로|이동해|이동시켜|바로\s*가)/.test(
      text
    );
  if (!wantsNav) return null;

  // 이벤트 번호가 있으면 해당 이벤트 상세로 이동합니다.
  const event = findEventInText(text);
  if (event) {
    return {
      path: `/quality-events/detail/${event.id}`,
      label: `${event.eventNumber} 상세`,
    };
  }

  // 페이지명 → 경로 매핑(구체적인 항목을 먼저 검사).
  const pages: { kw: RegExp; path: string; label: string }[] = [
    { kw: /대시보드|홈\b/, path: "/", label: "대시보드" },
    {
      kw: /부적합\s*판정\s*대상/,
      path: "/nonconformities/judgment",
      label: "부적합 판정 대상",
    },
    {
      kw: /경미|단순조치|종결\s*대상/,
      path: "/nonconformities/minor-closure",
      label: "경미 부적합/단순조치 종결 대상",
    },
    {
      kw: /부적합\s*(목록|관리|리스트)/,
      path: "/nonconformities/list",
      label: "부적합 목록",
    },
    {
      kw: /capa\s*(등록|계획|대상)/i,
      path: "/capa/register",
      label: "CAPA 계획 등록 대상",
    },
    {
      kw: /내\s*검토|검토\s*대상/,
      path: "/quality-events/review",
      label: "내 검토 대상",
    },
    {
      kw: /내\s*(품질\s*)?이벤트/,
      path: "/quality-events/my",
      label: "내 품질 이벤트",
    },
    {
      kw: /(품질\s*)?이벤트\s*등록/,
      path: "/quality-events/register",
      label: "품질 이벤트 등록",
    },
    {
      kw: /품질\s*이벤트|이벤트\s*(목록|관리)/,
      path: "/quality-events/list",
      label: "품질 이벤트 목록",
    },
  ];
  for (const page of pages) {
    if (page.kw.test(text)) {
      return { path: page.path, label: page.label };
    }
  }
  return null;
}

/** 이미지/차트 생성 요청 여부를 추정합니다(시각물 명사 + 생성 동사). */
function wantsImage(text: string): boolean {
  const visual =
    /(그림|이미지|사진|일러스트|차트|그래프|도표|다이어그램|아이콘|로고|포스터)/;
  const verb = /(그려|그려줘|그려 줘|그려주|그려봐|생성|만들어|만들어줘|그려주세요)/;
  return visual.test(text) && verb.test(text);
}

/**
 * 답변 안에서 강조할 패턴과 스타일(왼→오 우선순위).
 * 상태·긴급도는 색으로, 문서번호·날짜·건수는 굵게 강조합니다.
 */
const RICH_PATTERNS: { re: string; className: string }[] = [
  // **강조** — 볼드 + 하이라이트 배경
  { re: "\\*\\*(?:[^*]+?)\\*\\*", className: "rounded bg-primary/10 px-1 font-semibold text-primary" },
  // 지연([지연 N일] 포함) — 빨강
  { re: "\\[지연\\s*\\d+일\\]|지연", className: "font-semibold text-red-600 dark:text-red-400" },
  // 오늘 마감 태그 — 주황
  { re: "\\[오늘\\]", className: "font-semibold text-amber-600 dark:text-amber-400" },
  // D-day(미래) — 파랑
  { re: "\\[D-\\d+\\]|\\bD-\\d+\\b", className: "font-semibold text-blue-600 dark:text-blue-400" },
  // 문서 번호(QE/CP/NC-YYYY-NNN) — 프라이머리 강조
  { re: "(?:QE|CP|NC)-\\d{4}-\\d{2,}", className: "font-semibold text-primary" },
  // 날짜(yyyy-MM-dd) / 건수(N건) — 굵게
  { re: "\\d{4}-\\d{2}-\\d{2}", className: "font-semibold text-foreground" },
  { re: "\\d+건", className: "font-semibold text-foreground" },
];

const RICH_REGEX = new RegExp(
  RICH_PATTERNS.map((p, i) => `(?<g${i}>${p.re})`).join("|"),
  "g"
);

/**
 * 도우미 답변 텍스트를 렌더링합니다.
 * **굵게**·지연·오늘·D-day·문서번호·날짜·건수 등 중요한 내용을 색/굵기로 강조합니다.
 * (안전하게 토큰 단위로 React 노드를 만들며 HTML 주입은 사용하지 않습니다.)
 */
function renderRich(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  RICH_REGEX.lastIndex = 0;
  while ((match = RICH_REGEX.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={key++}>{text.slice(last, match.index)}</span>);
    }
    // 매칭된 그룹 번호로 스타일을 고릅니다.
    const groups = match.groups ?? {};
    const idx = RICH_PATTERNS.findIndex((_, i) => groups[`g${i}`] != null);
    const raw = match[0];
    // **강조**는 별표를 벗겨 안쪽 텍스트만 표시합니다.
    const display = idx === 0 ? raw.slice(2, -2) : raw;
    nodes.push(
      <strong key={key++} className={RICH_PATTERNS[idx]?.className}>
        {display}
      </strong>
    );
    last = match.index + raw.length;
  }
  if (last < text.length) {
    nodes.push(<span key={key}>{text.slice(last)}</span>);
  }
  return nodes;
}

/** AI 호출 실패 사유에 맞는 안내 문구. 429는 사용량 한도로 구분합니다. */
function aiErrorMessage(err: unknown): string {
  const status = (err as { status?: number })?.status;
  if (status === 429) {
    return "요청이 많아 잠시 후(약 1분 뒤) 다시 시도해 주세요. (무료 사용량 한도 초과)";
  }
  return "죄송합니다. AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

/** 판단 근거(신호) 목록을 채팅 텍스트로 변환합니다. */
function formatSignals(signals: AiReviewSignal[]): string {
  if (signals.length === 0) return "";
  return (
    "\n\n판단 근거\n" +
    signals.map((s) => `• ${s.label}: ${s.value} — ${s.detail}`).join("\n")
  );
}

/** 부적합 판정(AI 소견)을 채팅 메시지 텍스트로 만듭니다. */
function formatReviewJudgment(
  event: QualityEvent,
  result: AiReviewAssessment
): string {
  return (
    `[부적합 판정] ${event.eventNumber} · ${event.title}\n` +
    `AI 판정: ${AI_VERDICT_META[result.verdict].label}\n` +
    result.summary +
    formatSignals(result.signals) +
    "\n\n※ 참고용 소견이며 최종 판정은 담당자가 합니다."
  );
}

/** CAPA 판정(AI 소견)을 채팅 메시지 텍스트로 만듭니다. */
function formatCapaJudgment(
  event: QualityEvent,
  result: CapaAssessment
): string {
  return (
    `[CAPA 판정] ${event.eventNumber} · ${event.title}\n` +
    `AI 판정: ${CAPA_JUDGMENT_LABEL[result.verdict]}\n` +
    result.summary +
    formatSignals(result.signals) +
    "\n\n※ 참고용 소견이며 최종 판정은 담당자가 합니다."
  );
}

/** 오늘 기준 D-day(양수=남은 일수, 0=오늘, 음수=지연). 파싱 실패 시 null. */
function daysFromToday(label: string): number | null {
  const [y, m, d] = label.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/** D-day를 표시용 태그로. */
function ddayTag(label: string): string {
  const d = daysFromToday(label);
  if (d === null) return "";
  if (d < 0) return `[지연 ${-d}일]`;
  if (d === 0) return "[오늘]";
  return `[D-${d}]`;
}

/**
 * 로그인 사용자의 "내 할 일"(검토 대기 + 진행중 조치)을 채팅 텍스트로 만듭니다.
 * 조치는 기한 순(지연 우선)으로 정렬되어 있으므로 그대로 사용합니다.
 */
function buildScheduleText(
  reviews: QualityEvent[],
  actions: ActionRow[]
): string {
  const lines: string[] = [
    `**${currentUser.name}**님이 지금 처리하실 일을 정리했어요.`,
    "",
    `📋 검토 대기 ${reviews.length}건`,
  ];
  if (reviews.length) {
    reviews.slice(0, 5).forEach((e) => lines.push(`• ${e.eventNumber} ${e.title}`));
    if (reviews.length > 5) lines.push(`… 외 ${reviews.length - 5}건`);
  } else {
    lines.push("• 검토할 이벤트가 없습니다.");
  }

  const delayed = actions.filter((a) => a.delayed).length;
  lines.push("");
  lines.push(`🛠 진행중 조치 ${actions.length}건 (지연 ${delayed}건) — 기한 순`);
  if (actions.length) {
    actions.slice(0, 6).forEach((a) => {
      lines.push(
        `• ${ddayTag(a.dueDateLabel)} ${a.title} (${a.capaNumber}) · 기한 ${a.dueDateLabel}`
      );
    });
    if (actions.length > 6) lines.push(`… 외 ${actions.length - 6}건`);
  } else {
    lines.push("• 진행중인 조치가 없습니다.");
  }

  lines.push("");
  lines.push(
    "자세한 목록은 **내 검토 대상** · **내 조치 대상** 메뉴에서 확인하실 수 있어요."
  );
  return lines.join("\n");
}

/** 조치 목록을 D-day 태그와 함께 줄 문자열로. */
function actionLines(actions: ActionRow[], max = 8): string[] {
  return actions
    .slice(0, max)
    .map(
      (a) =>
        `• ${ddayTag(a.dueDateLabel)} ${a.title} (${a.capaNumber}) · 기한 ${a.dueDateLabel}`
    )
    .concat(actions.length > max ? [`… 외 ${actions.length - max}건`] : []);
}

/**
 * "내 업무" 질문에 의도별로 답합니다.
 * 지연 / 오늘 마감 / 이번 주 / 검토만 / 조치만 / (그 외) 전체 브리핑.
 */
function buildWorkResponse(
  question: string,
  reviews: QualityEvent[],
  actions: ActionRow[]
): string {
  const name = currentUser.name;
  const delayed = actions.filter((a) => a.delayed);

  // 지연/밀린 업무
  if (/지연|밀린|늦|밀려/.test(question)) {
    if (!delayed.length) return `**${name}**님, 지연된 업무는 없습니다. 👍`;
    return [`⚠️ 지연된 조치 ${delayed.length}건이 있어요.`, "", ...actionLines(delayed)].join(
      "\n"
    );
  }

  // 오늘 마감
  if (/오늘/.test(question)) {
    const today = actions.filter((a) => daysFromToday(a.dueDateLabel) === 0);
    if (!today.length) return `**${name}**님, 오늘 마감인 조치는 없습니다.`;
    return [`📅 오늘 마감인 조치 ${today.length}건이에요.`, "", ...actionLines(today)].join(
      "\n"
    );
  }

  // 이번 주 마감(오늘~7일 이내, 지연 포함)
  if (/이번\s*주|금주|주간|이번주/.test(question)) {
    const week = actions.filter((a) => {
      const d = daysFromToday(a.dueDateLabel);
      return d !== null && d <= 7;
    });
    if (!week.length) return `**${name}**님, 이번 주 마감 예정인 조치는 없습니다.`;
    return [`🗓 이번 주 처리할 조치 ${week.length}건이에요.`, "", ...actionLines(week)].join(
      "\n"
    );
  }

  // 검토만
  if (/검토/.test(question) && !/조치/.test(question)) {
    if (!reviews.length) return `**${name}**님, 검토 대기 중인 이벤트가 없습니다.`;
    const lines = [`📋 검토 대기 ${reviews.length}건이에요.`, ""];
    reviews.slice(0, 8).forEach((e) => lines.push(`• ${e.eventNumber} ${e.title}`));
    if (reviews.length > 8) lines.push(`… 외 ${reviews.length - 8}건`);
    return lines.join("\n");
  }

  // 조치만
  if (/조치/.test(question) && !/검토/.test(question)) {
    if (!actions.length) return `**${name}**님, 진행중인 조치가 없습니다.`;
    return [
      `🛠 진행중 조치 ${actions.length}건 (지연 ${delayed.length}건) — 기한 순`,
      "",
      ...actionLines(actions),
    ].join("\n");
  }

  // 그 외(브리핑/전체): 검토 + 조치 요약
  return buildScheduleText(reviews, actions);
}

/**
 * AI에 넘길 "내 업무" 데이터 컨텍스트(구조화 텍스트).
 * AI가 이 데이터에만 근거해 자유롭게 답하도록 사용합니다.
 */
function buildWorkContext(reviews: QualityEvent[], actions: ActionRow[]): string {
  const lines: string[] = [];
  lines.push(`# 검토 대기 이벤트 (${reviews.length}건)`);
  if (reviews.length) {
    reviews.forEach((e) =>
      lines.push(`- ${e.eventNumber} | ${e.title} | 상태: ${e.statusName}`)
    );
  } else {
    lines.push("- 없음");
  }
  lines.push("");
  lines.push(
    `# 내 진행중 조치 (${actions.length}건) — D는 오늘 기준 남은 일수(음수=지연)`
  );
  if (actions.length) {
    actions.forEach((a) => {
      const d = daysFromToday(a.dueDateLabel);
      lines.push(
        `- ${a.capaNumber} | ${a.title} | 담당: ${a.assignee} | 기한: ${a.dueDateLabel} | ${a.delayed ? "지연" : "정상"} | D=${d ?? "?"}`
      );
    });
  } else {
    lines.push("- 없음");
  }
  return lines.join("\n");
}

/** "내 업무"에 대한 질문인지 폭넓게 추정합니다. */
function isMyWorkQuery(text: string): boolean {
  // 업무 브리핑 요청
  if (/브리핑|브리핑해|브리핑 해/.test(text)) return true;
  // 내/제/나 + 업무성 명사
  if (/(내|제|나|저)\s*(업무|할\s*일|일정|스케줄|태스크|조치|검토|일이|일 )/.test(text))
    return true;
  // 지연/오늘/이번주/마감/남은 + 업무 관련 표현
  if (
    /(지연|밀린|늦|밀려|오늘|이번\s*주|금주|주간|마감|남은)/.test(text) &&
    /(업무|할\s*일|일정|조치|검토|것|거|게|있|없|뭐|몇|해야)/.test(text)
  )
    return true;
  // 할 일/일정/스케줄 + 질의 표현
  if (/(할\s*일|일정|스케줄|업무|태스크).{0,6}(뭐|알려|보여|있|없|정리|확인|해야|남)/.test(text))
    return true;
  if (/뭐\s*(부터)?\s*(해야|하면)/.test(text)) return true;
  return false;
}

/** 지원하는 데이터 차트 주제. "list"는 주제 미상(안내). */
type ChartTopic =
  | "myAction"
  | "monthly"
  | "capaStage"
  | "ncVerdict"
  | "eventStatus"
  | "list";

/** 차트/통계 요청과 주제를 추정합니다. 차트 의도가 없으면 null. */
function detectChartTopic(text: string): ChartTopic | null {
  const chartWord = /(차트|그래프|통계|시각화|파이|도넛|막대|비율|분포)/.test(text);
  if (!chartWord) return null;
  if (/(내|제|나)\s*(조치)|조치\s*(상태|현황|분포)/.test(text)) return "myAction";
  if (/(월별|달별|월간).*(완료)|완료.*(월별|추이)/.test(text)) return "monthly";
  if (/capa/i.test(text) && /(단계|상태|진행|분포)/.test(text)) return "capaStage";
  if (/부적합/.test(text)) return "ncVerdict";
  if (/(품질\s*)?이벤트/.test(text)) return "eventStatus";
  return "list";
}

/** 최근 6개월 라벨/키 목록(오래된→최신). */
function last6Months(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${d.getMonth() + 1}월`,
    });
  }
  return out;
}

/** 주제별 실제 데이터를 집계해 차트 스펙 + 요약 문장을 만듭니다. */
async function buildChartSpec(
  topic: Exclude<ChartTopic, "list">
): Promise<{ spec: ChatChartSpec; summary: string }> {
  if (topic === "myAction") {
    const actions = await getMyActionTargets();
    const inProgress = actions.filter(
      (a) => a.status === "in_progress" && !a.delayed
    ).length;
    const delayed = actions.filter((a) => a.delayed).length;
    const completed = actions.filter((a) => a.status === "completed").length;
    return {
      spec: {
        title: "내 조치 상태 분포",
        kind: "donut",
        data: [
          { label: "진행중", value: inProgress, color: "#3b82f6" },
          { label: "지연", value: delayed, color: "#ef4444" },
          { label: "완료", value: completed, color: "#22c55e" },
        ],
      },
      summary: `내 조치 현황이에요. 진행중 ${inProgress}건, 지연 ${delayed}건, 완료 ${completed}건입니다.`,
    };
  }

  if (topic === "monthly") {
    const actions = await getMyActionTargets();
    const byMonth = new Map<string, number>();
    actions
      .filter((a) => a.status === "completed" && a.completedDateLabel)
      .forEach((a) => {
        const m = (a.completedDateLabel ?? "").slice(0, 7);
        byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
      });
    const data = last6Months().map((m) => ({
      label: m.label,
      value: byMonth.get(m.key) ?? 0,
      color: "#22c55e",
    }));
    const total = data.reduce((s, d) => s + d.value, 0);
    return {
      spec: { title: "월별 내 조치 완료", kind: "bar", data },
      summary: `최근 6개월간 완료한 조치는 총 ${total}건입니다.`,
    };
  }

  if (topic === "capaStage") {
    const rows = await getCapaProgress();
    const cnt = (pred: (r: (typeof rows)[number]) => boolean) =>
      rows.filter(pred).length;
    return {
      spec: {
        title: "CAPA 단계 분포",
        kind: "donut",
        data: [
          { label: "원인분석", value: cnt((r) => r.status.startsWith("root_cause")), color: "#f59e0b" },
          { label: "조치중", value: cnt((r) => r.status === "in_action"), color: "#3b82f6" },
          { label: "효과성 검증", value: cnt((r) => r.status.startsWith("effectiveness")), color: "#8b5cf6" },
          { label: "종료", value: cnt((r) => r.status === "closed"), color: "#22c55e" },
          { label: "취소", value: cnt((r) => r.status === "cancelled"), color: "#a1a1aa" },
        ],
      },
      summary: `전체 CAPA ${rows.length}건의 단계별 분포입니다.`,
    };
  }

  if (topic === "ncVerdict") {
    const ncs = getNonconformitiesSync();
    const inv = (n: (typeof ncs)[number]) => n.statusCode === "invalid";
    return {
      spec: {
        title: "부적합 CAPA 판정 분포",
        kind: "donut",
        data: [
          { label: "CAPA 필요", value: ncs.filter((n) => !inv(n) && n.capaVerdict === "required").length, color: "#8b5cf6" },
          { label: "경미/단순조치", value: ncs.filter((n) => !inv(n) && n.capaVerdict === "minor").length, color: "#22c55e" },
          { label: "미판정", value: ncs.filter((n) => !inv(n) && !n.capaVerdict).length, color: "#a1a1aa" },
          { label: "무효", value: ncs.filter(inv).length, color: "#64748b" },
        ],
      },
      summary: `전체 부적합 ${ncs.length}건의 CAPA 판정 분포입니다.`,
    };
  }

  // eventStatus
  const cnt = (s: number) => qualityEventData.filter((e) => e.status === s).length;
  return {
    spec: {
      title: "품질 이벤트 상태 분포",
      kind: "bar",
      data: [
        { label: "작성중", value: cnt(1), color: "#a1a1aa" },
        { label: "검토중", value: cnt(2), color: "#3b82f6" },
        { label: "종료", value: cnt(3), color: "#22c55e" },
        { label: "반려", value: cnt(4), color: "#ef4444" },
      ],
    },
    summary: `전체 품질 이벤트 ${qualityEventData.length}건의 상태 분포입니다.`,
  };
}

type ChatPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.at(-1)?.toUpperCase() : "FILE";
}

function FileTypeIcon({ file }: { file: File }) {
  if (file.type.startsWith("image/")) {
    return <FileImageIcon className="size-4" />;
  }

  if (
    file.type.includes("pdf") ||
    file.type.includes("text") ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".md")
  ) {
    return <FileTextIcon className="size-4" />;
  }

  return <FileIcon className="size-4" />;
}

function AttachmentList({
  attachments,
  onRemove,
}: {
  attachments: ChatAttachment[];
  onRemove?: (id: string) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <AttachmentGroup
        role="list"
        aria-label="첨부파일 목록"
        tabIndex={0}
        className="max-w-full"
      >
        {attachments.map((attachment) => {
          const isImage = attachment.file.type.startsWith("image/");

          return (
            <Attachment key={attachment.id} state="done" size="sm">
              <AttachmentMedia variant={isImage ? "image" : "icon"}>
                {isImage && attachment.previewUrl ? (
                  <img
                    src={attachment.previewUrl}
                    alt={attachment.file.name}
                  />
                ) : (
                  <FileTypeIcon file={attachment.file} />
                )}
              </AttachmentMedia>

              <AttachmentContent>
                <AttachmentTitle>{attachment.file.name}</AttachmentTitle>
                <AttachmentDescription>
                  {getFileExtension(attachment.file.name)} ·{" "}
                  {formatFileSize(attachment.file.size)}
                </AttachmentDescription>
              </AttachmentContent>

              {onRemove && (
                <AttachmentActions>
                  <AttachmentAction
                    aria-label={`${attachment.file.name} 제거`}
                    onClick={() => onRemove(attachment.id)}
                  >
                    <X className="size-3.5" />
                  </AttachmentAction>
                </AttachmentActions>
              )}
            </Attachment>
          );
        })}
      </AttachmentGroup>
    </div>
  );
}

function TypingDots() {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-lg leading-none text-muted-foreground"
      aria-hidden="true"
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        >
          .
        </span>
      ))}
    </span>
  );
}

export function ChatPanel({ open, onOpenChange }: ChatPanelProps) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>(() => [
    createConversation(1),
  ]);
  const [activeId, setActiveId] = useState("c1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  // AI 응답 대기 경과 시간(ms). 활성 대화가 응답 대기 중일 때만 흐릅니다.
  const [waitingMs, setWaitingMs] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageSeqRef = useRef(0);
  const conversationSeqRef = useRef(1);
  const replyTimersRef = useRef(new Map<string, number>());
  const renameInputRef = useRef<HTMLInputElement>(null);
  // 진행 중인 AI 요청의 취소 컨트롤러(대화 id별).
  const aiAbortersRef = useRef(new Map<string, AbortController>());

  // autoFocus는 onFocus 부착보다 먼저 발생해 전체 선택이 누락되므로 직접 처리합니다.
  useEffect(() => {
    if (editingId === null) return;

    const node = renameInputRef.current;
    if (!node) return;

    node.focus();
    node.select();
  }, [editingId]);

  useEffect(() => {
    const timers = replyTimersRef.current;
    const aborters = aiAbortersRef.current;

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
      aborters.forEach((controller) => controller.abort());
      aborters.clear();
    };
  }, []);

  // 삭제 시 항상 1개 이상을 남기므로 conversations는 비어 있지 않습니다.
  const activeConversation =
    conversations.find((item) => item.id === activeId) ?? conversations[0];
  const isResponding = activeConversation.isResponding;

  // 응답 대기 중에는 0.1초 간격으로 경과 시간을 갱신합니다.
  // 시작값 0 리셋은 요청을 보내는 핸들러에서 처리하고, 여기서는 interval
  // 콜백에서만 setState 합니다(effect 본문 동기 setState 회피).
  // (대화를 바꾸면 activeConversation.id가 바뀌어 타이머가 새로 시작됩니다.)
  useEffect(() => {
    if (!isResponding) return;
    const start = performance.now();
    const intervalId = window.setInterval(() => {
      setWaitingMs(performance.now() - start);
    }, 100);
    return () => window.clearInterval(intervalId);
  }, [isResponding, activeConversation.id]);

  if (!open) return null;

  const { messages, flow, draft, attachments } = activeConversation;

  function updateConversation(
    id: string,
    updater: (conversation: Conversation) => Conversation
  ) {
    setConversations((prev) =>
      prev.map((item) => (item.id === id ? updater(item) : item))
    );
  }

  function pushUserMessage(text: string, files: ChatAttachment[] = []) {
    const userMessage: ChatMessage = {
      id: `user-${(messageSeqRef.current += 1)}`,
      role: "user",
      text,
      attachments: files.length > 0 ? files : undefined,
    };

    updateConversation(activeId, (conversation) => ({
      ...conversation,
      title: deriveTitle(conversation, text),
      messages: [...conversation.messages, userMessage],
    }));
  }

  /**
   * mock 도우미 응답을 지연 후 추가하고 다음 상태로 넘어갑니다.
   * 예약 시점의 대화를 대상으로 고정하므로, 대기 중 다른 대화로 전환해도
   * 응답은 원래 대화에 도착합니다.
   */
  function replyWith(
    text: string,
    nextFlow: FlowState,
    suggestions?: string[],
    chart?: ChatChartSpec
  ) {
    const targetId = activeId;
    const timers = replyTimersRef.current;

    const pending = timers.get(targetId);
    if (pending !== undefined) {
      window.clearTimeout(pending);
    }

    setWaitingMs(0); // 대기 시간 표시를 0부터 시작
    updateConversation(targetId, (conversation) => ({
      ...conversation,
      isResponding: true,
    }));

    timers.set(
      targetId,
      window.setTimeout(() => {
        timers.delete(targetId);

        const assistantMessage: ChatMessage = {
          id: `assistant-${(messageSeqRef.current += 1)}`,
          role: "assistant",
          text,
          chart,
          suggestions,
        };

        updateConversation(targetId, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, assistantMessage],
          flow: nextFlow,
          isResponding: false,
        }));
      }, MOCK_REPLY_DELAY)
    );
  }

  /**
   * 실제 AI(Gemini) 응답을 붙입니다. 자유 질문에 사용합니다.
   * 예약 시점의 대화(targetId)에 결과를 도착시키고, 실패 시 안내 문구를 보여줍니다.
   * 키가 없거나 호출이 실패하면 catch로 떨어져 안내 메시지가 표시됩니다.
   */
  async function replyWithAI(
    targetId: string,
    userText: string,
    files?: ChatAttachment[]
  ) {
    const conversation = conversations.find((item) => item.id === targetId);
    const attachmentFiles = files?.map((item) => item.file);
    // 첨부만 있고 본문이 비면 파일 검토용 기본 지시를 넣습니다.
    const effectiveText =
      userText.trim() ||
      (attachmentFiles?.length ? "첨부한 파일을 읽고 검토·설명해 주세요." : userText);

    // 업무 대화(workAware)면 후속 질문에도 최신 업무 데이터를 배경으로 함께 넘깁니다.
    const workBackground = conversation?.workAware
      ? buildWorkContext(
          qualityEventData.filter(isMyReviewPending),
          (await getMyActionTargets()).filter((a) => a.status === "in_progress")
        )
      : null;

    // pushUserMessage의 상태 반영이 비동기라, 방금 보낸 질문을 직접 이어 붙입니다.
    const history: ChatTurn[] = [
      ...(workBackground
        ? [
            {
              role: "user" as const,
              text:
                `참고: 아래는 사용자(${currentUser.name})의 현재 업무 데이터야. ` +
                "관련 질문이면 이 데이터에 근거해 답하고, 무관하면 무시해도 돼.\n\n" +
                workBackground,
            },
          ]
        : []),
      ...(conversation?.messages ?? []).map((item) => ({
        role: item.role,
        text: item.text,
      })),
      { role: "user", text: effectiveText },
    ];

    const controller = new AbortController();
    aiAbortersRef.current.set(targetId, controller);

    setWaitingMs(0); // 대기 시간 표시를 0부터 시작
    updateConversation(targetId, (item) => ({ ...item, isResponding: true }));

    // 응답이 끝나면(성공/중단/오류) 다시 보기(부적합/CAPA/기타)를 노출하고
    // 메뉴 상태로 되돌립니다.
    const finish = (text: string) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${(messageSeqRef.current += 1)}`,
        role: "assistant",
        text,
        suggestions: MENU_SUGGESTIONS,
      };
      updateConversation(targetId, (item) => ({
        ...item,
        messages: [...item.messages, assistantMessage],
        flow: { kind: "menu" },
        isResponding: false,
      }));
    };

    try {
      const answer = await geminiChat(history, controller.signal, attachmentFiles);
      finish(answer.trim() || "답변을 생성하지 못했습니다.");
    } catch (err) {
      // 사용자가 중단한 경우와 실제 오류(사용량 한도 등)를 구분합니다.
      finish(
        controller.signal.aborted ? "응답을 중단했습니다." : aiErrorMessage(err)
      );
    } finally {
      aiAbortersRef.current.delete(targetId);
    }
  }

  /**
   * 이미지/차트 생성 — 이미지 모델 호출 후 생성 이미지를 말풍선에 표시합니다.
   * 실패/중단 시 안내 문구를 보여주고, 완료 후 다시 보기를 노출합니다.
   */
  async function replyWithImage(targetId: string, prompt: string) {
    const controller = new AbortController();
    aiAbortersRef.current.set(targetId, controller);

    setWaitingMs(0);
    updateConversation(targetId, (item) => ({ ...item, isResponding: true }));

    const append = (message: Omit<ChatMessage, "id" | "role" | "suggestions">) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${(messageSeqRef.current += 1)}`,
        role: "assistant",
        suggestions: MENU_SUGGESTIONS,
        ...message,
      };
      updateConversation(targetId, (item) => ({
        ...item,
        messages: [...item.messages, assistantMessage],
        flow: { kind: "menu" },
        isResponding: false,
      }));
    };

    try {
      const image = await geminiGenerateImage(prompt, controller.signal);
      append({
        text: "요청하신 이미지를 생성했습니다.",
        imageUrl: `data:${image.mimeType};base64,${image.data}`,
      });
    } catch (err) {
      append({
        text: controller.signal.aborted
          ? "응답을 중단했습니다."
          : aiErrorMessage(err),
      });
    } finally {
      aiAbortersRef.current.delete(targetId);
    }
  }

  /**
   * 이벤트 번호로 조회된 품질 이벤트를 실제 AI가 판정합니다.
   * - "부적합 판정": 부적합 의심/정상/정보부족 소견
   * - "CAPA 판정": CAPA 필요/경미 소견
   * 취소하면 "중단" 메시지, 완료 후에는 다시 보기(부적합/CAPA/기타)를 노출합니다.
   */
  async function replyWithJudgment(
    targetId: string,
    topic: string,
    event: QualityEvent
  ) {
    const controller = new AbortController();
    aiAbortersRef.current.set(targetId, controller);

    setWaitingMs(0);
    updateConversation(targetId, (item) => ({ ...item, isResponding: true }));

    const finish = (text: string) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${(messageSeqRef.current += 1)}`,
        role: "assistant",
        text,
        suggestions: MENU_SUGGESTIONS,
      };
      updateConversation(targetId, (item) => ({
        ...item,
        messages: [...item.messages, assistantMessage],
        flow: { kind: "menu" },
        isResponding: false,
      }));
    };

    try {
      if (topic === "CAPA 판정") {
        const result = await geminiAssessCapaNeed(event, controller.signal);
        finish(
          controller.signal.aborted
            ? "응답을 중단했습니다."
            : formatCapaJudgment(event, result)
        );
      } else {
        const result = await geminiAssessQualityEvent(event, controller.signal);
        finish(
          controller.signal.aborted
            ? "응답을 중단했습니다."
            : formatReviewJudgment(event, result)
        );
      }
    } catch (err) {
      finish(
        controller.signal.aborted ? "응답을 중단했습니다." : aiErrorMessage(err)
      );
    } finally {
      aiAbortersRef.current.delete(targetId);
    }
  }

  /**
   * 문서 상태 변경/생성 요청은 품질 도우미가 직접 처리하지 않습니다.
   * 대상 이벤트가 있으면 상세 화면으로 이동시키고, 화면에서 진행하도록 안내합니다.
   */
  function denyStateChange(event?: QualityEvent) {
    if (event) {
      navigate(
        `/quality-events/detail/${event.id}?${QUALITY_EVENT_FROM_PARAM}=${encodeURIComponent(MINOR_CLOSURE_PATH)}`
      );
      replyWith(
        `조치 완료·등록, 상태 변경, 문서 생성 같은 작업은 품질 도우미가 직접 처리하지 않습니다.\n${event.eventNumber} 상세 화면으로 이동했으니, 화면의 작업 메뉴에서 직접 진행해 주세요.`,
        { kind: "menu" },
        MENU_SUGGESTIONS
      );
      return;
    }
    replyWith(
      "조치 완료·등록, 상태 변경, 문서 생성 같은 작업은 품질 도우미가 직접 처리하지 않습니다.\n해당 메뉴의 상세 화면에서 직접 진행해 주세요.",
      { kind: "menu" },
      MENU_SUGGESTIONS
    );
  }

  /** 응답 대기 중인 활성 대화의 AI 요청(또는 목 응답)을 중단합니다. */
  function handleStopResponse() {
    // 진행 중인 AI 요청 취소 → replyWithAI의 catch에서 "중단" 메시지를 붙입니다.
    aiAbortersRef.current.get(activeId)?.abort();

    // 목(menu/event-number) 응답 대기 타이머도 함께 중단합니다.
    const pending = replyTimersRef.current.get(activeId);
    if (pending !== undefined) {
      window.clearTimeout(pending);
      replyTimersRef.current.delete(activeId);
    }

    updateConversation(activeId, (item) =>
      item.isResponding ? { ...item, isResponding: false } : item
    );
  }

  function handleNewConversation() {
    conversationSeqRef.current += 1;
    const conversation = createConversation(conversationSeqRef.current);

    setConversations((prev) => [...prev, conversation]);
    setActiveId(conversation.id);
    setEditingId(null);
  }

  function handleSelectConversation(id: string) {
    setActiveId(id);
    setEditingId(null);
  }

  function startRenaming(conversation: Conversation) {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  }

  /** 빈 제목은 무시하고 기존 제목을 유지합니다. */
  function commitRenaming() {
    if (editingId === null) return;

    const trimmed = editingTitle.trim();
    if (trimmed) {
      updateConversation(editingId, (conversation) => ({
        ...conversation,
        title: trimmed,
      }));
    }

    setEditingId(null);
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRenaming();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setEditingId(null);
    }
  }

  function handleDeleteConversation(id: string) {
    if (editingId === id) setEditingId(null);

    const timers = replyTimersRef.current;
    const pending = timers.get(id);
    if (pending !== undefined) {
      window.clearTimeout(pending);
      timers.delete(id);
    }

    // 미리보기 URL 누수를 막기 위해 첨부 URL을 먼저 해제합니다.
    const target = conversations.find((item) => item.id === id);
    target?.attachments.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });

    const remaining = conversations.filter((item) => item.id !== id);

    if (remaining.length === 0) {
      conversationSeqRef.current += 1;
      const fresh = createConversation(conversationSeqRef.current);
      setConversations([fresh]);
      setActiveId(fresh.id);
      return;
    }

    setConversations(remaining);
    if (id === activeId) {
      setActiveId(remaining.at(-1)!.id);
    }
  }

  /** 실제 데이터 차트로 통계를 렌더합니다. */
  async function replyWithChart(topic: ChartTopic) {
    if (topic === "list") {
      replyWith(
        "어떤 통계를 보여드릴까요? 예를 들어 이렇게 말씀해 주세요.\n" +
          "• **내 조치 상태** 차트\n" +
          "• **월별 조치 완료** 그래프\n" +
          "• **CAPA 단계 분포**\n" +
          "• **부적합 판정 분포**\n" +
          "• **품질 이벤트 상태** 통계",
        { kind: "menu" },
        MENU_SUGGESTIONS
      );
      return;
    }
    const { spec, summary } = await buildChartSpec(topic);
    replyWith(summary, { kind: "menu" }, MENU_SUGGESTIONS, spec);
  }

  /** 내 업무 질문에 의도별 고정 요약으로 답합니다(메뉴 "내 할 일"용, 즉시 응답). */
  async function replyWithMyWork(question: string) {
    const reviews = qualityEventData.filter(isMyReviewPending);
    const actions = (await getMyActionTargets()).filter(
      (a) => a.status === "in_progress"
    );
    replyWith(
      buildWorkResponse(question, reviews, actions),
      { kind: "menu" },
      MENU_SUGGESTIONS
    );
  }

  /**
   * 내 업무 자유 질문 — 실제 업무 데이터를 컨텍스트로 넘겨 AI가 자유롭게 답합니다.
   * AI 실패(키 없음/한도 등)나 빈 응답 시 로컬 의도별 요약으로 대체합니다.
   */
  async function replyWithMyWorkAI(question: string) {
    const targetId = activeId;
    // 이후 후속 질문에도 업무 데이터를 이어서 참고하도록 표시합니다.
    updateConversation(targetId, (item) => ({ ...item, workAware: true }));
    const reviews = qualityEventData.filter(isMyReviewPending);
    const actions = (await getMyActionTargets()).filter(
      (a) => a.status === "in_progress"
    );
    const localAnswer = buildWorkResponse(question, reviews, actions);
    const context = buildWorkContext(reviews, actions);
    const conversation = conversations.find((item) => item.id === targetId);

    // 대화 맥락(이전 turn) + 업무 데이터 + 이번 질문.
    const history: ChatTurn[] = [
      ...(conversation?.messages ?? []).map((item) => ({
        role: item.role,
        text: item.text,
      })),
      {
        role: "user",
        text:
          `너는 IQMS 품질 도우미야. 아래는 현재 로그인 사용자(${currentUser.name})의 실제 업무 데이터야. ` +
          "반드시 이 데이터에만 근거해 질문에 답하고, 데이터에 없는 내용은 지어내지 말고 모른다고 해. " +
          "간결하게 한국어로, 필요하면 목록으로 답해줘.\n\n" +
          `[내 업무 데이터]\n${context}\n\n[질문]\n${question}`,
      },
    ];

    const controller = new AbortController();
    aiAbortersRef.current.set(targetId, controller);
    setWaitingMs(0);
    updateConversation(targetId, (item) => ({ ...item, isResponding: true }));

    const finish = (text: string) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${(messageSeqRef.current += 1)}`,
        role: "assistant",
        text,
        suggestions: MENU_SUGGESTIONS,
      };
      updateConversation(targetId, (item) => ({
        ...item,
        messages: [...item.messages, assistantMessage],
        flow: { kind: "menu" },
        isResponding: false,
      }));
    };

    try {
      const answer = await geminiChat(history, controller.signal);
      finish(answer.trim() || localAnswer);
    } catch {
      // 중단은 안내, 그 외 실패는 로컬 요약으로 대체(키 없음/한도 등에도 답을 보장).
      finish(controller.signal.aborted ? "응답을 중단했습니다." : localAnswer);
    } finally {
      aiAbortersRef.current.delete(targetId);
    }
  }

  function selectMenuOption(option: MenuOption) {
    pushUserMessage(option.label);

    if (option.label === "내 할 일") {
      replyWithMyWork("");
      return;
    }

    if (option.requiresEventNumber) {
      replyWith(
        `${option.label}을 진행하겠습니다.\n대상 품질 이벤트 번호를 입력해 주세요. (예: ${EVENT_NUMBER_EXAMPLE})`,
        { kind: "event-number", topic: option.label }
      );
      return;
    }

    replyWith("네, 질문을 자유롭게 입력해 주세요.", { kind: "freeform" });
  }

  function submit(text: string, files: ChatAttachment[]) {
    // 첨부파일이 있으면 멀티모달 AI가 파일을 읽고 답합니다(구조화 메뉴보다 우선).
    if (files.length > 0) {
      pushUserMessage(text, files);
      replyWithAI(activeId, text, files);
      return;
    }

    // 차트/통계 요청이면 실제 데이터로 차트를 렌더합니다(업무 질문보다 우선).
    if (flow.kind !== "event-number") {
      const chartTopic = detectChartTopic(text);
      if (chartTopic) {
        pushUserMessage(text, files);
        replyWithChart(chartTopic);
        return;
      }
    }

    // 내 업무(할 일·지연·마감·검토·조치·브리핑 등) 질문이면
    // 실제 업무 데이터를 컨텍스트로 넘겨 AI가 자유롭게 답합니다(실패 시 로컬 요약).
    if (flow.kind !== "event-number" && isMyWorkQuery(text)) {
      pushUserMessage(text, files);
      replyWithMyWorkAI(text);
      return;
    }

    // 화면 이동 요청이면 해당 페이지로 이동합니다(이벤트번호 입력 단계 제외).
    if (flow.kind !== "event-number") {
      const nav = detectNavigation(text);
      if (nav) {
        pushUserMessage(text, files);
        navigate(nav.path);

        // 같은 메시지에 판정 의도까지 있으면 이동 후 판정도 수행합니다.
        // (예: "QE-2026-004로 이동해주고 부적합인지 판정해줘")
        const event = findEventInText(text);
        const topic = detectJudgmentTopic(text);
        if (event && topic) {
          replyWithJudgment(activeId, topic, event);
        } else {
          replyWith(
            `${nav.label} 화면으로 이동했습니다.`,
            { kind: "menu" },
            MENU_SUGGESTIONS
          );
        }
        return;
      }
    }

    // 이미지/차트 생성 요청은 이미지 모델로 처리합니다(이벤트번호 입력 단계 제외).
    if (flow.kind !== "event-number" && wantsImage(text)) {
      pushUserMessage(text, files);
      replyWithImage(activeId, text);
      return;
    }

    // 문서 상태 변경/생성 명령은 실행하지 않고 화면으로 안내합니다.
    if (flow.kind !== "event-number" && isStateChangeCommand(text)) {
      pushUserMessage(text, files);
      denyStateChange(findEventInText(text));
      return;
    }

    if (flow.kind === "menu") {
      const option = findMenuOption(text);
      if (option) {
        selectMenuOption(option);
        return;
      }

      // 한 문장에 이벤트 번호 + 판정 의도가 함께 있으면 바로 판정합니다.
      // (예: "QE-2026-006 부적합 판정 해줘")
      const event = findEventInText(text);
      const topic = detectJudgmentTopic(text);
      if (event && topic) {
        pushUserMessage(text, files);
        replyWithJudgment(activeId, topic, event);
        return;
      }

      // 그 외에는 자유 질문으로 보고 실제 AI가 답합니다.
      pushUserMessage(text, files);
      replyWithAI(activeId, text);
      return;
    }

    if (flow.kind === "event-number") {
      pushUserMessage(text, files);

      // 번호 뒤에 "부적합 판정 해줘" 같은 말이 붙어도 번호를 추출해 찾습니다.
      const event = findEventInText(text);

      // 데이터에 없는 이벤트 번호는 안내 후 다시 선택하게 합니다.
      if (!event) {
        replyWith(
          `입력하신 내용에서 등록된 품질 이벤트 번호를 찾지 못했습니다.\n이벤트 번호를 다시 확인해 입력하시거나, 아래에서 다시 선택해 주세요. (예: ${EVENT_NUMBER_EXAMPLE})`,
          { kind: "menu" },
          MENU_SUGGESTIONS
        );
        return;
      }

      // 존재하는 이벤트는 실제 AI가 부적합/CAPA 여부를 판정합니다.
      replyWithJudgment(activeId, flow.topic, event);
      return;
    }

    // freeform: 자유 질문 → 실제 AI(Gemini) 응답.
    pushUserMessage(text, files);
    replyWithAI(activeId, text);
  }

  function handleSend() {
    const text = draft.trim();
    if ((!text && attachments.length === 0) || isResponding) return;

    const files = attachments;
    updateConversation(activeId, (conversation) => ({
      ...conversation,
      draft: "",
      attachments: [],
    }));
    submit(text, files);
  }

  function handleDraftChange(value: string) {
    updateConversation(activeId, (conversation) => ({
      ...conversation,
      draft: value,
    }));
  }

  function handleSuggestionSelect(suggestion: string) {
    if (isResponding) return;

    const option = MENU_OPTIONS.find((item) => item.label === suggestion);
    if (!option) return;

    selectMenuOption(option);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleAttach() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;

    const nextAttachments: ChatAttachment[] = Array.from(files).map(
      (file, index) => ({
        id: `file-${Date.now()}-${index}`,
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      })
    );

    updateConversation(activeId, (conversation) => ({
      ...conversation,
      attachments: [...conversation.attachments, ...nextAttachments],
    }));
    event.target.value = "";
  }

  function handleRemoveAttachment(id: string) {
    const target = attachments.find((item) => item.id === id);
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }

    updateConversation(activeId, (conversation) => ({
      ...conversation,
      attachments: conversation.attachments.filter((item) => item.id !== id),
    }));
  }

  const lastUserIndex = messages.findLastIndex((item) => item.role === "user");

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-card">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-medium text-foreground">
            품질 도우미
          </h2>
          <p className="text-sm text-muted-foreground">
            품질 이벤트, 부적합, CAPA 관련 질문을 입력해 보세요.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="대화창 닫기"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="대화 탭"
        className="flex shrink-0 items-end gap-0.5 overflow-x-auto border-b bg-muted/40 px-1.5 pt-1.5"
      >
        {conversations.map((conversation) => {
          const isActive = conversation.id === activeConversation.id;
          const isEditing = conversation.id === editingId;

          return (
            <div
              key={conversation.id}
              className={cn(
                "flex min-w-0 shrink-0 items-center gap-0.5 rounded-t-md border border-b-0 py-1 pr-0.5 pl-2",
                isActive
                  ? "border-border bg-card"
                  : "border-transparent text-muted-foreground hover:bg-card/60"
              )}
            >
              {isEditing ? (
                <input
                  ref={renameInputRef}
                  aria-label="대화 제목"
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={commitRenaming}
                  className="w-24 min-w-0 rounded-sm bg-transparent px-1 text-sm outline-none ring-1 ring-ring"
                />
              ) : (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  title={`${conversation.title} (두 번 클릭하면 제목 수정)`}
                  onClick={() => handleSelectConversation(conversation.id)}
                  onDoubleClick={() => startRenaming(conversation)}
                  className={cn(
                    "max-w-28 cursor-pointer truncate text-left text-sm",
                    isActive && "font-medium"
                  )}
                >
                  {conversation.title}
                </button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`${conversation.title} 대화 닫기`}
                onClick={() => handleDeleteConversation(conversation.id)}
              >
                <X className="size-3" />
              </Button>
            </div>
          );
        })}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="새 대화 추가"
          className="mb-1 shrink-0"
          onClick={handleNewConversation}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <MessageScrollerProvider
          // 대화를 바꾸면 스크롤 상태도 새로 시작해야 합니다.
          key={activeConversation.id}
          defaultScrollPosition="last-anchor"
          scrollPreviousItemPeek={16}
          scrollMargin={0}
        >
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport className="min-h-0">
              <MessageScrollerContent className="px-4 py-4">
                <MessageScrollerItem
                  messageId="marker-today"
                  className="[content-visibility:visible] [contain-intrinsic-size:none]"
                >
                  <Marker variant="separator">
                    <MarkerContent>오늘</MarkerContent>
                  </Marker>
                </MessageScrollerItem>

                {messages.map((message, index) => {
                  const isUser = message.role === "user";
                  // 대화 흐름이 지나간 보기는 노출하지 않습니다.
                  const showSuggestions =
                    !isUser &&
                    !isResponding &&
                    index === messages.length - 1 &&
                    (message.suggestions?.length ?? 0) > 0;

                  return (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={index === lastUserIndex && !isResponding}
                      className="[content-visibility:visible] [contain-intrinsic-size:none]"
                    >
                      <Message align={isUser ? "end" : "start"}>
                        <MessageAvatar
                          className={
                            isUser
                              ? "size-8 rounded-full bg-black text-white"
                              : "size-8 rounded-full border border-border bg-muted"
                          }
                        >
                          {isUser ? (
                            <UserRound className="size-4 text-white" />
                          ) : (
                            <Bot className="size-4" />
                          )}
                        </MessageAvatar>

                        <MessageContent>
                          <MessageHeader>
                            {isUser ? "나" : "IQMS 도우미"}
                          </MessageHeader>

                          {message.attachments &&
                            message.attachments.length > 0 && (
                              <AttachmentList
                                attachments={message.attachments}
                              />
                            )}

                          {message.text && (
                            <Bubble variant={isUser ? "default" : "muted"}>
                              <BubbleContent className="whitespace-pre-line">
                                {isUser
                                  ? message.text
                                  : renderRich(message.text)}
                              </BubbleContent>
                            </Bubble>
                          )}

                          {message.imageUrl && (
                            <img
                              src={message.imageUrl}
                              alt="생성된 이미지"
                              className="mt-1 max-w-full rounded-lg border"
                            />
                          )}

                          {message.chart && (
                            <div className="mt-1">
                              <ChatDataChart spec={message.chart} />
                            </div>
                          )}

                          {showSuggestions && (
                            <div
                              role="group"
                              aria-label="추천 보기"
                              className="flex flex-wrap gap-1.5"
                            >
                              {message.suggestions?.map(
                                (suggestion, suggestionIndex) => (
                                  <Button
                                    key={suggestion}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleSuggestionSelect(suggestion)
                                    }
                                  >
                                    <span className="text-muted-foreground tabular-nums">
                                      {suggestionIndex + 1}
                                    </span>
                                    {suggestion}
                                  </Button>
                                )
                              )}
                            </div>
                          )}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  );
                })}

                {isResponding && (
                  <MessageScrollerItem
                    messageId="assistant-loading"
                    className="[content-visibility:visible] [contain-intrinsic-size:none]"
                  >
                    <Message align="start">
                      <MessageAvatar className="size-8 rounded-full border border-border bg-muted">
                        <Bot className="size-4" />
                      </MessageAvatar>

                      <MessageContent>
                        <MessageHeader>IQMS 도우미</MessageHeader>

                        <Bubble variant="muted" role="status">
                          <BubbleContent aria-label="응답 생성 중">
                            <TypingDots />
                          </BubbleContent>
                        </Bubble>

                        {/* 대기 경과 시간(초) + 중단 버튼 */}
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {Math.floor(waitingMs / 1000)}초 경과…
                          </span>
                          <button
                            type="button"
                            onClick={handleStopResponse}
                            aria-label="응답 중단"
                            className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                          >
                            {/* 글자색을 따르는 채워진 정지 사각형 */}
                            <span className="size-2.5 rounded-[3px] bg-current transition-transform group-hover:scale-110" />
                            중단
                          </button>
                        </div>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>

            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>

      <div className="min-w-0 shrink-0 space-y-3 border-t p-4">
        {attachments.length > 0 && (
          <AttachmentList
            attachments={attachments}
            onRemove={handleRemoveAttachment}
          />
        )}

        <div className="flex w-full items-stretch gap-2">
          <Textarea
            value={draft}
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              flow.kind === "event-number"
                ? `이벤트 번호를 입력하세요 (예: ${EVENT_NUMBER_EXAMPLE})`
                : "메시지를 입력하세요..."
            }
            disabled={isResponding}
            className="h-18 min-h-18 max-h-18 field-sizing-fixed resize-none overflow-y-auto"
            rows={1}
          />
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Button
              type="button"
              size="icon"
              onClick={handleAttach}
              aria-label="첨부파일 추가"
              variant="secondary"
              disabled={isResponding}
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={
                (!draft.trim() && attachments.length === 0) || isResponding
              }
              aria-label="메시지 보내기"
            >
              <SendHorizontal className="size-4" />
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </aside>
  );
}
