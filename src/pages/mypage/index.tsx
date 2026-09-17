import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import {
  BuildingIcon,
  ChevronRightIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { currentUser } from "@/mock/currentUser";
import { DEPARTMENT_OPTIONS } from "@/pages/auth/signup/signupSchema";
import { useMyActionTargets } from "@/pages/capa-management/queries";
import { useMyReviewPendingCount } from "@/pages/quailty-event/queries";
import { profileSchema, type ProfileValues } from "./schemas";
import MonthlyCompletionChart, {
  type MonthlyDatum,
} from "./components/MonthlyCompletionChart";
import PasswordChangeDialog from "./components/PasswordChangeDialog";

/** 입력값을 010-1234-5678 형태로 자동 포맷. */
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 11)]
    .filter(Boolean)
    .join("-");
}

export default function MyPage() {
  const navigate = useNavigate();
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      name: currentUser.name,
      phone: currentUser.phone,
      department: currentUser.department,
    },
  });

  function onProfileSubmit(values: ProfileValues) {
    // TODO: 실제 프로필 수정 API 연동.
    console.log(values);
    toast.add({ title: "프로필 저장", description: "프로필이 저장되었습니다.", type: "success" });
  }

  // 내 활동 요약(대시보드와 동일 데이터).
  const { data: reviewCount } = useMyReviewPendingCount();
  const { data: myActions } = useMyActionTargets();
  const myRows = myActions ?? [];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const activity = [
    { label: "내 검토 대상", value: reviewCount ?? 0, to: "/quality-events/review", danger: false },
    { label: "진행중 조치", value: myRows.filter((a) => a.status === "in_progress").length, to: "/actions/my", danger: false },
    { label: "지연 조치", value: myRows.filter((a) => a.delayed).length, to: "/actions/my", danger: true },
    {
      label: "이번 달 완료",
      value: myRows.filter(
        (a) => a.status === "completed" && (a.completedDateLabel ?? "").startsWith(thisMonth)
      ).length,
      to: "/actions/completed",
      danger: false,
      positive: true,
    },
  ];

  // 월별 조치 완료(최근 6개월, 고정 창) — 내 완료 조치를 완료월로 집계.
  const monthlyCompletions: MonthlyDatum[] = (() => {
    const byMonth = new Map<string, number>();
    for (const a of myRows) {
      if (a.status !== "completed" || !a.completedDateLabel) continue;
      const m = a.completedDateLabel.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
    }
    const out: MonthlyDatum[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      out.push({ label: `${d.getMonth() + 1}월`, count: byMonth.get(key) ?? 0 });
    }
    return out;
  })();

  // 최근 로그인 내역(데모용 mock). 최신순.
  const loginHistory = (() => {
    const fmt = (daysAgo: number, h: number, m: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      d.setHours(h, m, 0, 0);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    return [
      { at: fmt(0, 9, 12), device: "Chrome · Windows", ip: "192.168.0.14", current: true },
      { at: fmt(1, 18, 22), device: "Chrome · Windows", ip: "192.168.0.14", current: false },
      { at: fmt(2, 9, 5), device: "Safari · macOS", ip: "10.20.1.7", current: false },
      { at: fmt(4, 14, 33), device: "Edge · Windows", ip: "192.168.0.51", current: false },
      { at: fmt(7, 8, 58), device: "Chrome · Android", ip: "172.16.0.9", current: false },
    ];
  })();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* 헤더: 아바타 + 기본 정보 */}
      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
          {currentUser.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">
            {currentUser.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentUser.department} · {currentUser.role}
          </p>
          <p className="text-sm text-muted-foreground">{currentUser.email}</p>
        </div>
      </div>

      {/* 프로필 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>프로필 정보</CardTitle>
          <CardDescription>이름·전화번호·부서를 수정할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            noValidate
            className="flex flex-col gap-4"
          >
            {/* 이메일 — 계정 식별자라 수정 불가 */}
            <Field>
              <FieldLabel htmlFor="my-email">이메일</FieldLabel>
              <InputGroup className="bg-muted/40">
                <InputGroupAddon align="inline-start">
                  <MailIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="my-email"
                  value={currentUser.email}
                  readOnly
                  disabled
                />
              </InputGroup>
            </Field>

            <Controller
              name="name"
              control={profileForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="my-name">이름</FieldLabel>
                  <InputGroup className="bg-white">
                    <InputGroupAddon align="inline-start">
                      <UserIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="my-name"
                      maxLength={10}
                      aria-invalid={fieldState.invalid}
                      placeholder="이름을 입력해 주세요."
                    />
                  </InputGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="phone"
              control={profileForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="my-phone">전화번호</FieldLabel>
                  <InputGroup className="bg-white">
                    <InputGroupAddon align="inline-start">
                      <PhoneIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="my-phone"
                      type="tel"
                      inputMode="numeric"
                      aria-invalid={fieldState.invalid}
                      placeholder="숫자만 입력해 주세요."
                      onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    />
                  </InputGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="department"
              control={profileForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="my-department">부서</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="my-department"
                      className="w-full bg-white"
                      aria-invalid={fieldState.invalid}
                    >
                      <span className="flex items-center gap-2">
                        <BuildingIcon className="size-4 text-muted-foreground" />
                        <SelectValue placeholder="부서를 선택해 주세요." />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {DEPARTMENT_OPTIONS.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* 비밀번호 — 표시는 읽기전용, 변경은 다이얼로그에서 진행 */}
            <Field>
              <FieldLabel htmlFor="my-password">비밀번호</FieldLabel>
              <div className="flex items-center gap-2">
                <InputGroup className="flex-1 bg-muted/40">
                  <InputGroupAddon align="inline-start">
                    <LockIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="my-password"
                    type="password"
                    value="00000000"
                    readOnly
                    disabled
                  />
                </InputGroup>
                <PasswordChangeDialog />
              </div>
            </Field>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  !profileForm.formState.isValid ||
                  !profileForm.formState.isDirty ||
                  profileForm.formState.isSubmitting
                }
              >
                저장
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 내 활동 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>내 활동</CardTitle>
          <CardDescription>
            내 검토·조치 현황입니다. 항목을 누르면 해당 목록으로 이동합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {activity.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => navigate(s.to)}
                className="flex flex-col items-center gap-1 rounded-lg border bg-card px-2 py-3 text-center transition-colors hover:bg-muted/40"
              >
                <span
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    s.danger && s.value > 0
                      ? "text-red-600 dark:text-red-400"
                      : s.positive
                        ? "text-green-600 dark:text-green-400"
                        : "text-foreground"
                  )}
                >
                  {s.value}
                </span>
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  {s.label}
                  <ChevronRightIcon className="size-3" />
                </span>
              </button>
            ))}
          </div>

          {/* 월별 조치 완료 그래프 */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-foreground">
              월별 조치 완료
            </p>
            <MonthlyCompletionChart data={monthlyCompletions} />
          </div>
        </CardContent>
      </Card>

      {/* 최근 로그인 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 로그인 내역</CardTitle>
          <CardDescription>최근 로그인 기록을 최신순으로 보여 줍니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {loginHistory.map((log, i) => (
              <li
                key={i}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    log.current ? "bg-green-500" : "bg-muted-foreground/40"
                  )}
                />
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {log.at}
                </span>
                <span className="min-w-0 flex-1 truncate">{log.device}</span>
                {log.current && (
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-400/15 dark:text-green-300">
                    현재 세션
                  </span>
                )}
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {log.ip}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
