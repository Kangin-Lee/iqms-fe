import { useRef, useState, type ChangeEvent } from "react";
import {
  FileIcon,
  PaperclipIcon,
  RefreshCwIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

import { useMutation } from "@tanstack/react-query";

import { geminiSuggestEffectivenessPlan } from "@/lib/gemini";
import type { QualityEvent } from "@/pages/quailty-event/queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type EffectivenessVerifyInput = {
  method: string;
  criteria: string;
  files: File[];
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type EffectivenessVerifyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** AI 초안 제안 대상(연결 품질 이벤트). */
  event: QualityEvent | null;
  onConfirm: (input: EffectivenessVerifyInput) => void;
};

/**
 * 효과성 검증 시작 모달(효과성 검증 대기 → 중).
 * "어떻게 검증할지"(검증 방법·기준)만 입력합니다. 결과는 검증 완료 등록에서 받습니다.
 */
export default function EffectivenessVerifyDialog({
  open,
  onOpenChange,
  event,
  onConfirm,
}: EffectivenessVerifyDialogProps) {
  const [method, setMethod] = useState("");
  const [criteria, setCriteria] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMethod("");
      setCriteria("");
      setFiles([]);
    }
  }

  // AI 검증 계획 초안(방법·기준 채우기). 실패 시 규칙 기반 초안으로 폴백.
  const draft = useMutation({
    mutationFn: () => {
      if (!event) throw new Error("연결된 품질 이벤트가 없습니다.");
      return geminiSuggestEffectivenessPlan(event);
    },
  });

  function suggestDraft() {
    draft.mutate(undefined, {
      onSuccess: (result) => {
        setMethod(result.method);
        setCriteria(result.criteria);
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

  const disabled = !method.trim() || !criteria.trim();

  function submit() {
    if (disabled) return;
    onConfirm({ method: method.trim(), criteria: criteria.trim(), files });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>효과성 검증</DialogTitle>
          <DialogDescription>
            검증 방법·기준을 입력해 주세요. 등록하면 효과성 검증 중으로 전환됩니다.
          </DialogDescription>
        </DialogHeader>

        {/* AI 검증 계획 초안 — 방법·기준을 채웁니다(참고용, 검증자가 검토·수정). */}
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
                AI로 검증 계획 초안 제안
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            이벤트·조치 맥락을 바탕으로 검증 방법·기준 초안을 채웁니다. 검증자가
            검토·수정해 등록하세요.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">검증 방법</span>
          <Textarea
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="검증 방법을 입력해 주세요."
            className="min-h-24 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">검증 기준</span>
          <Textarea
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            placeholder="검증 기준을 입력해 주세요."
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
            검증 시작
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
