import { useState } from "react";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useNavigate } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { currentUser } from "@/mock/currentUser";

/** 활동 상태 옵션(트리거의 점 색상과 드롭다운 라디오에서 공유). */
const STATUS_OPTIONS = [
  { value: "active", label: "활동중", dotClassName: "bg-emerald-500" },
  { value: "away", label: "자리비움", dotClassName: "bg-amber-500" },
  { value: "busy", label: "다른 용무중", dotClassName: "bg-rose-500" },
  { value: "offline", label: "오프라인", dotClassName: "bg-zinc-400" },
] as const;

type UserStatus = (typeof STATUS_OPTIONS)[number]["value"];

/** 이름에서 아바타용 이니셜을 만듭니다(2자 이하는 그대로, 이상은 첫 글자). */
function initialsOf(name: string): string {
  const trimmed = name.trim();
  return trimmed.length <= 2 ? trimmed : trimmed.charAt(0);
}

type HeaderUserMenuProps = {
  userName?: string;
};

/** 헤더의 사용자 아바타 + 프로필 드롭다운(상태 변경·마이페이지·로그아웃). */
export function HeaderUserMenu({
  userName = currentUser.name,
}: HeaderUserMenuProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<UserStatus>("active");
  const current =
    STATUS_OPTIONS.find((option) => option.value === status) ??
    STATUS_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 outline-hidden transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="사용자 메뉴"
      >
        <span className="relative inline-flex">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {initialsOf(userName)}
          </span>
          {/* 현재 활동 상태 점 */}
          <span
            className={cn(
              "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background",
              current.dotClassName
            )}
            aria-hidden
          />
        </span>
        <span className="hidden text-sm font-medium text-foreground sm:block">
          {userName}
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        {/* 프로필 요약 */}
        <div className="flex items-center gap-2.5 px-1.5 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            {initialsOf(userName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {userName}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {currentUser.role}
              </span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {currentUser.department} · {currentUser.email}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* 활동 상태 변경 (GroupLabel은 그룹 컨텍스트가 필요하므로 일반 텍스트로 표기) */}
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
          상태 변경
        </div>
        <DropdownMenuRadioGroup
          value={status}
          onValueChange={(value) => setStatus(value as UserStatus)}
        >
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              closeOnClick
            >
              <span
                className={cn("mr-1.5 size-1.5 rounded-full", option.dotClassName)}
                aria-hidden
              />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate("/mypage")}>
          <User />
          마이페이지
        </DropdownMenuItem>
        {/* 설정은 관리자에게만 노출 */}
        {currentUser.isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/settings")}>
            <Settings />
            설정
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={() => navigate("/login")}>
          <LogOut />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
