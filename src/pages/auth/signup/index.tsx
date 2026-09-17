import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import {
  BuildingIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
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
import {
  DEPARTMENT_OPTIONS,
  EMAIL_DOMAIN,
  signupSchema,
  type SignupValues,
} from "./signupSchema";

/** 입력값을 010-1234-5678 형태로 자동 포맷(숫자만 남겨 3-4-4로 하이픈 삽입). */
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 11)]
    .filter(Boolean)
    .join("-");
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [revealPw, setRevealPw] = useState(false);
  const [revealPwConfirm, setRevealPwConfirm] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      emailId: "",
      password: "",
      passwordConfirm: "",
      name: "",
      phone: "",
      department: "",
    },
  });

  async function onSubmit(values: SignupValues) {
    // 전체 이메일은 로컬 파트 + 고정 도메인으로 구성합니다.
    const payload = { ...values, email: `${values.emailId}@${EMAIL_DOMAIN}` };
    // TODO: 실제 회원가입 API 연동. 서버 오류는 form.setError로 필드에 매핑.
    console.log(payload);
    navigate("/login");
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight">Create Your Account</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Sign up to get started with IQMS.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {/* 이메일 — 로컬 파트 입력 + 고정 도메인 표시 */}
            <Controller
              name="emailId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signup-email">이메일</FieldLabel>
                  <div className="flex items-center gap-2">
                    <InputGroup className="flex-1 bg-white">
                      <InputGroupAddon align="inline-start">
                        <MailIcon />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="signup-email"
                        autoComplete="username"
                        aria-invalid={fieldState.invalid}
                        placeholder="example"
                      />
                    </InputGroup>
                    <span className="shrink-0 text-sm font-medium text-foreground">
                      @{EMAIL_DOMAIN}
                    </span>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* 비밀번호 */}
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signup-password">비밀번호</FieldLabel>
                  <InputGroup className="bg-white">
                    <InputGroupAddon align="inline-start">
                      <LockIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="signup-password"
                      type={revealPw ? "text" : "password"}
                      autoComplete="new-password"
                      aria-invalid={fieldState.invalid}
                      placeholder="영문+숫자+특수문자 8자 이상"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setRevealPw((v) => !v)}
                        aria-label={revealPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                      >
                        {revealPw ? <EyeOffIcon /> : <EyeIcon />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* 비밀번호 재확인 */}
            <Controller
              name="passwordConfirm"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signup-passwordConfirm">
                    비밀번호 재확인
                  </FieldLabel>
                  <InputGroup className="bg-white">
                    <InputGroupAddon align="inline-start">
                      <LockIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="signup-passwordConfirm"
                      type={revealPwConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      aria-invalid={fieldState.invalid}
                      placeholder="비밀번호를 재확인해 주세요."
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setRevealPwConfirm((v) => !v)}
                        aria-label={
                          revealPwConfirm ? "비밀번호 숨기기" : "비밀번호 표시"
                        }
                      >
                        {revealPwConfirm ? <EyeOffIcon /> : <EyeIcon />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* 이름 */}
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signup-name">이름</FieldLabel>
                  <InputGroup className="bg-white">
                    <InputGroupAddon align="inline-start">
                      <UserIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="signup-name"
                      autoComplete="name"
                      maxLength={10}
                      aria-invalid={fieldState.invalid}
                      placeholder="이름을 입력해 주세요. (10자 이하)"
                    />
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* 전화번호 — 입력 시 자동으로 하이픈 삽입 */}
            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signup-phone">전화번호</FieldLabel>
                  <InputGroup className="bg-white">
                    <InputGroupAddon align="inline-start">
                      <PhoneIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="signup-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      aria-invalid={fieldState.invalid}
                      placeholder="숫자만 입력해 주세요."
                      onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    />
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* 부서 */}
            <Controller
              name="department"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signup-department">부서</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="signup-department"
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {form.formState.errors.root && (
              <FieldError errors={[form.formState.errors.root]} />
            )}

            <Button
              type="submit"
              className="mt-1"
              disabled={!form.formState.isValid || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "가입 중…" : "회원가입"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link
                to="/login"
                className="font-medium text-foreground hover:underline"
              >
                로그인
              </Link>
            </p>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}
