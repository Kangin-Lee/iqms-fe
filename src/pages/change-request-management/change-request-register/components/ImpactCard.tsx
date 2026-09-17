import { Controller, useFormContext } from "react-hook-form";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  IMPACT_LEVEL_OPTIONS,
  IMPACT_SCOPE_OPTIONS,
  YES_NO_OPTIONS,
  type ChangeRequestValues,
} from "../schema";

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

type RadioName =
  | "qualityImpact"
  | "scheduleImpact"
  | "costImpact"
  | "revalidationRequired"
  | "customerApprovalRequired"
  | "urgent";

function RadioField({
  name,
  label,
  options,
}: {
  name: RadioName;
  label: string;
  options: readonly string[];
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
            {options.map((opt) => (
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

export default function ImpactCard() {
  const { control } = useFormContext<ChangeRequestValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>영향 분석</CardTitle>
        <CardDescription>
          변경이 미치는 영향 범위와 정도를 평가합니다. 놓친 영향이 없는지 꼼꼼히
          점검해 주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* 영향 범위 (체크박스, 다중) */}
          <Controller
            name="impactScope"
            control={control}
            render={({ field, fieldState }) => {
              const value = field.value ?? [];
              const toggle = (opt: string, checked: boolean) => {
                field.onChange(
                  checked
                    ? [...value, opt]
                    : value.filter((v) => v !== opt)
                );
              };
              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>
                    영향 범위
                    <RequiredMark />
                  </FieldLabel>
                  <div
                    className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3 sm:grid-cols-4 aria-invalid:border-destructive"
                    aria-invalid={fieldState.invalid}
                  >
                    {IMPACT_SCOPE_OPTIONS.map((opt) => (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={value.includes(opt)}
                          onCheckedChange={(checked) =>
                            toggle(opt, checked === true)
                          }
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              );
            }}
          />

          {/* 품질 / 일정 / 원가 영향 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <RadioField
              name="qualityImpact"
              label="품질 영향"
              options={IMPACT_LEVEL_OPTIONS}
            />
            <RadioField
              name="scheduleImpact"
              label="일정 영향"
              options={IMPACT_LEVEL_OPTIONS}
            />
            <RadioField
              name="costImpact"
              label="원가 영향"
              options={IMPACT_LEVEL_OPTIONS}
            />
          </div>

          {/* 재검증 / 고객승인 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RadioField
              name="revalidationRequired"
              label="재검증·재인증 필요"
              options={YES_NO_OPTIONS}
            />
            <RadioField
              name="customerApprovalRequired"
              label="고객·규제 승인 필요"
              options={YES_NO_OPTIONS}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
