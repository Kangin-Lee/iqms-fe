import { useFormContext } from "react-hook-form";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { ChangeRequestValues } from "../schema";

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

export default function ContentCard() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ChangeRequestValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>변경 내용</CardTitle>
        <CardDescription>
          변경이 필요한 이유와 현재 문제점, 변경 후 기대효과를 작성합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* 변경 요청 사유 (필수) */}
          <Field data-invalid={!!errors.reason}>
            <FieldLabel htmlFor="reason">
              변경 요청 사유
              <RequiredMark />
            </FieldLabel>
            <Textarea
              id="reason"
              rows={4}
              placeholder="변경이 필요한 이유를 입력해 주세요."
              className="min-h-24"
              aria-invalid={!!errors.reason}
              {...register("reason")}
            />
            {errors.reason && <FieldError errors={[errors.reason]} />}
          </Field>

          {/* 현재 문제점 */}
          <Field>
            <FieldLabel htmlFor="asIs">현재 문제점</FieldLabel>
            <Textarea
              id="asIs"
              rows={4}
              placeholder="현재 상태의 문제를 입력해 주세요"
              className="min-h-24"
              {...register("asIs")}
            />
          </Field>

          {/* 기대효과 */}
          <Field>
            <FieldLabel htmlFor="toBe">기대효과</FieldLabel>
            <Textarea
              id="toBe"
              rows={4}
              placeholder="변경 후 개선 효과를 입력해 주세요"
              className="min-h-24"
              {...register("toBe")}
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
