import { Outlet } from "react-router";
import { SquarePen } from "lucide-react";

import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatPanel } from "@/components/chat-panel";
import { HeaderUserStatus } from "@/components/header-user-status";
import { NotificationBell } from "@/components/notification-bell";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useUiStore } from "@/stores/ui-store";

export function AppLayout() {
  // 챗 패널 열림 상태는 전역 UI 스토어(Zustand)에서 관리합니다.
  const chatOpen = useUiStore((s) => s.chatOpen);
  const setChatOpen = useUiStore((s) => s.setChatOpen);
  const mainLayout = (
    // h-full: ResizablePanel이 끼우는 내부 래퍼가 display:block이라 flex-1만으로는
    // 높이가 콘텐츠 기준으로 줄어듭니다. 래퍼는 높이가 확정돼 있어 h-full로 받습니다.
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <SidebarTrigger />

        <div className="h-4 w-px bg-border" />

        <AppBreadcrumb />

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <HeaderUserStatus />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );

  return (
    <SidebarProvider defaultOpen className="h-svh overflow-hidden">
      <AppSidebar />

      <SidebarInset className="relative min-h-0 overflow-hidden">
        {/*
          메인 콘텐츠(Outlet)는 항상 같은 위치의 같은 패널에 두어야 합니다.
          챗 패널을 열고 닫을 때 트리 구조가 바뀌면 메인이 리마운트되어
          현재 페이지의 데이터가 매번 다시 로드됩니다. 그래서 패널 그룹을
          항상 렌더하고, 챗 패널만 조건부로 추가합니다(id/order로 추적).
        */}
        <ResizablePanelGroup orientation="horizontal" className="min-h-0">
          <ResizablePanel
            id="main-panel"
            order={1}
            defaultSize="72%"
            minSize="45%"
          >
            {mainLayout}
          </ResizablePanel>
          {chatOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                id="chat-panel"
                order={2}
                defaultSize="28%"
                minSize="20%"
                maxSize="55%"
              >
                <ChatPanel open={chatOpen} onOpenChange={setChatOpen} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {!chatOpen && (
          <button
            type="button"
            aria-label="대화창 열기"
            onClick={() => setChatOpen(true)}
            className="absolute bottom-5 right-5 z-40 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/90 text-white shadow-lg transition hover:bg-black animate-[bounce_1.5s_infinite]"
          >
            <SquarePen size={20} />
          </button>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
