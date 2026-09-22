import { useSearchParams } from "react-router";

import { cn } from "@/lib/utils";
import UsersTab from "./UsersTab";
import SignupApprovalTab from "./SignupApprovalTab";
import FoldersTab from "./FoldersTab";
import LogsTab from "./LogsTab";

/** 설정 탭 정의. 순서대로 노출되며 첫 항목(유저 관리)이 기본값입니다. */
const TABS = [
  { key: "users", label: "유저 관리", component: UsersTab },
  { key: "signup", label: "회원가입 승인", component: SignupApprovalTab },
  { key: "folders", label: "폴더 관리", component: FoldersTab },
  { key: "logs", label: "로그 관리", component: LogsTab },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * 관리자 설정 페이지.
 * 탭 상태는 URL 쿼리(?tab=)에 저장해 새로고침·딥링크에도 유지되며,
 * 값이 없으면 기본으로 유저 관리를 보여 줍니다.
 */
export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const active: TabKey = TABS.some((t) => t.key === raw)
    ? (raw as TabKey)
    : "users";
  const ActiveComponent =
    TABS.find((t) => t.key === active)?.component ?? UsersTab;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">설정</h1>
        <p className="text-sm text-muted-foreground">
          시스템 운영을 위한 관리자 설정입니다.
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setParams({ tab: tab.key })}
            className={cn(
              "-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 활성 탭 내용 */}
      <ActiveComponent />
    </div>
  );
}
