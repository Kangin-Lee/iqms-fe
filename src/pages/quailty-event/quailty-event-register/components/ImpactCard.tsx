import { Controller, useFormContext } from "react-hook-form";

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
  BUSINESS_IMPACT_OPTIONS,
  IMMEDIATE_ACTION_OPTIONS,
  SEVERITY_OPTIONS,
  type RegisterValues,
} from "../schema";

type RadioFieldProps = {
  name: "businessImpact" | "severity" | "immediateActionRequired";
  label: string;
  options: readonly string[];
};

function RadioField({ name, label, options }: RadioFieldProps) {
  const { control } = useFormContext<RegisterValues>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>
            {label}
            <span className="text-destructive"> *</span>
          </FieldLabel>
          <RadioGroup
            id={name}
            value={field.value}
            onValueChange={(value) => field.onChange(value)}
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>초기 영향 판단</CardTitle>
        <CardDescription>
          이벤트가 업무·품질에 미치는 영향과 심각도를 초기에 평가하고, 즉시 조치가
          필요한지 판단하는 영역입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1.4fr_1fr]">
          <RadioField
            name="businessImpact"
            label="업무/품질 영향"
            options={BUSINESS_IMPACT_OPTIONS}
          />
          <RadioField
            name="severity"
            label="심각도"
            options={SEVERITY_OPTIONS}
          />
          <RadioField
            name="immediateActionRequired"
            label="즉시 조치 필요 여부"
            options={IMMEDIATE_ACTION_OPTIONS}
          />
        </div>
      </CardContent>
    </Card>
  );
}
