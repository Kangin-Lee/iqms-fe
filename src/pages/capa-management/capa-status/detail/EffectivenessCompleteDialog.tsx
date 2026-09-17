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

import { geminiSuggestEffectivenessOpinion } from "@/lib/gemini";
import type { QualityEvent } from "@/pages/quailty-event/queries";
import DatePicker from "@/components/common/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  EFFECTIVENESS_RESULT_NAME,
  type EffectivenessResult,
} from "../../queries";

export type EffectivenessCompleteInput = {
  result: EffectivenessResult;
  verifiedDateLabel: string;
  opinion: string;
  files: File[];
};

const RESULT_OPTIONS = Object.entries(EFFECTIVENESS_RESULT_NAME) as [
  EffectivenessResult,
  string,
][];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type EffectivenessCompleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** AI 의견 제안 대상(연결 품질 이벤트). */
  event: QualityEvent | null;
  /** 검증 기준(AI 의견을 기준에 근거해 정리). */
  criteria: string;
  onConfirm: (input: EffectivenessCompleteInput) => void;
};

/**
 * 효과성 검증 결과 등록 모달(효과성 검증 중 → 완료).
 * 검증 결과(효과있음/효과없음)·검증일·검증 의견을 입력합니다.
 */
export default function EffectivenessCompleteDialog({
  open,
  onOpenChange,
  event,
  criteria,
  onConfirm,
}: EffectivenessCompleteDialogProps) {
  const [result, setResult] = useState<EffectivenessResult | "">("");
  const [verifiedDate, setVerifiedDate] = useState<Date | undefined>(
    new Date()
  );
  const [opinion, setOpinion] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setResult("");
      setVerifiedDate(new Date());
      setOpinion("");
      setFiles([]);
    }
  }

  // AI 검증 의견 제안 — 검증자가 고른 결과와 일관되게 의견을 정리(판단은 사람이 함).
  const draft = useMutation({
    mutationFn: () => {
      if (!result) throw new Error("검증 결과를 먼저 선택해 주세요.");
      if (!event) throw new Error("연결된 품질 이벤트가 없습니다.");
      return geminiSuggestEffectivenessOpinion(result, criteria, event);
    },
  });

  function suggestOpinion() {
    draft.mutate(undefined, { onSuccess: (text) => setOpinion(text) });
  }

  function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files;
    if (picked?.length) setFiles((prev) => [...prev, ...Array.from(picked)]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const disabled = !result || !verifiedDate;

  function submit() {
    if (!result || !verifiedDate || disabled) return;
    onConfirm({
      result,
      verifiedDateLabel: format(verifiedDate, "yyyy-MM-dd"),
      opinion: opinion.trim(),
      files,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>효과성 검증 결과 등록</DialogTitle>
          <DialogDescription>
            검증 결과를 입력해 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">검증 결과</span>
            <RadioGroup
              value={result}
              onValueChange={(value) =>
                setResult(value as EffectivenessResult)
              }
              className="flex flex-row flex-wrap gap-x-4 gap-y-2 pt-1.5"
            >
              {RESULT_OPTIONS.map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <RadioGroupItem value={value} />
                  {label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">검증일</span>
            <DatePicker
              value={verifiedDate}
              onChange={setVerifiedDate}
              placeholder="검증일 선택"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">검증 의견</span>
            {/* AI 의견 제안 — 결과 선택 후 활성화. 결과와 일관된 의견을 정리합니다. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={suggestOpinion}
              disabled={draft.isPending || !result || !event}
            >
              {draft.isPending ? (
                <>
                  <RefreshCwIcon className="animate-spin" />
                  생성 중…
                </>
              ) : (
                <>
                  <SparklesIcon />
                  AI 의견 제안
                </>
              )}
            </Button>
          </div>
          <Textarea
            value={opinion}
            onChange={(e) => setOpinion(e.target.value)}
            placeholder="검증 의견을 입력해 주세요. (선택)"
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
            검증 등록
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
