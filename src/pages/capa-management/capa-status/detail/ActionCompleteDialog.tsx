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
import { geminiSummarizeActionCompletion } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { CapaActionResult } from "../../queries";

export type ActionCompleteInput = {
  result: CapaActionResult;
  completedDateLabel: string;
  actualContent: string;
  opinion: string;
  files: File[];
};

const RESULT_OPTIONS: CapaActionResult[] = ["완료", "일부완료", "미완료"];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ActionCompleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: ActionCompleteInput) => void;
};

/**
 * 조치 완료 처리 모달.
 * 실제 조치 내용(사실 기록)은 담당자가 직접 작성하고,
 * 완료 의견은 그 내용을 바탕으로 AI 요약 제안을 받을 수 있습니다.
 */
export default function ActionCompleteDialog({
  open,
  onOpenChange,
  onConfirm,
}: ActionCompleteDialogProps) {
  const [actualContent, setActualContent] = useState("");
  const [result, setResult] = useState<CapaActionResult | "">("");
  const [completedDate, setCompletedDate] = useState<Date | undefined>(
    new Date()
  );
  const [opinion, setOpinion] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setActualContent("");
      setResult("");
      setCompletedDate(new Date());
      setOpinion("");
      setFiles([]);
    }
  }

  // 완료 의견 AI 요약(실제 조치 내용을 요약, 새 사실은 생성하지 않음).
  const summarize = useMutation({
    mutationFn: () => geminiSummarizeActionCompletion(actualContent),
  });

  function suggestOpinion() {
    summarize.mutate(undefined, {
      onSuccess: (text) => setOpinion(text),
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

  const disabled = !actualContent.trim() || !result || !completedDate;

  function submit() {
    if (!result || !completedDate || disabled) return;
    onConfirm({
      result,
      completedDateLabel: format(completedDate, "yyyy-MM-dd"),
      actualContent: actualContent.trim(),
      opinion: opinion.trim(),
      files,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>조치 완료 처리</DialogTitle>
          <DialogDescription>완료 처리 정보를 입력해 주세요.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">실제 조치 내용</span>
          <Textarea
            value={actualContent}
            onChange={(e) => setActualContent(e.target.value)}
            placeholder="실제 수행한 조치 내용을 입력해 주세요."
            className="min-h-24 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">조치 결과</span>
            <Select
              value={result}
              onValueChange={(value) =>
                setResult((value as CapaActionResult) ?? "")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) =>
                    value ? String(value) : "조치 결과를 선택해 주세요."
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>조치 결과</SelectLabel>
                  {RESULT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">완료일</span>
            <DatePicker
              value={completedDate}
              onChange={setCompletedDate}
              placeholder="완료일 선택"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">완료 의견</span>
            {/* AI 완료 의견 요약 — 위 '실제 조치 내용'을 요약합니다(새 사실 생성 안 함). */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={suggestOpinion}
              disabled={summarize.isPending || !actualContent.trim()}
            >
              {summarize.isPending ? (
                <>
                  <RefreshCwIcon className="animate-spin" />
                  요약 중…
                </>
              ) : (
                <>
                  <SparklesIcon />
                  AI 의견 요약
                </>
              )}
            </Button>
          </div>
          <Textarea
            value={opinion}
            onChange={(e) => setOpinion(e.target.value)}
            placeholder="완료 의견을 입력해 주세요. (선택)"
            className="min-h-20 resize-none"
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
            완료 처리
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
