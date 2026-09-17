import { useState } from "react";
import { Bell, X } from "lucide-react";
import { useNavigate } from "react-router";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { qualityEventData } from "@/mock/quailty-event/quailtyEventData";
import {
  NONCONFORMITY_JUDGMENT_PATH,
  NONCONFORMITY_LIST_PATH,
} from "@/pages/nonconformity-management/queries";
import { QUALITY_EVENT_FROM_PARAM } from "@/pages/quailty-event/paths";

/** 알림 유형별 태그 라벨/색. */
const TYPE_META = {
  review: { label: "검토", className: "bg-emerald-100 text-emerald-700" },
  nonconformity: { label: "부적합", className: "bg-rose-100 text-rose-700" },
  capa: { label: "CAPA", className: "bg-sky-100 text-sky-700" },
  action: { label: "조치", className: "bg-amber-100 text-amber-700" },
} as const;

type NotificationType = keyof typeof TYPE_META;

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timeLabel: string;
  read: boolean;
  /** 관련 품질 이벤트 번호(QE-...). 클릭 시 이 이벤트 상세로 이동합니다. */
  eventNumber?: string;
  /** 상세로 이동할 때 유지할 목록 컨텍스트(from). */
  from?: string;
};

/** 데모용 목(mock) 알림. 실제로는 서버/이벤트에서 받아옵니다. */
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "review",
    title: "새 검토 요청",
    description: "QE-2026-006 '지상국 데이터 수신 누락' 검토가 요청되었습니다.",
    timeLabel: "방금 전",
    read: false,
    eventNumber: "QE-2026-006",
    from: "/quality-events/review",
  },
  {
    id: "n2",
    type: "nonconformity",
    title: "부적합 판정 요청",
    description: "QE-2026-025 부적합 판정 대상으로 접수되었습니다.",
    timeLabel: "10분 전",
    read: false,
    eventNumber: "QE-2026-025",
    from: NONCONFORMITY_JUDGMENT_PATH,
  },
  {
    id: "n3",
    type: "capa",
    title: "CAPA 판정 필요",
    description: "QE-2026-011(NC-2026-002)가 CAPA 판정 대상으로 편입되었습니다.",
    timeLabel: "1시간 전",
    read: false,
    eventNumber: "QE-2026-011",
    from: NONCONFORMITY_LIST_PATH,
  },
  {
    id: "n4",
    type: "action",
    title: "조치 기한 임박",
    description: "QE-2026-008 관련 시정조치 마감이 하루 남았습니다. (D-1)",
    timeLabel: "3시간 전",
    read: true,
    eventNumber: "QE-2026-008",
    from: NONCONFORMITY_LIST_PATH,
  },
  {
    id: "n5",
    type: "nonconformity",
    title: "부적합 확정",
    description: "QE-2026-005(NC-2026-001)가 부적합으로 확정되었습니다.",
    timeLabel: "어제",
    read: true,
    eventNumber: "QE-2026-005",
    from: NONCONFORMITY_LIST_PATH,
  },
];

export function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [open, setOpen] = useState(false);

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((n) => n.id !== id));

  const removeAll = () => setItems([]);

  const handleSelect = (n: Notification) => {
    markRead(n.id);
    setOpen(false);

    // 관련 품질 이벤트가 있으면 해당 이벤트 상세로(메뉴 컨텍스트 from 유지).
    const event = n.eventNumber
      ? qualityEventData.find((e) => e.eventNumber === n.eventNumber)
      : undefined;

    if (event) {
      const query = n.from
        ? `?${QUALITY_EVENT_FROM_PARAM}=${encodeURIComponent(n.from)}`
        : "";
      navigate(`/quality-events/detail/${event.id}${query}`);
    } else if (n.from) {
      // 이벤트를 못 찾으면 목록 컨텍스트로 폴백.
      navigate(n.from);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={unreadCount > 0 ? `알림 ${unreadCount}건` : "알림"}
        className="relative flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-medium text-white tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-medium">
            알림
            {unreadCount > 0 && (
              <span className="ml-1 text-muted-foreground">{unreadCount}</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              모두 읽음
            </button>
            <span className="h-3 w-px bg-border" aria-hidden />
            <button
              type="button"
              onClick={removeAll}
              disabled={items.length === 0}
              className="text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
            >
              모두 삭제
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            새 알림이 없습니다.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((n) => {
              const type = TYPE_META[n.type];
              return (
                <li
                  key={n.id}
                  className="group relative border-b last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(n)}
                    className={cn(
                      "flex w-full gap-2.5 px-3 py-2.5 pr-9 text-left transition-colors hover:bg-muted/60",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    {/* 안읽음 표시 점 */}
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        n.read ? "bg-transparent" : "bg-primary"
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium",
                            type.className
                          )}
                        >
                          {type.label}
                        </span>
                        <span
                          className={cn(
                            "truncate text-sm",
                            n.read
                              ? "text-foreground"
                              : "font-medium text-foreground"
                          )}
                        >
                          {n.title}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.description}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
                        {n.timeLabel}
                      </span>
                    </span>
                  </button>

                  {/* 삭제 버튼(호버/포커스 시 노출). 본문 버튼과 형제라 중첩되지 않습니다. */}
                  <button
                    type="button"
                    onClick={() => removeItem(n.id)}
                    aria-label="알림 삭제"
                    className="absolute top-2 right-1.5 flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
