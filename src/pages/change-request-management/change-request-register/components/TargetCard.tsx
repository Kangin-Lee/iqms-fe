import { Controller, useFormContext } from "react-hook-form";
import { ArrowRightIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TARGET_TYPE_OPTIONS, type ChangeRequestValues } from "../schema";

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

/** 변경 대상 유형 코드 → 라벨(트리거 표시용). */
const TARGET_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TARGET_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export default function TargetCard() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ChangeRequestValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>변경 대상 (형상 항목)</CardTitle>
        <CardDescription>
          변경할 형상항목(문서·도면·부품·시스템)과 리비전을 명시해 변경 이력을
          추적할 수 있게 합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* 변경 대상 유형(4) : 대상 형상항목(8) */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Controller
              name="targetType"
              control={control}
              render={({ field, fieldState }) => (
                <Field
                  className="sm:basis-1/3"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel htmlFor="targetType">
                    변경 대상 유형
                    <RequiredMark />
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="targetType"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      {/* 값이 없으면 placeholder를(muted) 직접 표시합니다. */}
                      <SelectValue>
                        {(v: string) =>
                          v ? (
                            (TARGET_TYPE_LABEL[v] ?? v)
                          ) : (
                            <span className="text-muted-foreground">
                              변경 대상 유형을 선택해 주세요
                            </span>
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>변경 대상 유형</SelectLabel>
                        {TARGET_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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

            <Field
              className="min-w-0 sm:basis-2/3"
              data-invalid={!!errors.targetItem}
            >
              <FieldLabel htmlFor="targetItem">
                대상 형상항목
                <RequiredMark />
              </FieldLabel>
              <Input
                id="targetItem"
                placeholder="예: 위성 카메라 조립도 (DWG-2024-118)"
                aria-invalid={!!errors.targetItem}
                {...register("targetItem")}
              />
              {errors.targetItem && <FieldError errors={[errors.targetItem]} />}
            </Field>
          </div>

          {/* 현재 리비전 → 변경 후 리비전 */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <Field className="min-w-0 flex-1" data-invalid={!!errors.currentRevision}>
              <FieldLabel htmlFor="currentRevision">
                현재 리비전
                <RequiredMark />
              </FieldLabel>
              <Input
                id="currentRevision"
                placeholder="예: Rev.A"
                aria-invalid={!!errors.currentRevision}
                {...register("currentRevision")}
              />
              {errors.currentRevision && (
                <FieldError errors={[errors.currentRevision]} />
              )}
            </Field>

            <ArrowRightIcon className="hidden size-4 shrink-0 text-muted-foreground sm:mb-2.5 sm:block" />

            <Field className="min-w-0 flex-1" data-invalid={!!errors.targetRevision}>
              <FieldLabel htmlFor="targetRevision">
                변경 후 리비전
                <RequiredMark />
              </FieldLabel>
              <Input
                id="targetRevision"
                placeholder="예: Rev.B"
                aria-invalid={!!errors.targetRevision}
                {...register("targetRevision")}
              />
              {errors.targetRevision && (
                <FieldError errors={[errors.targetRevision]} />
              )}
            </Field>
          </div>

          {/* 관련 프로젝트 / 제품 / 프로세스 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="relatedProject">관련 프로젝트</FieldLabel>
              <Input
                id="relatedProject"
                placeholder="관련 프로젝트"
                {...register("relatedProject")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="relatedProduct">관련 제품/서비스</FieldLabel>
              <Input
                id="relatedProduct"
                placeholder="관련 제품/서비스"
                {...register("relatedProduct")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="relatedProcess">관련 업무/프로세스</FieldLabel>
              <Input
                id="relatedProcess"
                placeholder="관련 업무/프로세스"
                {...register("relatedProcess")}
              />
            </Field>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
