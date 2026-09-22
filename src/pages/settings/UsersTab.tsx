import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  GripVertical,
  MoreVertical,
  Pencil,
  SquarePen,
  Trash2,
} from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  INITIAL_DEPARTMENTS,
  INITIAL_USERS,
  QMS_ROLE_LABEL,
  ROLE_LABEL,
  childrenOf,
  deptName,
  descendantIds,
  type Department,
  type OrgUser,
  type QmsRole,
  type UserRole,
} from "@/mock/org";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: ROLE_LABEL.admin },
  { value: "user", label: ROLE_LABEL.user },
  { value: "external", label: ROLE_LABEL.external },
];

const QMS_ROLE_OPTIONS: { value: QmsRole; label: string }[] = [
  { value: "quality", label: QMS_ROLE_LABEL.quality },
  { value: "action", label: QMS_ROLE_LABEL.action },
  { value: "verifier", label: QMS_ROLE_LABEL.verifier },
  { value: "change", label: QMS_ROLE_LABEL.change },
  { value: "staff", label: QMS_ROLE_LABEL.staff },
];

/** 역할별 뱃지 색(라이트/다크 모두 대응). */
const QMS_ROLE_BADGE: Record<QmsRole, string> = {
  quality:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  action:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  verifier:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  change:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  staff:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

type NameDialogState =
  | { mode: "add"; parentId: string; value: string }
  | { mode: "rename"; id: string; value: string }
  | null;

type UserDialogState =
  | {
      mode: "add" | "edit";
      id?: string;
      name: string;
      email: string;
      positionName: string;
      deptId: string;
      role: UserRole;
      qmsRole: QmsRole;
    }
  | null;

/** 좌측 트리의 부서 노드(드롭 대상). 사용자를 여기로 끌어다 놓으면 이동합니다. */
type DeptNodeProps = {
  dept: Department;
  depth: number;
  depts: Department[];
  users: OrgUser[];
  selected: string;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onRename: (dept: Department) => void;
  onDelete: (dept: Department) => void;
};

function DeptNode(props: DeptNodeProps) {
  const { dept, depth, depts, users } = props;
  const kids = childrenOf(depts, dept.id);
  const isLeaf = kids.length === 0;
  // 말단 부서만 드롭 대상. 하위 부서가 있는 상위 부서는 드롭 불가.
  const { setNodeRef, isOver } = useDroppable({
    id: `dept:${dept.id}`,
    disabled: !isLeaf,
  });
  const count = users.filter((u) =>
    descendantIds(depts, dept.id).has(u.deptId)
  ).length;
  const isOpen = props.expanded.has(dept.id);
  const isSelected = props.selected === dept.id;

  return (
    <li>
      <div
        ref={setNodeRef}
        className={cn(
          "group flex items-center gap-1 rounded-md px-1 text-sm transition-colors",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted",
          isOver && "ring-2 ring-primary ring-inset bg-primary/10"
        )}
      >
        {kids.length > 0 ? (
          <button
            type="button"
            onClick={() => props.onToggle(dept.id)}
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

        <button
          type="button"
          onClick={() => props.onSelect(dept.id)}
          className={cn(
            "flex-1 truncate py-1.5 text-left",
            !isLeaf && "font-medium"
          )}
        >
          {dept.name}
        </button>

        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {count}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${dept.name} 관리`}
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 outline-hidden transition-opacity group-hover:opacity-100 hover:text-foreground data-[popup-open]:opacity-100"
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => props.onAddChild(dept.id)}>
              <FolderPlus />
              하위 부서 추가
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => props.onRename(dept)}>
              <Pencil />
              이름 변경
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => props.onDelete(dept)}
            >
              <Trash2 />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isOpen && kids.length > 0 && (
        <ul className="ml-[11px] border-l border-border pl-1.5">
          {kids.map((k) => (
            <DeptNode key={k.id} {...props} dept={k} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** 우측 사용자 행(드래그 소스). 앞의 그립 핸들로만 드래그됩니다. */
function UserRow({
  user,
  label,
  onEdit,
}: {
  user: OrgUser;
  label: string;
  onEdit: (u: OrgUser) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `user:${user.id}`,
  });
  return (
    <tr
      ref={setNodeRef}
      className={cn(
        "[&>td]:px-4 [&>td]:py-2.5 [&>td]:text-center",
        isDragging && "opacity-40"
      )}
    >
      <td className="w-8 pr-0!">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${user.name} 드래그하여 부서 이동`}
          className="flex size-6 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      </td>
      <td className="font-medium text-foreground">{user.name}</td>
      <td className="text-muted-foreground">{label}</td>
      <td className="text-muted-foreground">{user.positionName}</td>
      <td>
        <Badge variant="outline" className={QMS_ROLE_BADGE[user.qmsRole]}>
          {QMS_ROLE_LABEL[user.qmsRole]}
        </Badge>
      </td>
      <td>
        <Badge
          variant={user.role === "admin" ? "default" : "secondary"}
          className="w-20 justify-center"
        >
          {ROLE_LABEL[user.role]}
        </Badge>
      </td>
      <td>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          onClick={() => onEdit(user)}
        >
          <SquarePen className="size-3.5" />
          편집
        </Button>
      </td>
    </tr>
  );
}

/** 유저 관리 탭 — 좌측 조직도(부서 트리) + 우측 사용자 목록. 드래그로 부서 이동. */
export default function UsersTab() {
  const [depts, setDepts] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [users, setUsers] = useState<OrgUser[]>(INITIAL_USERS);
  const [selected, setSelected] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(INITIAL_DEPARTMENTS.map((d) => d.id))
  );
  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const [userDialog, setUserDialog] = useState<UserDialogState>(null);
  const [activeUser, setActiveUser] = useState<OrgUser | null>(null);

  // 작은 이동에도 클릭이 드래그로 오인되지 않게 4px 이동 후 드래그 시작.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const flatDepts = useMemo(() => {
    const out: { dept: Department; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const d of childrenOf(depts, parentId)) {
        out.push({ dept: d, depth });
        walk(d.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [depts]);

  const visibleUsers = useMemo(() => {
    const scope = selected === "all" ? null : descendantIds(depts, selected);
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (!scope || scope.has(u.deptId)) &&
        (!q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q))
    );
  }, [users, depts, selected, query]);

  const selectedLabel =
    selected === "all" ? "전체 사용자" : deptName(depts, selected);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── 드래그로 부서 이동 ─────────────────────────────────────
  function handleDragStart(e: DragStartEvent) {
    const uid = String(e.active.id).replace("user:", "");
    setActiveUser(users.find((u) => u.id === uid) ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveUser(null);
    const { active, over } = e;
    if (!over) return;
    const uid = String(active.id).replace("user:", "");
    const did = String(over.id).replace("dept:", "");
    const user = users.find((u) => u.id === uid);
    if (!user || user.deptId === did) return;
    // 말단 부서에만 이동 허용(하위 부서가 있으면 거부).
    if (depts.some((d) => d.parentId === did)) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, deptId: did } : u))
    );
    toast.add({
      title: "부서 이동",
      description: `${user.name} 님을 '${deptName(depts, did)}' 부서로 이동했습니다.`,
      type: "success",
    });
  }

  // ── 부서 편집 ──────────────────────────────────────────────
  function submitName() {
    if (!nameDialog) return;
    const value = nameDialog.value.trim();
    if (!value) return;
    if (nameDialog.mode === "add") {
      const id = `d-${Date.now()}`;
      setDepts((prev) => [
        ...prev,
        { id, name: value, parentId: nameDialog.parentId },
      ]);
      setExpanded((prev) => new Set(prev).add(nameDialog.parentId));
      toast.add({ title: "부서 추가", description: `'${value}' 부서를 추가했습니다.`, type: "success" });
    } else {
      setDepts((prev) =>
        prev.map((d) => (d.id === nameDialog.id ? { ...d, name: value } : d))
      );
      toast.add({ title: "부서 이름 변경", description: `'${value}'(으)로 변경했습니다.`, type: "success" });
    }
    setNameDialog(null);
  }

  function deleteDept(dept: Department) {
    const hasChild = depts.some((d) => d.parentId === dept.id);
    const hasUser = users.some((u) => u.deptId === dept.id);
    if (hasChild || hasUser) {
      toast.add({
        title: "삭제할 수 없음",
        description: "하위 부서나 소속 사용자가 있는 부서는 삭제할 수 없습니다.",
        type: "error",
      });
      return;
    }
    setDepts((prev) => prev.filter((d) => d.id !== dept.id));
    if (selected === dept.id) setSelected("all");
    toast.add({ title: "부서 삭제", description: `'${dept.name}' 부서를 삭제했습니다.`, type: "info" });
  }

  // ── 사용자 편집 ────────────────────────────────────────────
  // (신규 사용자는 회원가입 승인으로만 추가되므로 여기서는 편집만 제공합니다.)
  function openEditUser(u: OrgUser) {
    setUserDialog({
      mode: "edit",
      id: u.id,
      name: u.name,
      email: u.email,
      positionName: u.positionName,
      deptId: u.deptId,
      role: u.role,
      qmsRole: u.qmsRole,
    });
  }

  function submitUser() {
    if (!userDialog || !userDialog.id) return;
    const name = userDialog.name.trim();
    if (!name || !userDialog.deptId) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userDialog.id
          ? {
              ...u,
              name,
              email: userDialog.email.trim(),
              positionName: userDialog.positionName.trim(),
              deptId: userDialog.deptId,
              role: userDialog.role,
              qmsRole: userDialog.qmsRole,
            }
          : u
      )
    );
    toast.add({ title: "사용자 저장", description: `${name} 님 정보를 저장했습니다.`, type: "success" });
    setUserDialog(null);
  }

  const roots = childrenOf(depts, null);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* 좌측: 조직도 (드롭 대상) */}
          <div className="flex flex-col rounded-lg border bg-card lg:w-72 lg:shrink-0">
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <span className="text-sm font-medium">조직도</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="최상위 부서 추가"
                onClick={() =>
                  setNameDialog({ mode: "add", parentId: "d-root", value: "" })
                }
              >
                <FolderPlus />
              </Button>
            </div>
            <div className="p-1.5">
              <button
                type="button"
                onClick={() => setSelected("all")}
                className={cn(
                  "mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm",
                  selected === "all"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span>전체 사용자</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {users.length}
                </span>
              </button>
              <ul>
                {roots.map((r) => (
                  <DeptNode
                    key={r.id}
                    dept={r}
                    depth={0}
                    depts={depts}
                    users={users}
                    selected={selected}
                    expanded={expanded}
                    onSelect={setSelected}
                    onToggle={toggle}
                    onAddChild={(parentId) =>
                      setNameDialog({ mode: "add", parentId, value: "" })
                    }
                    onRename={(dept) =>
                      setNameDialog({ mode: "rename", id: dept.id, value: dept.name })
                    }
                    onDelete={deleteDept}
                  />
                ))}
              </ul>
            </div>
          </div>

          {/* 우측: 사용자 목록 (드래그 소스) */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selectedLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {visibleUsers.length}명 · 행을 왼쪽 부서로 끌어 이동
                </p>
              </div>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름·이메일 검색"
                className="w-56 shrink-0 bg-card"
              />
            </div>

            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-center [&>th]:font-medium">
                    <th className="w-8 pr-0!" aria-label="드래그" />
                    <th>이름</th>
                    <th>부서</th>
                    <th>직급</th>
                    <th>역할</th>
                    <th>권한</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody className="[&>tr]:border-t">
                  {visibleUsers.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      label={deptName(depts, u.deptId)}
                      onEdit={openEditUser}
                    />
                  ))}
                  {visibleUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        사용자가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 드래그 중 따라다니는 미리보기 */}
        <DragOverlay>
          {activeUser ? (
            <div className="rounded-md border bg-popover px-3 py-1.5 text-sm font-medium text-popover-foreground shadow-md">
              {activeUser.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 부서 추가/이름변경 다이얼로그 */}
      <Dialog
        open={nameDialog !== null}
        onOpenChange={(open) => {
          if (!open) setNameDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {nameDialog?.mode === "rename" ? "부서 이름 변경" : "부서 추가"}
            </DialogTitle>
            <DialogDescription>부서 이름을 입력하세요.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={nameDialog?.value ?? ""}
            onChange={(e) =>
              setNameDialog((prev) =>
                prev ? { ...prev, value: e.target.value } : prev
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") submitName();
            }}
            placeholder="부서 이름"
            className="bg-card"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialog(null)}>
              취소
            </Button>
            <Button onClick={submitName} disabled={!nameDialog?.value.trim()}>
              {nameDialog?.mode === "rename" ? "변경" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 사용자 추가/편집 다이얼로그 */}
      <Dialog
        open={userDialog !== null}
        onOpenChange={(open) => {
          if (!open) setUserDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {userDialog?.mode === "edit" ? "사용자 편집" : "사용자 추가"}
            </DialogTitle>
            <DialogDescription>
              이름·부서·권한을 입력하세요. 이름과 부서는 필수입니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  이름 <span className="text-destructive">*</span>
                </span>
                <Input
                  value={userDialog?.name ?? ""}
                  onChange={(e) =>
                    setUserDialog((p) => (p ? { ...p, name: e.target.value } : p))
                  }
                  placeholder="이름"
                  className="bg-card"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">직급</span>
                <Input
                  value={userDialog?.positionName ?? ""}
                  onChange={(e) =>
                    setUserDialog((p) =>
                      p ? { ...p, positionName: e.target.value } : p
                    )
                  }
                  placeholder="예: 선임"
                  className="bg-card"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">이메일</span>
              <Input
                type="email"
                value={userDialog?.email ?? ""}
                onChange={(e) =>
                  setUserDialog((p) => (p ? { ...p, email: e.target.value } : p))
                }
                placeholder="name@i-ops.co.kr"
                className="bg-card"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  부서 <span className="text-destructive">*</span>
                </span>
                <Select
                  value={userDialog?.deptId ?? ""}
                  onValueChange={(value) =>
                    setUserDialog((p) =>
                      p ? { ...p, deptId: String(value ?? "") } : p
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value) =>
                        value ? deptName(depts, String(value)) : "부서 선택"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>부서</SelectLabel>
                      {flatDepts.map(({ dept, depth }) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {`${"  ".repeat(depth)}${dept.name}`}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">권한</span>
                <Select
                  value={userDialog?.role ?? "user"}
                  onValueChange={(value) =>
                    setUserDialog((p) =>
                      p ? { ...p, role: (value as UserRole) ?? "user" } : p
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value) => ROLE_LABEL[(value as UserRole) ?? "user"]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>권한</SelectLabel>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">역할</span>
              <Select
                value={userDialog?.qmsRole ?? "staff"}
                onValueChange={(value) =>
                  setUserDialog((p) =>
                    p ? { ...p, qmsRole: (value as QmsRole) ?? "staff" } : p
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) => QMS_ROLE_LABEL[(value as QmsRole) ?? "staff"]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>QMS 역할</SelectLabel>
                    {QMS_ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog(null)}>
              취소
            </Button>
            <Button
              onClick={submitUser}
              disabled={!userDialog?.name.trim() || !userDialog?.deptId}
            >
              {userDialog?.mode === "edit" ? "저장" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
