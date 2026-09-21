import { useState } from "react";
import { ChevronRight, LogOut, UserRound } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router";

import { Logo } from "@/components/logo";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type {
  SidebarBadgeKey,
  SidebarMenuItem as SidebarMenuItemType,
} from "@/config/sidebar-navigation";
import { sidebarMenuItems } from "@/config/sidebar-navigation";
import { currentUser } from "@/mock/currentUser";
import {
  useCapaRegisterCount,
  useCorrectivePreventiveTargetCount,
  useEffectivenessTargetCount,
  useRootCauseTargetCount,
} from "@/pages/capa-management/queries";
import { useMinorClosureActionCount } from "@/pages/nonconformity-management/minor-closure/actions";
import { useNonconformityJudgmentCount } from "@/pages/nonconformity-management/queries";
import { QUALITY_EVENT_FROM_PARAM } from "@/pages/quailty-event/paths";
import { useMyReviewPendingCount } from "@/pages/quailty-event/queries";
import {
  useApplyPendingCount,
  useMyChangeReviewPendingCount,
  useVerifyPendingCount,
} from "@/pages/change-request-management/queries";

/** 배지 식별자 → 실제 건수. 값이 없으면(로딩 중) 배지를 숨깁니다. */
type BadgeCounts = Partial<Record<SidebarBadgeKey, number>>;

function matchesPath(pathname: string, url: string) {
  if (url === "/") {
    return pathname === "/";
  }

  return pathname === url || pathname.startsWith(`${url}/`);
}

function isItemActive(pathname: string, item: SidebarMenuItemType) {
  if (matchesPath(pathname, item.url)) return true;
  return item.activePaths?.some((path) => matchesPath(pathname, path)) ?? false;
}

/**
 * 형제 항목 중 어느 것을 활성으로 볼지 결정합니다.
 * 상세처럼 여러 목록이 공유하는 경로는 경로만으로 소속을 알 수 없으므로,
 * 진입한 목록이 남긴 from 파라미터를 우선 신뢰합니다.
 *
 * 우선순위: 경로 직접 일치 → from 파라미터 → activePaths 선언
 */
function resolveActiveUrl(
  items: SidebarMenuItemType[],
  pathname: string,
  search: string,
): string | null {
  const direct = items.find((item) => matchesPath(pathname, item.url));
  if (direct) return direct.url;

  const from = new URLSearchParams(search).get(QUALITY_EVENT_FROM_PARAM);
  if (from) {
    // from은 출처를 명시하므로, 그 항목을 가진 그룹만 활성화합니다.
    // 다른 그룹(예: 품질 이벤트 목록)이 activePaths로 잘못 잡히지 않도록 폴백을 건너뜁니다.
    const owner = items.find((item) => item.url === from);
    return owner?.url ?? null;
  }

  // from이 없는 직접 진입(북마크·새로고침)만 activePaths 규칙으로 폴백합니다.
  const claimed = items.find((item) =>
    item.activePaths?.some((path) => matchesPath(pathname, path)),
  );
  return claimed?.url ?? null;
}

