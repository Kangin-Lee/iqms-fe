import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type LogLevel = "정보" | "경고" | "오류";
type LogEntry = {
  time: string;
  user: string;
  action: string;
  target: string;
  level: LogLevel;
};

/** 데모용 감사 로그. 실제로는 서버의 활동 로그를 받아옵니다. */
const LOGS: LogEntry[] = [
  { time: "2026-09-21 09:12", user: "홍길동", action: "로그인", target: "-", level: "정보" },
  { time: "2026-09-21 09:20", user: "박준호", action: "부적합 판정", target: "NC-2026-030", level: "정보" },
  { time: "2026-09-21 10:02", user: "한대희", action: "CAPA 종결", target: "CAPA-2026-011", level: "정보" },
  { time: "2026-09-21 10:40", user: "시스템", action: "Gemini 호출 실패(429)", target: "/api/gemini", level: "경고" },
  { time: "2026-09-21 11:15", user: "최유진", action: "사용자 권한 변경", target: "이우민", level: "정보" },
  { time: "2026-09-21 11:50", user: "시스템", action: "로그인 실패", target: "unknown@x", level: "오류" },
];

const LEVEL_VARIANT: Record<LogLevel, "secondary" | "outline" | "destructive"> = {
  정보: "secondary",
  경고: "outline",
  오류: "destructive",
};

/** 로그 관리 탭 — 활동/감사 로그 조회·검색(읽기 전용). */
export default function LogsTab() {
  const [query, setQuery] = useState("");
  const rows = LOGS.filter(
    (l) => !query || (l.user + l.action + l.target).includes(query)
  );

  return (
    <section className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="사용자·액션·대상 검색"
        className="max-w-xs bg-card"
      />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-center [&>th]:font-medium">
              <th>시간</th>
              <th>사용자</th>
              <th>액션</th>
              <th>대상</th>
              <th>구분</th>
            </tr>
          </thead>
          <tbody className="[&>tr]:border-t">
            {rows.map((l, i) => (
              <tr key={i} className="[&>td]:px-4 [&>td]:py-2.5 [&>td]:text-center">
                <td className="whitespace-nowrap text-muted-foreground tabular-nums">
                  {l.time}
                </td>
                <td className="font-medium text-foreground">{l.user}</td>
                <td className="text-foreground">{l.action}</td>
                <td className="text-muted-foreground">{l.target}</td>
                <td>
                  <Badge variant={LEVEL_VARIANT[l.level]}>{l.level}</Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  로그가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
