import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  FolderPlus,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  INITIAL_FOLDERS,
  folderChildren,
  folderDescendantIds,
  folderPath,
  type Folder,
} from "@/mock/folders";

type NameDialogState =
  | { mode: "add"; parentId: string | null; value: string }
  | { mode: "rename"; id: string; value: string }
  | null;

/** 좌측 트리의 폴더 노드(선택/펼침 전용). */
type FolderNodeProps = {
  folder: Folder;
  depth: number;
  folders: Folder[];
  selected: string | null;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
};

function FolderNode(props: FolderNodeProps) {
  const { folder, depth, folders } = props;
  const kids = folderChildren(folders, folder.id);
  const isOpen = props.expanded.has(folder.id);
  const isSelected = props.selected === folder.id;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 text-sm",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
        )}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {kids.length > 0 ? (
          <button
            type="button"
            onClick={() => props.onToggle(folder.id)}
            aria-label={isOpen ? "접기" : "펼치기"}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            {isOpen ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}
        {isOpen && kids.length > 0 ? (
          <FolderOpenIcon className="size-4 shrink-0 text-yellow-400" />
        ) : (
          <FolderIcon className="size-4 shrink-0 text-yellow-400" />
        )}
        <button
          type="button"
          onClick={() => props.onSelect(folder.id)}
          className="flex-1 truncate py-1.5 text-left"
        >
          {folder.name}
        </button>
      </div>

      {isOpen && kids.length > 0 && (
        <ul className="ml-[11px] border-l border-border pl-1.5">
          {kids.map((k) => (
            <FolderNode key={k.id} {...props} folder={k} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** 폴더 관리 탭 — 좌측 폴더 트리 + 우측 하위 폴더 목록(추가/이름수정/삭제). */
export default function FoldersTab() {
  const [folders, setFolders] = useState<Folder[]>(INITIAL_FOLDERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(INITIAL_FOLDERS.map((f) => f.id))
  );
  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Folder | null>(null);

  const children = folderChildren(folders, selected);
  const path = selected ? folderPath(folders, selected) : [];

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function open(id: string) {
    setSelected(id);
    setExpanded((prev) => new Set(prev).add(id));
  }

  function submitName() {
    if (!nameDialog) return;
    const value = nameDialog.value.trim();
    if (!value) return;
    if (nameDialog.mode === "add") {
      const id = `f-${Date.now()}`;
      setFolders((prev) => [
        ...prev,
        { id, name: value, parentId: nameDialog.parentId },
      ]);
      if (nameDialog.parentId) {
        setExpanded((prev) => new Set(prev).add(nameDialog.parentId!));
      }
      toast.add({ title: "폴더 추가", description: `'${value}' 폴더를 추가했습니다.`, type: "success" });
    } else {
      setFolders((prev) =>
        prev.map((f) => (f.id === nameDialog.id ? { ...f, name: value } : f))
      );
      toast.add({ title: "폴더 이름 수정", description: `'${value}'(으)로 변경했습니다.`, type: "success" });
    }
    setNameDialog(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const ids = folderDescendantIds(folders, deleteTarget.id);
    setFolders((prev) => prev.filter((f) => !ids.has(f.id)));
    // 선택 폴더가 삭제되면 부모로 이동.
    if (selected && ids.has(selected)) setSelected(deleteTarget.parentId);
    toast.add({ title: "폴더 삭제", description: `'${deleteTarget.name}' 폴더를 삭제했습니다.`, type: "info" });
    setDeleteTarget(null);
  }

  const deleteHasChildren =
    deleteTarget != null &&
    folders.some((f) => f.parentId === deleteTarget.id);

  const roots = folderChildren(folders, null);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* 좌측: 폴더 트리 */}
        <div className="flex flex-col rounded-lg border bg-card lg:w-72 lg:shrink-0">
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <span className="text-sm font-medium">폴더</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="최상위 폴더 추가"
              onClick={() => setNameDialog({ mode: "add", parentId: null, value: "" })}
            >
              <FolderPlus />
            </Button>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={cn(
                "mb-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm",
                selected === null
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              <FolderIcon className="size-4 shrink-0 text-yellow-400" />
              전체 폴더
            </button>
            <ul>
              {roots.map((r) => (
                <FolderNode
                  key={r.id}
                  folder={r}
                  depth={0}
                  folders={folders}
                  selected={selected}
                  expanded={expanded}
                  onSelect={setSelected}
                  onToggle={toggle}
                />
              ))}
            </ul>
          </div>
        </div>

        {/* 우측: 선택 폴더의 하위 폴더(카드 그리드) */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* 브레드크럼 */}
          <div className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={cn(
                "rounded px-1 hover:text-foreground",
                selected === null
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              폴더 관리
            </button>
            {path.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                <ChevronRight className="size-3.5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setSelected(f.id)}
                  className={cn(
                    "rounded px-1 hover:text-foreground",
                    i === path.length - 1
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {f.name}
                </button>
              </span>
            ))}
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
          >
            {children.map((f) => (
              <div
                key={f.id}
                className="group relative flex min-h-[132px] flex-col items-center justify-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`${f.name} 관리`}
                    className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-md text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground data-[popup-open]:bg-muted data-[popup-open]:text-foreground"
                  >
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        setNameDialog({ mode: "rename", id: f.id, value: f.name })
                      }
                    >
                      <Pencil />
                      이름 수정
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteTarget(f)}
                    >
                      <Trash2 />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  type="button"
                  onClick={() => open(f.id)}
                  className="flex w-full flex-col items-center gap-3 outline-hidden"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-950/40">
                    <FolderIcon className="size-6 text-yellow-400" />
                  </span>
                  <span
                    title={f.name}
                    className="w-full truncate text-center text-sm font-medium"
                  >
                    {f.name}
                  </span>
                </button>
              </div>
            ))}

            {/* 폴더 추가 카드 */}
            <button
              type="button"
              onClick={() =>
                setNameDialog({ mode: "add", parentId: selected, value: "" })
              }
              className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-muted-foreground outline-hidden transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <span className="flex size-12 items-center justify-center rounded-full border border-dashed">
                <Plus className="size-5" />
              </span>
              <span className="text-sm">폴더 추가</span>
            </button>
          </div>
        </div>
      </div>

      {/* 폴더 추가/이름수정 다이얼로그 */}
      <Dialog
        open={nameDialog !== null}
        onOpenChange={(o) => {
          if (!o) setNameDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {nameDialog?.mode === "rename" ? "폴더 이름 수정" : "폴더 추가"}
            </DialogTitle>
            <DialogDescription>폴더 이름을 입력하세요.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={nameDialog?.value ?? ""}
            onChange={(e) =>
              setNameDialog((p) => (p ? { ...p, value: e.target.value } : p))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") submitName();
            }}
            placeholder="폴더 이름"
            className="bg-card"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialog(null)}>
              취소
            </Button>
            <Button onClick={submitName} disabled={!nameDialog?.value.trim()}>
              {nameDialog?.mode === "rename" ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 폴더 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>폴더 삭제</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `'${deleteTarget.name}' 폴더를 삭제하시겠습니까?${
                    deleteHasChildren
                      ? " 안의 모든 하위 폴더도 함께 삭제됩니다."
                      : ""
                  } 이 작업은 되돌릴 수 없습니다.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
