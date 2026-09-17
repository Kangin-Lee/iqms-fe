import { Controller, useFormContext } from "react-hook-form";

import DatePicker from "@/components/common/DatePicker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHANGE_TYPE_OPTIONS,
  GRADE_OPTIONS,
  type ChangeRequestValues,
} from "../schema";

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

/** 변경 구분 코드 → 라벨(트리거 표시용). */
const CHANGE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CHANGE_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export default function BasicInfoCard() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ChangeRequestValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>기본 정보</CardTitle>
        <CardDescription>
          변경요청을 식별하기 위한 기본 정보입니다. 누가·언제·어떤 구분의 변경을
          언제까지 완료하려는지 기록합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* 요청자 / 요청부서 / 요청일 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="requester">요청자</FieldLabel>
              <Input
                id="requester"
                readOnly
                className="bg-muted text-muted-foreground"
                {...register("requester")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="requestDepartment">요청부서</FieldLabel>
              <Input
                id="requestDepartment"
                readOnly
                className="bg-muted text-muted-foreground"
                {...register("requestDepartment")}
              />
            </Field>
            <Controller
              name="requestDate"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="requestDate">
                    요청일
                    <RequiredMark />
                  </FieldLabel>
                  <DatePicker
                    id="requestDate"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={fieldState.invalid}
                    placeholder="요청일 선택"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {/* 변경요청 제목 (한 줄) */}
          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="title">
              변경요청 제목
              <RequiredMark />
            </FieldLabel>
            <Input
              id="title"
              placeholder="변경요청 제목을 입력해 주세요."
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title && <FieldError errors={[errors.title]} />}
          </Field>

          {/* 변경 구분 / 긴급 여부 / 희망 완료일 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* 변경 구분 */}
            <Controller
              name="changeType"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="changeType">
                    변경 구분
                    <RequiredMark />
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="changeType"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      {/* 값이 없으면 placeholder 문구를(muted) 직접 표시합니다. */}
                      <SelectValue>
                        {(v: string) =>
                          v ? (
                            (CHANGE_TYPE_LABEL[v] ?? v)
                          ) : (
                            <span className="text-muted-foreground">
                              변경 구분을 선택해 주세요
                            </span>
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>변경 구분</SelectLabel>
                        {CHANGE_TYPE_OPTIONS.map((opt) => (
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

            {/* 긴급 여부 */}
            <Controller
              name="grade"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="grade">
                    긴급 여부
                    <RequiredMark />
                  </FieldLabel>
                  <RadioGroup
                    id="grade"
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                    className="flex min-h-9 flex-row flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border px-3 py-2 aria-invalid:border-destructive"
                  >
                    {GRADE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <RadioGroupItem value={opt.value} />
                        {opt.label}
                      </label>
                    ))}
                  </RadioGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* 희망 완료일 */}
            <Controller
              name="requestedApplyDate"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="requestedApplyDate">
                    희망 완료일
                    <RequiredMark />
                  </FieldLabel>
                  <DatePicker
                    id="requestedApplyDate"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={fieldState.invalid}
                    placeholder="희망 완료일 선택"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
