import { useRef, useState, type ChangeEvent } from "react";
import {
  FileIcon,
  PaperclipIcon,
  RefreshCwIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

import { useMutation } from "@tanstack/react-query";

import { geminiSuggestRootCause } from "@/lib/gemini";
import type { QualityEvent } from "@/pages/quailty-event/queries";
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
import { RCA_METHOD_NAME, type RcaMethod } from "../../queries";

export type RootCauseInput = {
  method: RcaMethod;
  directCause: string;
  rootCause: string;
  content: string;
  files: File[];
};

const METHOD_OPTIONS = Object.entries(RCA_METHOD_NAME) as [RcaMethod, string][];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type RootCauseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "register"(등록) | "edit"(수정). 기본 register. */
  mode?: "register" | "edit";
  /** 수정 모드 초기값(등록된 원인분석). */
  initial?: RootCauseInput | null;
  /** AI 초안 제안 대상(연결 품질 이벤트). */
  event: QualityEvent | null;
  onConfirm: (input: RootCauseInput) => void;
};

/**
 * 원인분석 등록/수정 모달. 방법·직접 원인·근본 원인·내용·첨부파일을 입력합니다.
 * AI 초안 제안(판정이 아닌 분석 보조)으로 초안을 채운 뒤 분석자가 검토·수정합니다.
 */
export default function RootCauseDialog({
  open,
  onOpenChange,
  mode = "register",
  initial,
  event,
  onConfirm,
}: RootCauseDialogProps) {
  const isEdit = mode === "edit";
  const [method, setMethod] = useState<RcaMethod>("5why");
  const [directCause, setDirectCause] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 열릴 때 초기화(수정 모드면 기존 값으로 프리필).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMethod(initial?.method ?? "5why");
      setDirectCause(initial?.directCause ?? "");
      setRootCause(initial?.rootCause ?? "");
      setContent(initial?.content ?? "");
      setFiles(initial?.files ?? []);
    }
  }

  // AI 원인분석 초안 추천(폼 채우기). 키 없거나 실패 시 규칙 기반 초안으로 폴백.
  const draft = useMutation({
    mutationFn: () => {
      if (!event) throw new Error("연결된 품질 이벤트가 없습니다.");
      return geminiSuggestRootCause(event);
    },
  });

  function suggestDraft() {
    draft.mutate(undefined, {
      onSuccess: (result) => {
        setMethod((result.method as RcaMethod) ?? "5why");
        setDirectCause(result.directCause);
        setRootCause(result.rootCause);
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
    !directCause.trim() || !rootCause.trim() || !content.trim();

  function submit() {
    if (disabled) return;
    onConfirm({
      method,
      directCause: directCause.trim(),
      rootCause: rootCause.trim(),
      content: content.trim(),
      files,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "원인분석 수정" : "원인분석 등록"}</DialogTitle>
          <DialogDescription>원인분석 정보를 입력해 주세요.</DialogDescription>
        </DialogHeader>

        {/* AI 원인분석 초안 제안 — 방법·직접/근본 원인·내용을 채웁니다(참고용, 분석자 검토·수정). */}
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
                AI로 원인분석 초안 제안
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            이벤트·부적합 내용을 바탕으로 직접/근본 원인·분석 과정 초안을 채웁니다.
            근본 원인은 후속 CAPA 방향을 좌우하므로 분석자가 반드시 검토·수정해
            등록하세요.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">원인분석 방법</span>
          <Select
            value={method}
            onValueChange={(value) => setMethod((value as RcaMethod) ?? "5why")}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value) =>
                  value ? RCA_METHOD_NAME[value as RcaMethod] : "방법 선택"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>원인분석 방법</SelectLabel>
                {METHOD_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">직접 원인</span>
          <Textarea
            value={directCause}
            onChange={(e) => setDirectCause(e.target.value)}
            placeholder="직접 원인을 입력해 주세요."
            className="min-h-20 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">근본 원인</span>
          <Textarea
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            placeholder="근본 원인을 입력해 주세요."
            className="min-h-20 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">원인분석 내용</span>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="원인분석 내용을 입력해 주세요."
            className="min-h-36 resize-y"
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
            {isEdit ? "수정" : "등록"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
