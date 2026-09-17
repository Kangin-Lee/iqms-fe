import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";

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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { toast } from "@/components/ui/toast";
import {
  passwordChangeSchema,
  type PasswordChangeValues,
} from "../schemas";

/**
 * 비밀번호 변경 다이얼로그.
 * 프로필 카드의 "비밀번호 변경" 버튼을 트리거로, 현재/새/확인 비밀번호를 입력받습니다.
 */
export default function PasswordChangeDialog() {
  const [open, setOpen] = useState(false);
  const [revealCurrent, setRevealCurrent] = useState(false);
  const [revealNew, setRevealNew] = useState(false);
  const [revealNewConfirm, setRevealNewConfirm] = useState(false);

  const form = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    },
  });

  // 닫힘 애니메이션 완료 후 폼·표시 상태를 초기화합니다.
  function handleOpenChangeComplete(isOpen: boolean) {
    if (!isOpen) {
      form.reset();
      setRevealCurrent(false);
      setRevealNew(false);
      setRevealNewConfirm(false);
    }
  }

  function onSubmit(values: PasswordChangeValues) {
    // TODO: 실제 비밀번호 변경 API 연동(현재 비밀번호 검증 포함).
    console.log(values);
    toast.add({
      title: "비밀번호 변경",
      description: "비밀번호가 변경되었습니다.",
      type: "success",
    });
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="shrink-0" />
        }
      >
        비밀번호 변경
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>비밀번호 변경</DialogTitle>
          <DialogDescription>
            현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <Controller
            name="currentPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="pw-current">현재 비밀번호</FieldLabel>
                <InputGroup className="bg-white">
                  <InputGroupAddon align="inline-start">
                    <LockIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    {...field}
                    id="pw-current"
                    type={revealCurrent ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                    placeholder="현재 비밀번호"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setRevealCurrent((v) => !v)}
                      aria-label={revealCurrent ? "비밀번호 숨기기" : "비밀번호 표시"}
                    >
                      {revealCurrent ? <EyeOffIcon /> : <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="newPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="pw-new">새 비밀번호</FieldLabel>
                <InputGroup className="bg-white">
                  <InputGroupAddon align="inline-start">
                    <LockIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    {...field}
                    id="pw-new"
                    type={revealNew ? "text" : "password"}
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                    placeholder="영문+숫자+특수문자 8자 이상"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setRevealNew((v) => !v)}
                      aria-label={revealNew ? "비밀번호 숨기기" : "비밀번호 표시"}
                    >
                      {revealNew ? <EyeOffIcon /> : <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="newPasswordConfirm"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="pw-new-confirm">새 비밀번호 확인</FieldLabel>
                <InputGroup className="bg-white">
                  <InputGroupAddon align="inline-start">
                    <LockIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    {...field}
                    id="pw-new-confirm"
                    type={revealNewConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                    placeholder="새 비밀번호를 다시 입력해 주세요."
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setRevealNewConfirm((v) => !v)}
                      aria-label={
                        revealNewConfirm ? "비밀번호 숨기기" : "비밀번호 표시"
                      }
                    >
                      {revealNewConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              취소
            </DialogClose>
            <Button type="submit" disabled={!form.formState.isValid}>
              변경
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
