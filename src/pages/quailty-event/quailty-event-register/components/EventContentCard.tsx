import { PaperclipIcon, XIcon } from "lucide-react";
import { useRef } from "react";
import { Controller, useFormContext } from "react-hook-form";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RegisterValues } from "../schema";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EventContentCard() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<RegisterValues>();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>이벤트 내용</CardTitle>
        <CardDescription>
          실제로 발생하거나 발견된 문제를 구체적으로 기술하고, 관련 대상과 근거
          자료를 남기는 영역입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* 발생/발견 내용 (필수) */}
          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="description">
              발생/발견 내용
              <span className="text-destructive"> *</span>
            </FieldLabel>
            <Textarea
              id="description"
              rows={8}
              placeholder="발생 또는 발견한 내용을 입력해 주세요."
              className="min-h-40"
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description && <FieldError errors={[errors.description]} />}
          </Field>

          {/* 관련 프로젝트 / 제품·서비스 / 업무·프로세스 */}
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

          {/* 첨부파일 */}
          <Controller
            name="attachments"
            control={control}
            render={({ field }) => {
              const files = field.value ?? [];

              const addFiles = (list: FileList | null) => {
                if (!list?.length) return;
                field.onChange([...files, ...Array.from(list)]);
              };
              const removeAt = (index: number) => {
                field.onChange(files.filter((_, i) => i !== index));
              };

              return (
                <Field>
                  <FieldLabel>첨부파일</FieldLabel>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={inputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = ""; // 같은 파일 재선택 허용
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-fit"
                      onClick={() => inputRef.current?.click()}
                    >
                      <PaperclipIcon />
                      파일 첨부
                    </Button>

                    {files.length > 0 && (
                      <AttachmentGroup>
                        {files.map((file, index) => (
                          <Attachment key={`${file.name}-${index}`}>
                            <AttachmentMedia>
                              <PaperclipIcon />
                            </AttachmentMedia>
                            <AttachmentContent>
                              <AttachmentTitle>{file.name}</AttachmentTitle>
                              <AttachmentDescription>
                                {formatSize(file.size)}
                              </AttachmentDescription>
                            </AttachmentContent>
                            <AttachmentActions>
                              <AttachmentAction
                                aria-label={`${file.name} 삭제`}
                                onClick={() => removeAt(index)}
                              >
                                <XIcon />
                              </AttachmentAction>
                            </AttachmentActions>
                          </Attachment>
                        ))}
                      </AttachmentGroup>
                    )}
                  </div>
                </Field>
              );
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
