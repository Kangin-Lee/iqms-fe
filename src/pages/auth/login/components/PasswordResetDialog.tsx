import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheckIcon, MailIcon } from "lucide-react";
import z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const resetSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해 주세요.")
    .email("올바른 이메일 형식이 아닙니다."),
});
type ResetValues = z.infer<typeof resetSchema>;

/**
 * 비밀번호 재설정 다이얼로그.
 * 가입 시 사용한 이메일을 입력하면 재설정 링크를 보냈다는 안내를 표시합니다.
 */
export default function PasswordResetDialog() {
  const [open, setOpen] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    mode: "onChange",
    defaultValues: { email: "" },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  // 닫힘 애니메이션이 끝난 뒤에 초기화합니다.
  // (닫는 도중 초기화하면 성공 화면이 입력 화면으로 바뀌며 모달이 하나 더 있는 것처럼 보임)
  function handleOpenChangeComplete(isOpen: boolean) {
    if (!isOpen) {
      setSentEmail(null);
      form.reset();
    }
  }

  function onSubmit(values: ResetValues) {
    // TODO: 실제 재설정 메일 발송 API 연동.
    setSentEmail(values.email);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          />
        }
      >
        비밀번호 찾기
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {sentEmail ? (
          // 발송 완료 안내
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-400/15 dark:text-green-300">
              <MailCheckIcon className="size-6" />
            </span>
            <DialogTitle>재설정 링크를 보냈습니다</DialogTitle>
            <DialogDescription>
              <span className="font-medium break-all text-foreground">
                {sentEmail}
              </span>
              {" "}으로
              <br />
              비밀번호 재설정 링크를 보냈습니다. 메일함을 확인해 주세요.
            </DialogDescription>
            <DialogClose
              render={<Button type="button" className="mt-2 w-full" />}
            >
              확인
            </DialogClose>
          </div>
        ) : (
          // 이메일 입력
          <>
            <DialogHeader>
              <DialogTitle>비밀번호 재설정</DialogTitle>
              <DialogDescription>
                가입 시 사용한 이메일을 입력하면 재설정 링크를 보내드립니다.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-4"
            >
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="reset-email">이메일</FieldLabel>
                    <InputGroup className="bg-white">
                      <InputGroupAddon align="inline-start">
                        <MailIcon />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        aria-invalid={fieldState.invalid}
                        placeholder="가입 시 사용한 이메일"
                      />
                    </InputGroup>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <DialogFooter>
                <DialogClose
                  render={<Button type="button" variant="outline" />}
                >
                  취소
                </DialogClose>
                <Button type="submit" disabled={!form.formState.isValid}>
                  재설정 링크 보내기
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
