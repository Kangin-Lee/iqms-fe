import {
  type ColumnDef,
  type PaginationState,
  type RowData,
  type Updater,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// 컬럼별 정렬을 meta.align 으로 지정할 수 있게 타입 확장.
// TData/TValue는 원본 ColumnMeta 시그니처를 맞추기 위해 필요하지만 여기선 미사용.
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "center" | "right";
    /** 헤더/셀에 함께 적용할 추가 클래스(예: 너비 제어 "w-full", "w-24"). */
    className?: string;
  }
}

const alignClass = (align?: "left" | "center" | "right") =>
  align === "left"
    ? "text-left"
    : align === "right"
      ? "text-right"
      : "text-center";

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  emptyMessage?: string;
  /** 한 페이지에 표시할 행 수. */
  pageSize?: number;
  /**
   * 현재 페이지를 담는 URL 쿼리 파라미터 키(기본 "page").
   * 한 화면에 표가 둘 이상이면 서로 다른 키를 주어 페이지가 섞이지 않게 합니다.
   */
  pageParamKey?: string;
  /** 행 클릭 시 호출. 지정하면 행에 포인터 커서/hover가 적용됩니다. */
  onRowClick?: (row: TData) => void;
  /**
   * 컬럼 너비 계산 방식.
   * "auto"(기본)는 브라우저가 내용에 맞춰 늘리므로 meta.className 의 너비가 무시될 수 있습니다.
   * "fixed"는 지정한 너비를 그대로 적용하고, 넘치는 내용은 말줄임(…)으로 잘립니다.
   * "fixed" 를 쓸 때는 남는 공간을 흡수할 컬럼 하나에 "w-full" 을 주세요.
   */
  layout?: "auto" | "fixed";
};

/**
 * 모든 목록 페이지가 공유하는 제네릭 그리드.
 * 페이지마다 다른 것은 columns / data 두 prop으로만 주입합니다.
 * 본문 셀 정렬은 기본 가운데이며, 컬럼의 meta.align 으로 개별 지정합니다.
 */
export default function DataTable<TData>({
  columns,
  data,
  emptyMessage = "데이터가 없습니다.",
  pageSize = 20,
  pageParamKey = "page",
  onRowClick,
  layout = "auto",
}: DataTableProps<TData>) {
  // table-fixed 에서는 셀이 지정 너비를 넘지 않도록 잘라 줘야 합니다.
  const clampClass = layout === "fixed" ? "overflow-hidden text-ellipsis" : undefined;
  // 현재 페이지를 URL(?page=N, 1부터)에 보관해 새로고침해도 유지되게 합니다.
  // URL은 라우트별로 다르므로 표마다 자연스럽게 페이지가 분리됩니다.
  const [searchParams, setSearchParams] = useSearchParams();

  // 데이터가 줄어 페이지 수가 작아졌을 때(예: 필터 후 새로고침)를 대비해 범위를 보정합니다.
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
  const requestedPage = Math.max(0, (Number(searchParams.get(pageParamKey)) || 1) - 1);
  const pageIndex = Math.min(requestedPage, pageCount - 1);

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const next =
      typeof updater === "function"
        ? updater({ pageIndex, pageSize })
        : updater;
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        // 1페이지는 파라미터를 생략해 URL을 깔끔하게 유지합니다.
        if (next.pageIndex <= 0) params.delete(pageParamKey);
        else params.set(pageParamKey, String(next.pageIndex + 1));
        return params;
      },
      { replace: true }
    );
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination: { pageIndex, pageSize } },
    onPaginationChange: handlePaginationChange,
    // 데이터가 로드(빈 배열 → 채워짐)될 때 페이지가 1로 초기화되지 않게 합니다.
    // 페이지는 URL로 관리하며, 범위 초과는 위 pageIndex 보정으로 처리합니다.
    autoResetPageIndex: false,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table className={layout === "fixed" ? "table-fixed" : undefined}>
          <TableHeader className="bg-zinc-300 dark:bg-zinc-700">
            {table.getHeaderGroups().map((headerGroup) => (
              // 헤더 행은 hover 배경색이 켜지지 않도록 고정합니다.
              <TableRow
                key={headerGroup.id}
                className="hover:bg-zinc-300 dark:hover:bg-zinc-700"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-center font-semibold text-foreground",
                      clampClass,
                      header.column.columnDef.meta?.className
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        alignClass(cell.column.columnDef.meta?.align),
                        clampClass,
                        cell.column.columnDef.meta?.className
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 — 한 페이지짜리 목록도 총 건수/컨트롤을 항상 표시합니다. */}
      {data.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-muted-foreground">총 {data.length}건</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="맨 앞으로"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              이전
            </Button>
            <span className="text-sm">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              다음
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="맨 뒤로"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
