import { useState } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  AI_VERDICT_META,
  REVIEW_DECISION_META,
  type ReviewRecord,
} from "../queries";

/** 아바타 배경 색 후보(원형 배경). 이름을 해싱해 사람마다 고정된 색을 씁니다. */
const AVATAR_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-pink-500",
];

/** 이름 → 아바타 색. 같은 사람은 항상 같은 색이 되도록 결정적으로 고릅니다. */
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

type ReviewCommentsProps = {
  records: ReviewRecord[];
  /** 종료·반려된 이벤트면 수정·삭제 잠금. */
  locked: boolean;
  /** 본인이 작성한 검토만 수정·삭제할 수 있습니다. */
  currentUserName: string;
  onEdit: (recordId: string, reason: string) => void;
  onDelete: (recordId: string) => void;
};

/** 이름의 첫 글자를 아바타 이니셜로 사용합니다. */
function initial(name: string) {
  return name.trim().charAt(0) || "?";
}

/**
 * 검토 이력을 댓글 형태로 보여 줍니다(첨부파일 아래).
 * 본인이 남긴 검토는 수정·삭제할 수 있고, 삭제하면 검토가 취소됩니다.
 * 종료·반려된 이벤트(locked)는 수정·삭제 버튼을 노출하지 않습니다.
 */
export default function ReviewComments({
  records,
  locked,
  currentUserName,
  onEdit,
  onDelete,
}: ReviewCommentsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ReviewRecord | null>(null);

  function startEdit(record: ReviewRecord) {
    setEditingId(record.id);
    setDraft(record.reason);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
  }

  function saveEdit(recordId: string) {
    const reason = draft.trim();
    if (!reason) return;
    onEdit(recordId, reason);
    setEditingId(null);
    setDraft("");
    toast.add({
      title: "검토 수정",
      description: "검토 사유를 수정했습니다.",
      type: "success",
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    onDelete(deleteTarget.id);
    if (editingId === deleteTarget.id) cancelEdit();
    setDeleteTarget(null);
    toast.add({
      title: "검토 취소",
      description: "검토 이력을 삭제하고 검토를 취소했습니다.",
      type: "success",
    });
  }

  return (
    <div className="shrink-0">
      <p className="mb-2 text-sm font-medium">검토 이력 ({records.length})</p>

      <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
        {[...records].reverse().map((record) => {
          const meta = REVIEW_DECISION_META[record.decision];
          // 본인이 남긴 검토만, 그리고 종료·반려 전 상태에서만 수정·삭제 가능.
          const canModify = !locked && record.reviewer === currentUserName;
          const editing = editingId === record.id;

          return (
            <li key={record.id} className="flex gap-3">
              {/* 작성자 아바타 — 원형 배경, 이름별 고정 색 */}
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white",
                  avatarColor(record.reviewer)
                )}
              >
                {initial(record.reviewer)}
              </div>

              {/* 댓글 말풍선 */}
              <div className="min-w-0 flex-1 rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{record.reviewer}</span>
                  <Badge variant={meta.badge}>{meta.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {record.createdAtLabel}
                  </span>

                  {/* 결정 당시 AI 소견 (있을 때만) */}
                  {record.aiVerdict && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      AI
                      <Badge variant={AI_VERDICT_META[record.aiVerdict].badge}>
                        {AI_VERDICT_META[record.aiVerdict].label}
                      </Badge>
                    </span>
                  )}
                </div>

                {editing ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="검토 사유를 입력해 주세요."
                      className="min-h-20 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                      >
                        취소
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveEdit(record.id)}
                        disabled={!draft.trim()}
                      >
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-1.5 text-sm whitespace-pre-line text-foreground">
                      {record.reason}
                    </p>

                    {record.aiSummary && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        AI 소견: {record.aiSummary}
                      </p>
                    )}

                    {canModify && (
                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                          onClick={() => startEdit(record)}
                        >
                          <PencilIcon />
                          수정
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(record)}
                        >
                          <Trash2Icon />
                          삭제
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* 삭제(=검토 취소) 확인 */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>검토 취소</DialogTitle>
            <DialogDescription>
              이 검토 이력을 삭제하면 검토가 취소됩니다.
              {deleteTarget?.decision === "nonconformity" &&
                " 부적합 판정 요청도 함께 철회됩니다."}{" "}
              계속하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              취소
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