function CollapsibleMenuItem({
  item,
  pathname,
  search,
  badgeCounts,
}: {
  item: SidebarMenuItemType;
  pathname: string;
  search: string;
  badgeCounts: BadgeCounts;
}) {
  // 숨김 항목은 활성 판정 대상에서도 제외합니다(상세처럼 노출되지 않는 경로).
  const visibleChildren = item.children?.filter((child) => !child.hidden) ?? [];
  const activeUrl = resolveActiveUrl(visibleChildren, pathname, search);
  const childActive = activeUrl !== null;

  // 제어형(controlled) 열림 상태. 하위 경로로 이동하면 자동으로 펼치고,
  // 그 외에는 사용자의 토글을 유지합니다.
  // (uncontrolled defaultOpen이 라우트 변경마다 바뀌어 발생하던 경고를 제거)
  const [open, setOpen] = useState(childActive);
  // 하위 활성 여부가 바뀔 때만 자동 펼침(React 권장: 렌더 중 상태 조정).
  const [wasChildActive, setWasChildActive] = useState(childActive);
  if (childActive !== wasChildActive) {
    setWasChildActive(childActive);
    if (childActive) setOpen(true);
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={<SidebarMenuItem />}
      className="group/collapsible"
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton isActive={childActive} tooltip={item.title} />
        }
      >
        {item.icon ? <item.icon /> : null}
        <span>{item.title}</span>
        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-[open]/collapsible:rotate-90" />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <SidebarMenuSub>
          {visibleChildren.map((child) => {
            const count = child.badge ? badgeCounts[child.badge] : undefined;
            // 0건이면 배지를 띄우지 않습니다.
            const showBadge = count !== undefined && count > 0;

            return (
              <SidebarMenuSubItem key={child.url}>
                <SidebarMenuSubButton
                  isActive={child.url === activeUrl}
                  render={<NavLink to={child.url} />}
                >
                  {/* 배지를 붙이면 span:last-child 규칙이 빗나가므로 직접 truncate. */}
                  <span className="min-w-0 truncate">{child.title}</span>

                  {showBadge && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-sidebar-primary px-1 text-xs font-medium tabular-nums text-sidebar-primary-foreground">
                      <span className="sr-only">미처리</span>
                      {count}
                    </span>
                  )}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { data: myReviewPendingCount } = useMyReviewPendingCount();
  const { data: nonconformityJudgmentCount } = useNonconformityJudgmentCount();
  const { data: capaRegisterCount } = useCapaRegisterCount();
  const { data: minorClosureCount } = useMinorClosureActionCount();
  const { data: rootCauseTargetCount } = useRootCauseTargetCount();
  const { data: correctivePreventiveTargetCount } =
    useCorrectivePreventiveTargetCount();
  const { data: effectivenessTargetCount } = useEffectivenessTargetCount();
  const { data: changeReviewPendingCount } = useMyChangeReviewPendingCount();
  const { data: changeApplyPendingCount } = useApplyPendingCount();
  const { data: changeVerifyPendingCount } = useVerifyPendingCount();

  const badgeCounts: BadgeCounts = {
    myReviewPending: myReviewPendingCount,
    changeReviewPending: changeReviewPendingCount,
    changeApplyPending: changeApplyPendingCount,
    changeVerifyPending: changeVerifyPendingCount,
    nonconformityJudgment: nonconformityJudgmentCount,
    capaRegister: capaRegisterCount,
    minorClosure: minorClosureCount,
    rootCauseTarget: rootCauseTargetCount,
    correctivePreventiveTarget: correctivePreventiveTargetCount,
    effectivenessTarget: effectivenessTargetCount,
  };

  // TODO: 실제 인증이 붙으면 세션/토큰 정리 후 이동하도록 교체.
  function handleLogout() {
    navigate("/login", { replace: true });
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Home"
              className="group-data-[collapsible=icon]:justify-center"
              render={<NavLink to="/" />}
            >
              <Logo />

              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">IQMS</span>
                <span className="truncate text-xs">지능형 품질경영시스템</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>품질 관리</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarMenuItems
                .filter((item) => !item.hidden)
                .map((item) => {
                  if (item.children && item.children.length > 0) {
                    return (
                      <CollapsibleMenuItem
                        key={item.url}
                        item={item}
                        pathname={pathname}
                        search={search}
                        badgeCounts={badgeCounts}
                      />
                    );
                  }

                  const active = isItemActive(pathname, item);

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.title}
                        render={<NavLink to={item.url} />}
                      >
                        {item.icon ? <item.icon /> : null}
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={`${currentUser.name} · ${currentUser.department} / ${currentUser.role}`}
              onClick={() => navigate("/mypage")}
              className="cursor-pointer bg-black/90 text-white ring-1 ring-white/10 hover:bg-black hover:text-white active:bg-black active:text-white data-active:bg-black/90 data-active:text-white group-data-[collapsible=icon]:justify-center"
            >
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-white/15">
                <UserRound className="size-4" />
              </div>

              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{currentUser.name}</span>
                <span className="truncate text-xs text-white/60">
                  {currentUser.department} / {currentUser.role}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="로그아웃"
              onClick={handleLogout}
              className="mt-2 bg-white text-neutral-900 flex justify-center hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10 active:text-destructive group-data-[collapsible=icon]:justify-center transition-colors"
            >
              <LogOut className="size-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">
                로그아웃
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="whitespace-nowrap text-center text-xs text-muted-foreground">
          <span className="group-data-[collapsible=icon]:hidden">
            © IOPS Inc. IQMS. All rights reserved.
          </span>
          <span className="hidden group-data-[collapsible=icon]:inline">©</span>
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
