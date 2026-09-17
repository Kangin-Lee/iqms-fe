import { GripVerticalIcon } from "lucide-react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";

type SortablePanelProps = {
  id: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * 드래그로 순서를 바꿀 수 있는 대시보드 패널.
 * 헤더의 그립 아이콘만 드래그 핸들이라, 패널 안의 버튼/링크와 충돌하지 않습니다.
 */
export default function SortablePanel({
  id,
  title,
  action,
  children,
  className,
}: SortablePanelProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col rounded-lg border bg-card",
        isDragging && "z-10 opacity-70 shadow-lg",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="카드 순서 이동"
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
            className="-ml-1 shrink-0 touch-none rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <h2 className="truncate text-sm font-semibold text-foreground">
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
