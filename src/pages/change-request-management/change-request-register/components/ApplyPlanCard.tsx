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
import { Textarea } from "@/components/ui/textarea";
import { reviewers } from "@/mock/reviewers";
import { NEED_OPTIONS, type ChangeRequestValues } from "../schema";

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

/** 필요/불필요 라디오 필드. */
function NeedRadioField({
  name,
  label,
}: {
  name: "rollbackNeeded" | "deployNeeded";
  label: string;
}) {
  const { control } = useFormContext<ChangeRequestValues>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>
            {label}
            <RequiredMark />
          </FieldLabel>
          <RadioGroup
            id={name}
            value={field.value}
            onValueChange={field.onChange}
            aria-invalid={fieldState.invalid}
            className="flex min-h-9 flex-row flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border px-3 py-2 aria-invalid:border-destructive"
          >
            {NEED_OPTIONS.map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <RadioGroupItem value={opt} />
                {opt}
              </label>
            ))}
          </RadioGroup>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export default function ApplyPlanCard() {
  const { control, register } = useFormContext<ChangeRequestValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>적용 계획</CardTitle>
        <CardDescription>
          변경을 언제·누가·어떻게 적용할지와 롤백·배포 필요 여부를 계획합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* 적용 담당자 / 적용 예정일 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="applyAssignee"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="applyAssignee">적용 담당자</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="applyAssignee" className="w-full">
                      <SelectValue>
                        {(v: string) =>
                          v ? (
                            v
                          ) : (
                            <span className="text-muted-foreground">
                              담당자를 선택해 주세요
                            </span>
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>적용 담당자</SelectLabel>
                        {reviewers.map((r) => (
                          <SelectItem key={r.id} value={r.name}>
                            {r.name} · {r.teamName} {r.positionName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              name="applyDate"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="applyDate">적용 예정일</FieldLabel>
                  <DatePicker
                    id="applyDate"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={fieldState.invalid}
                    placeholder="적용 예정일 선택"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {/* 적용 방법 */}
          <Field>
            <FieldLabel htmlFor="applyMethod">적용 방법</FieldLabel>
            <Textarea
              id="applyMethod"
              rows={4}
              placeholder="변경 수행 방법을 입력해 주세요"
              className="min-h-24"
              {...register("applyMethod")}
            />
          </Field>

          {/* 롤백 필요 여부 / 배포 필요 여부 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NeedRadioField name="rollbackNeeded" label="롤백 필요 여부" />
            <NeedRadioField name="deployNeeded" label="배포 필요 여부" />
          </div>

          {/* 비고 */}
          <Field>
            <FieldLabel htmlFor="applyNote">비고</FieldLabel>
            <Textarea
              id="applyNote"
              rows={3}
              placeholder="추가 설명을 입력해 주세요"
              {...register("applyNote")}
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
