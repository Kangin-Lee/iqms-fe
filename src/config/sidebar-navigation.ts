import CapaRegisterList from "@/pages/capa-management/capa-register";
import CapaStatusList from "@/pages/capa-management/capa-status";
import CorrectivePreventiveTargetList from "@/pages/capa-management/corrective-preventive-target";
import EffectivenessTargetList from "@/pages/capa-management/effectiveness-target";
import RootCauseTargetList from "@/pages/capa-management/root-cause-target";
import MyActionList from "@/pages/action-management/my-action";
import ActionStatusList from "@/pages/action-management/action-status";
import DelayedActionList from "@/pages/action-management/delayed-action";
import CompletedActionList from "@/pages/action-management/completed-action";
import ChangeRequestApplyPending from "@/pages/change-request-management/apply-pending";
import ChangeRequestClosed from "@/pages/change-request-management/closed";
import ChangeRequestList from "@/pages/change-request-management/change-request-list";
import ChangeRequestMyReview from "@/pages/change-request-management/my-review";
import ChangeRequestRegister from "@/pages/change-request-management/change-request-register";
import ChangeRequestVerifyPending from "@/pages/change-request-management/verify-pending";
import MinorClosureList from "@/pages/nonconformity-management/minor-closure";
import NonconformityJudgmentList from "@/pages/nonconformity-management/nonconformity-judgment";
import NonconformityList from "@/pages/nonconformity-management/nonconformity-list";
import MyPage from "@/pages/mypage";
import MyQualityEventList from "@/pages/quailty-event/my-event";
import MyReviewTargetList from "@/pages/quailty-event/my-review-target";
import QuailtyEventList from "@/pages/quailty-event/quailty-event-list";
import QualityEventRegister from "@/pages/quailty-event/quailty-event-register";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  FileWarning,
  GitPullRequest,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
} from "lucide-react";

/**
 * 사이드바에 미처리 건수 배지를 표시할 항목 식별자.
 * 실제 건수는 app-sidebar에서 이 키에 맞는 쿼리로 조회합니다.
 */
export type SidebarBadgeKey =
  | "myReviewPending"
  | "nonconformityJudgment"
  | "capaRegister"
  | "minorClosure"
  | "rootCauseTarget"
  | "correctivePreventiveTarget"
  | "effectivenessTarget"
  | "changeReviewPending"
  | "changeApplyPending"
  | "changeVerifyPending";

export type SidebarMenuItem = {
  title: string;
  url: string;
  /** 상위(대분류) 항목에만 지정. 하위 항목은 생략합니다. */
  icon?: LucideIcon;
  /** 페이지 헤더용 설명. 라우트 생성 시 사용됩니다. */
  description?: string;
  children?: SidebarMenuItem[];
  /** 메뉴에 표시하지 않습니다. */
  hidden?: boolean;
  /** 페이지 컴포넌트. 라우트 생성 시 사용됩니다. */
  component?: React.ComponentType<unknown>;
  /** 이 경로들에서도 해당 메뉴를 active로 표시합니다(숨김 하위 페이지 등). */
  activePaths?: string[];
  /** breadcrumb 경로 표시용 항목. 라우트/사이드바에는 노출하지 않습니다. */
  breadcrumbOnly?: boolean;
  /** 지정하면 해당 건수를 배지로 표시합니다(0이면 숨김). 하위 항목에만 적용됩니다. */
  badge?: SidebarBadgeKey;
};

