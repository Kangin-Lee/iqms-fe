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
import type { RegisterValues } from "../schema";

export default function ReceiptCard() {
  const { control, register } = useFormContext<RegisterValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>접수 처리</CardTitle>
        <CardDescription>
          등록된 이벤트를 누가 검토할지 지정하고 접수 단계를 마무리하는 영역입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Controller
            name="reviewers"
            control={control}
            render={({ field }) => {
              const value = field.value ?? [];
              const selected = reviewers.filter((r) => value.includes(r.id));
              return (
                <Field>
                  <FieldLabel>검토자</FieldLabel>
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
                      <p className="text-sm text-muted-foreground">
                        선택된 검토자가 없습니다.
                      </p>
                    )}
                  </div>
                </Field>
              );
            }}
          />

          <Field>
            <FieldLabel htmlFor="registrationComment">등록 의견</FieldLabel>
            <Textarea
              id="registrationComment"
              rows={3}
              placeholder="등록 의견을 자유롭게 작성해 주세요."
              {...register("registrationComment")}
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
