import "./App.css";
import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "./layout/app-layout";
import { SimplePage } from "./pages/simple-page";
import type { SidebarMenuItem } from "./config/sidebar-navigation";
import { sidebarMenuItems } from "./config/sidebar-navigation";
import DashboardPage from "./pages/dashboard";
import LoginPage from "./pages/auth/login";
import SignupPage from "./pages/auth/signup";
import QualityEventDetail from "./pages/quailty-event/quailty-event-detail";
import QualityEventRegister from "./pages/quailty-event/quailty-event-register";
import CapaStatusDetail from "./pages/capa-management/capa-status/detail";
import ChangeRequestDetail from "./pages/change-request-management/change-request-detail";
import ChangeRequestRegister from "./pages/change-request-management/change-request-register";
import SettingsPage from "./pages/settings";
import { Toaster } from "./components/ui/toast";
import type { ComponentType } from "react";

type RouteLeaf = {
  url: string;
  title: string;
  description: string;
  component?: ComponentType<unknown>;
};

/** 메뉴 설정에서 실제 페이지를 가진 leaf 항목만 평탄화합니다. */
function flattenRoutes(items: SidebarMenuItem[]): RouteLeaf[] {
  return items.flatMap((item) => {
    if (item.children && item.children.length > 0) {
      return flattenRoutes(item.children);
    }

    if (item.breadcrumbOnly) return [];

    return [
      {
        url: item.url,
        title: item.title,
        description: item.description ?? "",
        component: item.component,
      },
    ];
  });
}

function App() {
  const routes = flattenRoutes(sidebarMenuItems);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />

        <Route element={<AppLayout />}>
          {/* 품질 이벤트 상세 (동적 파라미터라 별도 정의) */}
          <Route
            path="/quality-events/detail/:id"
            element={<QualityEventDetail />}
          />

          {/* CAPA 상세 (여러 목록이 공유하는 독립 경로) */}
          <Route path="/capa/detail/:id" element={<CapaStatusDetail />} />

          {/* 형상변경요청 상세 */}
          <Route
            path="/configuration-changes/detail/:id"
            element={<ChangeRequestDetail />}
          />

          {/* 형상변경요청 수정(작성중 이어쓰기) */}
          <Route
            path="/configuration-changes/register/:id"
            element={<ChangeRequestRegister />}
          />

          {/* 품질 이벤트 수정(작성중 이벤트 이어쓰기) */}
          <Route
            path="/quality-events/register/:id"
            element={<QualityEventRegister />}
          />

          {/* 관리자 설정 (헤더 프로필 메뉴 → 설정) */}
          <Route path="/settings" element={<SettingsPage />} />

          {routes.map(({ url, title, description, component: Page }) => {
            const element =
              url === "/" ? (
                <DashboardPage />
              ) : Page ? (
                <Page />
              ) : (
                <SimplePage title={title} description={description} />
              );

            if (url === "/") {
              return <Route key={url} index element={element} />;
            }

            return <Route key={url} path={url} element={element} />;
          })}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {/* 전역 toast 뷰포트 */}
      <Toaster />
    </>
  );
}

export default App;
