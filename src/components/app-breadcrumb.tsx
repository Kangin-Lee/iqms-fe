import { Fragment } from "react";
import { Link, useLocation } from "react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { SidebarMenuItem } from "@/config/sidebar-navigation";
import { sidebarMenuItems } from "@/config/sidebar-navigation";
import { CAPA_DETAIL_PREFIX } from "@/pages/capa-management/paths";

function findBreadcrumbTrail(
  pathname: string,
  items: SidebarMenuItem[],
  parents: SidebarMenuItem[] = []
): SidebarMenuItem[] {
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      const found = findBreadcrumbTrail(pathname, item.children, [
        ...parents,
        item,
      ]);
      if (found.length > 0) return found;
      continue;
    }

    const matched =
      item.url === "/"
        ? pathname === "/"
        : pathname === item.url || pathname.startsWith(`${item.url}/`);

    if (matched) {
      return [...parents, item];
    }
  }

  return [];
}

/** 품질 이벤트 상세가 공유되는 라우트 접두사. */
const DETAIL_PREFIX = "/quality-events/detail";

/** 형상변경요청 상세 라우트 접두사. */
const CHANGE_REQUEST_DETAIL_PREFIX = "/configuration-changes/detail";

/**
 * 상세는 여러 목록이 공유하므로, 진입 출처(from=목록 경로)에 따라
 * 상세 화면의 라벨을 달리 표시합니다. from 값은 각 목록 메뉴의 url과 일치합니다.
 */
const DETAIL_LABEL_BY_FROM: Record<string, string> = {
  "/quality-events/list": "품질 이벤트 상세",
  "/quality-events/my": "품질 이벤트 상세",
  "/quality-events/review": "품질 이벤트 상세",
  "/nonconformities/judgment": "부적합 판정 상세",
  "/nonconformities/list": "부적합 상세",
  "/nonconformities/minor-closure": "경미 부적합/단순조치 상세",
  "/capa/register": "CAPA 계획 등록 상세",
  "/capa/status": "품질 이벤트 상세",
};

export function AppBreadcrumb() {
  const { pathname, search } = useLocation();

  // 상세 화면이면 출처(from)의 목록 트레일 뒤에 출처별 상세 크럼을 붙입니다.
  const from = new URLSearchParams(search).get("from");
  const detailLabel = from ? DETAIL_LABEL_BY_FROM[from] : undefined;

  let trail: SidebarMenuItem[];
  if (pathname.startsWith(DETAIL_PREFIX) && from && detailLabel) {
    trail = [
      ...findBreadcrumbTrail(from, sidebarMenuItems),
      { title: detailLabel, url: pathname },
    ];
  } else if (pathname.startsWith(`${CHANGE_REQUEST_DETAIL_PREFIX}/`)) {
    // 형상변경요청 상세: 진입 출처(from) 목록 트레일 + "형상변경요청 상세".
    // from이 없으면(직접 진입) 목록을 기준으로 표시합니다.
    const base =
      from && from.startsWith("/configuration-changes/")
        ? from
        : "/configuration-changes/list";
    trail = [
      ...findBreadcrumbTrail(base, sidebarMenuItems),
      { title: "형상변경요청 상세", url: pathname },
    ];
  } else if (pathname.startsWith(`${CAPA_DETAIL_PREFIX}/`)) {
    // CAPA 상세: 진입 출처(from)의 목록 트레일 + "CAPA 상세".
    // from이 없으면(직접 진입) 진행 현황을 기준으로 표시합니다.
    const base = findBreadcrumbTrail(from ?? "/capa/status", sidebarMenuItems);
    trail = [...base, { title: "CAPA 상세", url: pathname }];
  } else {
    trail = findBreadcrumbTrail(pathname, sidebarMenuItems);
  }

  const crumbs =
    trail.length > 0
      ? trail
      : [{ title: "지능형 품질경영시스템", url: pathname }];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const isGroupOnly = Boolean(crumb.children?.length);

          return (
            <Fragment key={`${crumb.url}-${crumb.title}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-semibold">
                    {crumb.title}
                  </BreadcrumbPage>
                ) : isGroupOnly ? (
                  <span className="text-muted-foreground">{crumb.title}</span>
                ) : (
                  <BreadcrumbLink render={<Link to={crumb.url} />}>
                    {crumb.title}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
