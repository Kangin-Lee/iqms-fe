import { XIcon } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";

import ReviewerSelectDialog from "@/components/common/ReviewerSelectDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { reviewers } from "@/mock/reviewers";
import type { ChangeRequestValues } from "../schema";

function PeoplePicker({
  name,
  label,
  emptyText,
}: {
  name: "reviewers" | "approvers";
  label: string;
  emptyText: string;
}) {
  const { control } = useFormContext<ChangeRequestValues>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const value = field.value ?? [];
        const selected = reviewers.filter((r) => value.includes(r.id));
        return (
          <Field>
            <FieldLabel>{label}</FieldLabel>
            <div className="flex flex-col gap-2">
              <ReviewerSelectDialog
                people={reviewers}
                value={value}
                onChange={field.onChange}
              />
              {selected.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {selected.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{r.name}</span>{" "}
                        <span className="text-muted-foreground">
                          {r.teamName} · {r.positionName}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`${r.name} 삭제`}
                        onClick={() =>
                          field.onChange(value.filter((x) => x !== r.id))
                        }
                      >
                        <XIcon />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{emptyText}</p>
              )}
            </div>
          </Field>
        );
      }}
    />
  );
}

export default function ApprovalCard() {
  const { register } = useFormContext<ChangeRequestValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>승인·검토 정보</CardTitle>
        <CardDescription>
          변경을 검토·승인할 담당자를 지정합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PeoplePicker
              name="reviewers"
              label="검토자"
              emptyText="선택된 검토자가 없습니다."
            />
            <PeoplePicker
              name="approvers"
              label="승인자"
              emptyText="선택된 승인자가 없습니다."
            />
          </div>

          <Field>
            <FieldLabel htmlFor="requestComment">접수 의견</FieldLabel>
            <Textarea
              id="requestComment"
              rows={3}
              placeholder="접수 의견을 자유롭게 작성해 주세요."
              {...register("requestComment")}
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
