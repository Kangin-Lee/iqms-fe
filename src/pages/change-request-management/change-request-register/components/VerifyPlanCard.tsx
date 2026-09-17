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

export default function VerifyPlanCard() {
  const { control, register } = useFormContext<ChangeRequestValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>검증 계획</CardTitle>
        <CardDescription>
          변경 적용 후 정상 동작·효과를 어떻게 검증할지 계획합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* 검증 담당자 / 검증 예정일 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="verifyAssignee"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="verifyAssignee">검증 담당자</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="verifyAssignee" className="w-full">
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
                        <SelectLabel>검증 담당자</SelectLabel>
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
              name="verifyDate"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="verifyDate">검증 예정일</FieldLabel>
                  <DatePicker
                    id="verifyDate"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={fieldState.invalid}
                    placeholder="검증 예정일 선택"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {/* 검증 방법 / 검증 기준 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="verifyMethod">검증 방법</FieldLabel>
              <Textarea
                id="verifyMethod"
                rows={4}
                placeholder="검증 방법을 입력해 주세요."
                className="min-h-24"
                {...register("verifyMethod")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="verifyCriteria">검증 기준</FieldLabel>
              <Textarea
                id="verifyCriteria"
                rows={4}
                placeholder="검증 기준을 입력해 주세요."
                className="min-h-24"
                {...register("verifyCriteria")}
              />
            </Field>
          </div>

          {/* 검증 증적 필요 여부 */}
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <Controller
              name="verifyEvidenceNeeded"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="verifyEvidenceNeeded">
                    검증 증적 필요 여부
                    <RequiredMark />
                  </FieldLabel>
                  <RadioGroup
                    id="verifyEvidenceNeeded"
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
