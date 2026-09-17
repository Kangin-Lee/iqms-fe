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
import { reviewers } from "@/mock/reviewers";
import {
  CAPA_ACTION_PRIORITY_NAME,
  CAPA_PLAN_TYPE_NAME,
  type CapaActionPriority,
  type CapaPlanType,
} from "../../queries";

export type ActionPlanInput = {
  type: CapaPlanType;
  title: string;
  content: string;
  department: string;
  assignee: string;
  dueDateLabel: string;
  priority: CapaActionPriority;
  files: File[];
};

const TYPE_OPTIONS = Object.entries(CAPA_PLAN_TYPE_NAME) as [
  CapaPlanType,
  string,
][];
const PRIORITY_OPTIONS = Object.entries(CAPA_ACTION_PRIORITY_NAME) as [
  CapaActionPriority,
  string,
][];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ActionPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** AI 초안 제안 대상(연결 품질 이벤트). */
  event: QualityEvent | null;
  onConfirm: (input: ActionPlanInput) => void;
};

/**
 * 시정/예방조치 등록 모달.
 * 구분·제목·내용·담당부서·담당자·기한·우선순위·첨부파일을 입력합니다.
 * AI 초안 제안(계획/제안 성격)으로 구분·제목·내용을 채운 뒤 담당자가 검토·수정합니다.
 */
export default function ActionPlanDialog({
  open,
  onOpenChange,
  event,
  onConfirm,
}: ActionPlanDialogProps) {
  const [type, setType] = useState<CapaPlanType | "">("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [priority, setPriority] = useState<CapaActionPriority | "">("");
  const [files, setFiles] = useState<File[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setType("");
      setTitle("");
      setContent("");
      setAssignee("");
      setDueDate(new Date());
      setPriority("");
      setFiles([]);
    }
  }

  // AI 조치 초안 추천(구분·제목·내용 채우기). 실패 시 규칙 기반 초안으로 폴백.
  const draft = useMutation({
    mutationFn: () => {
      if (!event) throw new Error("연결된 품질 이벤트가 없습니다.");
      return geminiSuggestCapaPlan(event);
    },
  });

  function suggestDraft() {
    draft.mutate(undefined, {
      onSuccess: (result) => {
        setType(result.type);
        setTitle(result.title);
        setContent(result.content);
        if (result.priority) setPriority(result.priority);
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
    !type || !title.trim() || !content.trim() || !assignee || !dueDate || !priority;

  function submit() {
    if (!type || !priority || !dueDate || disabled) return;
    // 담당부서는 선택한 담당자의 소속 팀에서 파생합니다.
    const department =
      reviewers.find((r) => r.name === assignee)?.teamName ?? "";
    onConfirm({
      type,
      title: title.trim(),
      content: content.trim(),
      department,
      assignee,
      dueDateLabel: format(dueDate, "yyyy-MM-dd"),
      priority,
      files,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>시정/예방조치 등록</DialogTitle>
          <DialogDescription>조치 정보를 입력해 주세요.</DialogDescription>
        </DialogHeader>

        {/* AI 조치 초안 제안 — 구분·제목·내용을 채웁니다(참고용, 담당자 검토·수정). */}
        <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={suggestDraft}
            disabled={draft.isPending || !event}
          >
            {draft.isPending ? (
              <>
                <RefreshCwIcon className="animate-spin" />
                AI 초안 생성 중…
              </>
            ) : (
              <>
                <SparklesIcon />
                AI로 조치 초안 제안
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            이벤트·부적합 내용을 바탕으로 구분·제목·내용 초안을 채웁니다. 최종
            조치는 담당자가 검토·수정해 등록하세요.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">조치 구분</span>
          <Select
            value={type}
            onValueChange={(value) => setType((value as CapaPlanType) ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value) =>
                  value
                    ? CAPA_PLAN_TYPE_NAME[value as CapaPlanType]
                    : "조치 구분을 선택해 주세요."
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>조치 구분</SelectLabel>
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
          <span className="text-sm font-medium">조치 제목</span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="조치 제목을 입력해 주세요."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">조치 내용</span>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="조치 내용을 입력해 주세요."
            className="min-h-24 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">조치 담당자</span>
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
                <SelectLabel>조치 담당자</SelectLabel>
                {reviewers.map((r) => (
                  <SelectItem key={r.id} value={r.name}>
                    {r.name} · {r.teamName} {r.positionName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">조치 기한</span>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="기한 선택"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">우선순위</span>
            <Select
              value={priority}
              onValueChange={(value) =>
                setPriority((value as CapaActionPriority) ?? "")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) =>
                    value
                      ? CAPA_ACTION_PRIORITY_NAME[value as CapaActionPriority]
                      : "우선순위를 선택해 주세요."
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>우선순위</SelectLabel>
                  {PRIORITY_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
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
