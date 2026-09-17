import { useRef, useState, type ChangeEvent } from "react";
import { format } from "date-fns";
import {
  FileIcon,
  PaperclipIcon,
  RefreshCwIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

import { useMutation } from "@tanstack/react-query";

import DatePicker from "@/components/common/DatePicker";
import { geminiSuggestCapaPlan } from "@/lib/gemini";
import type { QualityEvent } from "@/pages/quailty-event/queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { reviewers } from "@/mock/reviewers";
import {
  CAPA_PLAN_TYPE_NAME,
  type CapaPlanType,
} from "../../capa-management/queries";

export type CapaPlanInput = {
  title: string;
  type: CapaPlanType;
  dueDateLabel: string;
  assignee: string;
  content: string;
  files: File[];
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type CapaPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** AI 계획 초안 추천 대상. */
  event: QualityEvent;
  onConfirm: (input: CapaPlanInput) => void;
};

const TYPE_OPTIONS = Object.entries(CAPA_PLAN_TYPE_NAME) as [
  CapaPlanType,
  string,
][];

/** CAPA 계획 등록 모달. 제목·유형·완료일·담당자·내용을 입력합니다. */
export default function CapaPlanDialog({
  open,
  onOpenChange,
  event,
  onConfirm,
}: CapaPlanDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CapaPlanType | "">("");
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [assignee, setAssignee] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle("");
      setType("");
      setDueDate(new Date());
      setAssignee("");
      setContent("");
      setFiles([]);
    }
  }

  // AI 계획 초안 추천(폼 채우기). 키 없거나 실패 시 규칙 기반 초안으로 폴백.
  const draft = useMutation({
    mutationFn: () => geminiSuggestCapaPlan(event),
  });

  function suggestDraft() {
    draft.mutate(undefined, {
      onSuccess: (result) => {
        setType(result.type);
        setTitle(result.title);
        setContent(result.content);
      },
    });
  }

  function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files;
    if (picked?.length) setFiles((prev) => [...prev, ...Array.from(picked)]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const disabled =
    !title.trim() || !type || !dueDate || !assignee || !content.trim();

  function submit() {
    if (!type || !dueDate || disabled) return;
    onConfirm({
      title: title.trim(),
      type,
      dueDateLabel: format(dueDate, "yyyy-MM-dd"),
      assignee,
      content: content.trim(),
      files,
    });
    toast.add({
      title: "CAPA 계획 등록",
      description: "CAPA 계획을 등록했습니다.",
      type: "success",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>CAPA 계획 등록</DialogTitle>
          <DialogDescription>CAPA 계획 정보를 입력해 주세요.</DialogDescription>
        </DialogHeader>

        {/* AI 계획 초안 추천 — 유형·제목·내용을 채웁니다(참고용, 담당자가 검토·수정). */}
        <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={suggestDraft}
            disabled={draft.isPending}
          >
            {draft.isPending ? (
              <>
                <RefreshCwIcon className="animate-spin" />
                AI 초안 생성 중…
              </>
            ) : (
              <>
                <SparklesIcon />
                AI로 계획 초안 제안
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            부적합 내용을 바탕으로 유형·제목·내용 초안을 채웁니다. 최종 계획은
            담당자가 검토·수정해 등록하세요.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">CAPA 제목</span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="CAPA 제목을 입력해 주세요."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">CAPA 유형</span>
            <Select
              value={type}
              onValueChange={(value) => setType((value as CapaPlanType) ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) =>
                    value
                      ? CAPA_PLAN_TYPE_NAME[value as CapaPlanType]
                      : "유형을 선택해 주세요."
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>CAPA 유형</SelectLabel>
                  {TYPE_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">계획 완료일</span>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="완료일 선택"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">담당자</span>
          <Select
            value={assignee}
            onValueChange={(value) => setAssignee(value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value) => (value ? String(value) : "담당자를 선택해 주세요.")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>담당자</SelectLabel>
                {reviewers.map((r) => (
                  <SelectItem key={r.id} value={r.name}>
                    {r.name} · {r.teamName} {r.positionName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">CAPA 계획 내용</span>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="CAPA 계획 내용을 입력해 주세요."
            className="min-h-24 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">첨부파일</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilePick}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon />
            파일 선택
          </Button>

          {files.length > 0 && (
            <ul className="flex flex-col gap-1">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs"
                >
                  <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label={`${file.name} 제거`}
                    className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" onClick={submit} disabled={disabled}>
            등록
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