export const sidebarMenuItems: SidebarMenuItem[] = [
  {
    title: "대시보드",
    url: "/",
    icon: LayoutDashboard,
    description: "품질 관리 현황을 확인합니다.",
  },
  {
    // 사이드바에는 노출하지 않고(하단 프로필 클릭으로 진입) 라우트·breadcrumb만 등록.
    title: "마이페이지",
    url: "/mypage",
    description: "내 프로필과 계정 설정을 관리합니다.",
    hidden: true,
    component: MyPage,
  },
  {
    title: "품질 이벤트 관리",
    url: "/quality-events",
    icon: ClipboardCheck,
    children: [
      {
        title: "품질 이벤트 등록",
        url: "/quality-events/register",
        description: "새로운 품질 이벤트를 등록합니다.",
        hidden: true,
        component: QualityEventRegister,
      },
      {
        title: "품질 이벤트 목록",
        url: "/quality-events/list",
        description: "전체 품질 이벤트를 조회합니다.",
        component: QuailtyEventList,
        // 등록/상세 페이지(숨김)에서도 목록 메뉴를 active로 표시
        activePaths: ["/quality-events/register", "/quality-events/detail"],
      },
      {
        title: "품질 이벤트 상세",
        url: "/quality-events/detail",
        hidden: true,
        breadcrumbOnly: true,
      },
      {
        title: "내 등록 이벤트",
        url: "/quality-events/my",
        description: "내가 등록한 품질 이벤트를 조회합니다.",
        component: MyQualityEventList,
      },
      {
        title: "내 검토 대상",
        url: "/quality-events/review",
        description: "내가 검토해야 할 품질 이벤트를 조회합니다.",
        component: MyReviewTargetList,
        badge: "myReviewPending",
      },
    ],
  },
  {
    title: "부적합 관리",
    url: "/nonconformities",
    icon: FileWarning,
    children: [
      {
        title: "부적합 판정 대상",
        url: "/nonconformities/judgment",
        description: "부적합 여부를 판정할 대상을 관리합니다.",
        component: NonconformityJudgmentList,
        badge: "nonconformityJudgment",
      },
      {
        title: "부적합 목록",
        url: "/nonconformities/list",
        description: "전체 부적합 건을 조회합니다.",
        component: NonconformityList,
      },
      {
        title: "경미 부적합/단순조치 종결 대상",
        url: "/nonconformities/minor-closure",
        description: "경미 부적합 및 단순조치 종결 대상을 관리합니다.",
        component: MinorClosureList,
        badge: "minorClosure",
      },
    ],
  },
  {
    title: "CAPA 관리",
    url: "/capa",
    icon: ShieldCheck,
    children: [
      {
        title: "CAPA 계획 등록 대상",
        url: "/capa/register",
        description: "CAPA 필요로 판정된 부적합의 CAPA 계획을 등록합니다.",
        component: CapaRegisterList,
        badge: "capaRegister",
      },
      {
        title: "CAPA 진행 현황",
        url: "/capa/status",
        description: "생성된 CAPA 전체의 진행 상태를 확인합니다.",
        component: CapaStatusList,
        // 출처(from) 없이 상세로 직접 진입(북마크 등)하면 진행 현황을 활성으로.
        activePaths: ["/capa/detail"],
      },
      {
        title: "원인분석 대상",
        url: "/capa/root-cause",
        description: "원인분석 대기·완료 상태의 CAPA를 관리합니다.",
        component: RootCauseTargetList,
        badge: "rootCauseTarget",
      },
      {
        title: "시정/예방조치 대상",
        url: "/capa/corrective-preventive",
        description: "조치중 상태의 CAPA를 관리합니다.",
        component: CorrectivePreventiveTargetList,
        badge: "correctivePreventiveTarget",
      },
      {
        title: "효과성 검증 대상",
        url: "/capa/effectiveness",
        description: "효과성 검증 대기·중·완료 상태의 CAPA를 관리합니다.",
        component: EffectivenessTargetList,
        badge: "effectivenessTarget",
      },
    ],
  },
  {
    title: "조치 관리",
    url: "/actions",
    icon: ListChecks,
    children: [
      {
        title: "내 조치 대상",
        url: "/actions/my",
        description: "내가 담당자로 지정된 진행중 조치를 조회합니다.",
        component: MyActionList,
      },
      {
        title: "조치 진행 현황",
        url: "/actions/status",
        description: "전사 시정/예방조치의 진행 상태를 확인합니다.",
        component: ActionStatusList,
      },
      {
        title: "지연 조치",
        url: "/actions/delayed",
        description: "기한이 지난 진행중 조치를 관리합니다.",
        component: DelayedActionList,
      },
      {
        title: "조치 완료 이력",
        url: "/actions/completed",
        description: "완료된 조치를 이력(로그)으로 조회합니다.",
        component: CompletedActionList,
      },
    ],
  },
  {
    title: "형상변경요청 관리",
    url: "/configuration-changes",
    icon: GitPullRequest,
    children: [
      {
        title: "형상변경요청 등록",
        url: "/configuration-changes/register",
        description: "새로운 형상변경요청을 등록합니다.",
        hidden: true,
        component: ChangeRequestRegister,
      },
      {
        title: "형상변경요청 목록",
        url: "/configuration-changes/list",
        description: "전체 형상변경요청을 조회합니다.",
        component: ChangeRequestList,
        // 등록 페이지(숨김)·상세 페이지에서도 목록 메뉴를 active로 표시
        activePaths: [
          "/configuration-changes/register",
          "/configuration-changes/detail",
        ],
      },
      {
        title: "내 검토/승인 대상",
        url: "/configuration-changes/review",
        description: "내가 검토하거나 승인할 변경을 조회합니다.",
        component: ChangeRequestMyReview,
        badge: "changeReviewPending",
      },
      {
        title: "적용 대기",
        url: "/configuration-changes/pending-apply",
        description: "적용 대기중인 변경을 관리합니다.",
        component: ChangeRequestApplyPending,
        badge: "changeApplyPending",
      },
      {
        title: "검증 대기",
        url: "/configuration-changes/pending-verify",
        description: "검증 대기중인 변경을 관리합니다.",
        component: ChangeRequestVerifyPending,
        badge: "changeVerifyPending",
      },
      {
        title: "변경 종료 이력",
        url: "/configuration-changes/closed",
        description: "종료된 변경 이력을 조회합니다.",
        component: ChangeRequestClosed,
      },
    ],
  },
];
