import { UserPlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Reviewer } from "@/mock/reviewers";

type ReviewerSelectDialogProps = {
  /** 선택 가능한 사람 목록 */
  people: Reviewer[];
  /** 선택된 사람 id 목록 */
  value: string[];
  /** 확인 시 선택 결과 반영 */
  onChange: (ids: string[]) => void;
  triggerLabel?: string;
  title?: string;
  description?: string;
};

/**
 * 사람(검토자) 다중 선택 모달. 다른 화면에서도 재사용할 수 있도록 공통화.
 * 열림/닫힘은 내부 상태로 제어하고, 확인 시에만 onChange로 결과를 커밋합니다.
 */
export default function ReviewerSelectDialog({
  people,
  value,
  onChange,
  triggerLabel = "검토자 선택",
  title = "검토자 선택",
  description = "검토할 담당자를 선택하세요.",
}: ReviewerSelectDialogProps) {
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<string[]>(value);

  const openModal = () => {
    setStaged(value); // 열 때 현재 선택으로 초기화
    setOpen(true);
  };
  const close = () => setOpen(false);
  const confirm = () => {
    onChange(staged);
    setOpen(false);
  };
  const toggle = (id: string) =>
    setStaged((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // Escape 로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={openModal}
      >
        <UserPlusIcon />
        {triggerLabel}
      </Button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={close}
              aria-hidden
            />
            {/* panel */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="relative z-10 flex w-full max-w-sm flex-col gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10"
            >
              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-base leading-none font-medium">
                  {title}
                </h2>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>

              <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                {people.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted">
                      <Checkbox
                        checked={staged.includes(p.id)}
                        onCheckedChange={() => toggle(p.id)}
                      />
                      <span className="text-sm">
                        <span className="font-medium">{p.name}</span>{" "}
                        <span className="text-muted-foreground">
                          {p.teamName} · {p.positionName}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close}>
                  취소
                </Button>
                <Button type="button" onClick={confirm}>
                  확인 ({staged.length})
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
