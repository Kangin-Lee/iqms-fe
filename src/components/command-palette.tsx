import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { FileText, LayoutGrid, Search } from "lucide-react";
import { useNavigate } from "react-router";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  sidebarMenuItems,
  type SidebarMenuItem,
} from "@/config/sidebar-navigation";
import { qualityEventData } from "@/mock/quailty-event/quailtyEventData";

/** 검색 결과 한 건(페이지 이동 또는 품질 이벤트 상세 이동). */
type SearchResult = {
  kind: "page" | "event";
  /** 렌더 key & 중복 방지용. */
  key: string;
  title: string;
  /** 보조 설명(페이지=상위 메뉴, 이벤트=이벤트 번호). */
  subtitle?: string;
  /** 선택 시 이동 경로. */
  url: string;
};

type SearchPage = { title: string; url: string; group?: string };

/**
 * 사이드바 메뉴에서 실제 이동 가능한 leaf 페이지만 추립니다.
 * - 하위(children)를 가진 대분류는 자체 페이지가 없으므로 제외
 * - breadcrumb 전용 항목 제외
 * - 숨김(hidden) 페이지(등록 화면 등)는 이동 가능하므로 포함
 */
function collectPages(items: SidebarMenuItem[], group?: string): SearchPage[] {
  return items.flatMap((item) => {
    if (item.children && item.children.length > 0) {
      return collectPages(item.children, item.title);
    }
    if (item.breadcrumbOnly || !item.url) return [];
    return [{ title: item.title, url: item.url, group }];
  });
}

/**
 * 글로벌 검색 / 커맨드 팔레트.
 *
 * - 헤더의 검색 버튼 또는 Ctrl/⌘+K 로 엽니다.
 * - 메뉴(페이지)와 품질 이벤트(번호·제목)를 통합 검색합니다.
 * - ↑/↓ 로 이동, Enter 로 선택, Esc 로 닫습니다.
 *
 * 검색 대상은 이후 부적합·CAPA·형상변경 등으로 쉽게 확장할 수 있도록
 * 단일 결과 배열(results)로 구성했습니다.
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 페이지 인덱스는 메뉴 설정에서 한 번만 계산합니다.
  const pages = useMemo(() => collectPages(sidebarMenuItems), []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();

    const pageResults: SearchResult[] = pages
      .filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q) ||
          (p.group?.toLowerCase().includes(q) ?? false)
      )
      .map((p) => ({
        kind: "page",
        key: `page:${p.url}`,
        title: p.title,
        subtitle: p.group,
        url: p.url,
      }));

    // 품질 이벤트는 검색어가 있을 때만(번호·제목 매칭, 최대 8건).
    const eventResults: SearchResult[] = !q
      ? []
      : qualityEventData
          .filter(
            (e) =>
              e.eventNumber.toLowerCase().includes(q) ||
              e.title.toLowerCase().includes(q)
          )
          .slice(0, 8)
          .map((e) => ({
            kind: "event",
            key: `event:${e.id}`,
            title: e.title,
            subtitle: e.eventNumber,
            url: `/quality-events/detail/${e.id}`,
          }));

    return [...pageResults, ...eventResults];
  }, [pages, query]);

  // Ctrl/⌘+K 전역 단축키로 열고 닫습니다.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 검색어가 바뀌거나 새로 열릴 때 활성 항목을 맨 위로 초기화합니다.
  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  // 활성 항목이 목록 밖으로 나가지 않게 스크롤합니다.
  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // 열릴 때 검색 입력에 포커스를 줍니다(다이얼로그가 초기 포커스를 팝업에 두는 경우 대비).
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  function select(item: SearchResult) {
    setOpen(false);
    setQuery("");
    navigate(item.url);
  }

  // ↑/↓ 이동·Enter 선택은 입력창(타깃) 레벨에서 처리합니다.
  // base-ui Dialog가 팝업 내부 keydown의 상위 전파를 막으므로 window 리스너로는 받을 수 없습니다.
  function handleInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) select(item);
    }
  }

  return (
    <>
      {/* 넓은 화면: 검색 박스형 트리거 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-56 cursor-pointer items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground outline-hidden transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:flex"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 text-left">검색…</span>
        <kbd className="pointer-events-none flex items-center gap-0.5 rounded border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      {/* 좁은 화면: 아이콘 트리거 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="검색 (Ctrl+K)"
        className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <Search className="size-5" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        >
          <DialogTitle className="sr-only">통합 검색</DialogTitle>

          {/* 검색 입력 */}
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="메뉴, 품질 이벤트 번호·제목으로 검색…"
              className="h-11 flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
            />
          </div>

          {/* 결과 목록 */}
          <div className="max-h-80 overflow-y-auto p-1.5">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다.
              </p>
            ) : (
              results.map((item, idx) => {
                const showHeader =
                  idx === 0 || results[idx - 1].kind !== item.kind;
                const Icon = item.kind === "page" ? LayoutGrid : FileText;
                return (
                  <Fragment key={item.key}>
                    {showHeader && (
                      <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                        {item.kind === "page" ? "페이지" : "품질 이벤트"}
                      </div>
                    )}
                    <button
                      type="button"
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      onClick={() => select(item)}
                      onMouseMove={() => setActiveIndex(idx)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm outline-hidden transition-colors",
                        idx === activeIndex
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground"
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {item.subtitle}
                        </span>
                      )}
                    </button>
                  </Fragment>
                );
              })
            )}
          </div>

          {/* 하단 힌트 */}
          <div className="flex items-center gap-3 border-t bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            <span>
              <kbd className="rounded border bg-background px-1">↑</kbd>{" "}
              <kbd className="rounded border bg-background px-1">↓</kbd> 이동
            </span>
            <span>
              <kbd className="rounded border bg-background px-1">Enter</kbd> 선택
            </span>
            <span>
              <kbd className="rounded border bg-background px-1">Esc</kbd> 닫기
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
