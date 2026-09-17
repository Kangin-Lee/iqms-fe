import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, LockIcon, UserIcon } from "lucide-react";

import {
  Field,
  FieldContent,
  FieldDescription,
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { loginSchema, type LoginValues } from "../loginSchema";
import { useNavigate } from "react-router";



export default function LoginForm() {
  const [reveal, setReveal] = useState(false);
  const navigate = useNavigate();
  
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { userId: "", password: "", keepSignedIn: false },
  });

  async function onSubmit(values: LoginValues) {
    //   const res = await signIn(values);           // 실제 인증 호출
    //   if (res.code === "INVALID_CREDENTIALS") {
    //     form.setError("password", {
    //       type: "server",
    //       message: "아이디 또는 비밀번호가 올바르지 않습니다.",
    //     });
    //     return;
    //   }
    //   if (res.code === "LOCKED") {
    //     form.setError("root", {
    //       type: "server",
    //       message: "5회 이상 실패로 잠금되었습니다. 관리자에게 문의하세요.",
    //     });
    //   }
    navigate("/");
        console.log(values);
  }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {/* 아이디 — InputGroup으로 앞에 아이콘 */}
        <Controller
          name="userId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-userId">아이디</FieldLabel>
              <InputGroup className="bg-white">
                <InputGroupAddon align="inline-start">
                  <UserIcon />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id="login-userId"
                  autoComplete="username"
                  aria-invalid={fieldState.invalid}
                  placeholder="아이디를 입력해주세요."
                />
              </InputGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* 비밀번호 — InputGroup으로 뒤에 표시 토글 버튼 */}
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">비밀번호</FieldLabel>
              <InputGroup className="bg-white">
                <InputGroupAddon align="inline-start">
                  <LockIcon />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id="login-password"
                  type={reveal ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  placeholder="비밀번호를 입력해주세요."
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setReveal((v) => !v)}
                    aria-label={reveal ? "비밀번호 숨기기" : "비밀번호 표시"}
                  >
                    {reveal ? <EyeOffIcon /> : <EyeIcon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* 로그인 유지 — 가로 배치 */}
        <Controller
          name="keepSignedIn"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="login-keep">로그인 유지</FieldLabel>
                <FieldDescription>
                  공용 PC에서는 사용하지 마세요.
                </FieldDescription>
              </FieldContent>
              <Switch
                id="login-keep"
                name={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
                className="cursor-pointer"
              />
            </Field>
          )}
        />

        {/* 폼 전체 에러 (root) */}
        {form.formState.errors.root && (
          <FieldError errors={[form.formState.errors.root]} />
        )}

        <Button
          type="submit"
          disabled={!form.formState.isValid || form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "로그인 중…" : "로그인"}
        </Button>
      </FieldGroup>
    </form>
  );
}
