import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { badgeVariants } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { currentUser } from "@/mock/currentUser";

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "활동중",
    dotClassName: "bg-emerald-500",
    badgeClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  },
  {
    value: "away",
    label: "자리비움",
    dotClassName: "bg-amber-500",
    badgeClassName:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
  },
  {
    value: "busy",
    label: "다른 용무중",
    dotClassName: "bg-rose-500",
    badgeClassName: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50",
  },
  {
    value: "offline",
    label: "오프라인",
    dotClassName: "bg-zinc-400",
    badgeClassName: "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-50",
  },
] as const;

type UserStatus = (typeof STATUS_OPTIONS)[number]["value"];

type HeaderUserStatusProps = {
  userName?: string;
};

export function HeaderUserStatus({
  userName = currentUser.name,
}: HeaderUserStatusProps) {
  const [status, setStatus] = useState<UserStatus>("active");
  const current =
    STATUS_OPTIONS.find((option) => option.value === status) ??
    STATUS_OPTIONS[0];

  return (
    <div className="flex shrink-0 items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            badgeVariants({ variant: "outline" }),
            "h-7 cursor-pointer gap-1.5 px-2.5",
            current.badgeClassName
          )}
        >
          <span
            className={cn("size-1.5 rounded-full", current.dotClassName)}
            aria-hidden
          />
          {current.label}
          <ChevronDown className="size-3.5 opacity-70" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-40">
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
                  className={cn(
                    "mr-1.5 size-1.5 rounded-full",
                    option.dotClassName
                  )}
                  aria-hidden
                />
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <p className="hidden text-sm text-muted-foreground sm:block">
        <span className="font-medium text-foreground">{userName}</span>님
        환영합니다.
      </p>
    </div>
  );
}
