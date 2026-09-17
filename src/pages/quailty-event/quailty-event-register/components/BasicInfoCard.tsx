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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_TYPE_OPTIONS, type RegisterValues } from "../schema";

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

export default function BasicInfoCard() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<RegisterValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>기본 정보</CardTitle>
        <CardDescription>
          품질 이벤트를 식별하기 위한 기본 정보입니다. 언제·누가·어떤 유형의
          이벤트인지 기록합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* 등록자 / 등록부서 (맨 위, 읽기 전용) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="registrant">등록자</FieldLabel>
              <Input
                id="registrant"
                readOnly
                className="bg-muted text-muted-foreground"
                {...register("registrant")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="registrationDepartment">등록부서</FieldLabel>
              <Input
                id="registrationDepartment"
                readOnly
                className="bg-muted text-muted-foreground"
                {...register("registrationDepartment")}
              />
            </Field>
          </div>

          {/* 발견일 / 발생일 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="discoveryDate"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="discoveryDate">
                    발견일
                    <RequiredMark />
                  </FieldLabel>
                  <DatePicker
                    id="discoveryDate"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={fieldState.invalid}
                    placeholder="발견일 선택"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="occurrenceDate"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="occurrenceDate">
                    발생일
                    <RequiredMark />
                  </FieldLabel>
                  <DatePicker
                    id="occurrenceDate"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={fieldState.invalid}
                    placeholder="발생일 선택"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {/* 이벤트 유형(4) : 이벤트 제목(6) — 한 줄 */}
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* 이벤트 유형 (dropdown) — 40% */}
            <Controller
              name="eventType"
              control={control}
              render={({ field, fieldState }) => (
                <Field
                  className="sm:basis-[25%]"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel htmlFor="eventType">
                    이벤트 유형
                    <RequiredMark />
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="eventType"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue>
                        {(value) =>
                          value
                            ? EVENT_TYPE_OPTIONS.find((o) => o.value === value)
                                ?.label
                            : "선택"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>이벤트 유형</SelectLabel>
                        {EVENT_TYPE_OPTIONS.map((opt) => (
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

            {/* 이벤트 제목 — 60% */}
            <Field
              className="min-w-0 sm:basis-[75%]"
              data-invalid={!!errors.title}
            >
              <FieldLabel htmlFor="title">
                이벤트 제목
                <RequiredMark />
              </FieldLabel>
              <Input
                id="title"
                placeholder="이벤트 제목을 입력해 주세요."
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              {errors.title && <FieldError errors={[errors.title]} />}
            </Field>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
