'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type RowSelectionState,
  type OnChangeFn,
  type Row,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  pageCount?: number;
  selection?: RowSelectionState;
  onSelectionChange?: OnChangeFn<RowSelectionState>;
  onRowClick?: (row: TData) => void;
  expandable?: boolean;
  renderExpanded?: (row: TData) => React.ReactNode;
  loading?: boolean;
  emptyState?: React.ReactNode;
  stickyHeader?: boolean;
  virtualized?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Skeleton row for loading state
// ---------------------------------------------------------------------------

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full animate-shimmer rounded bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-overlay to-surface-elevated bg-[length:200%_100%]" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Default empty state
// ---------------------------------------------------------------------------

function DefaultEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-content-secondary">
      <svg
        className="mb-3 h-10 w-10 text-content-tertiary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
      </svg>
      <p className="text-body-md font-medium">No results found</p>
      <p className="mt-1 text-body-sm text-content-tertiary">Try adjusting your filters or search terms.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort icon
// ---------------------------------------------------------------------------

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ChevronUp className="ml-1 h-3.5 w-3.5" />;
  if (direction === 'desc') return <ChevronDown className="ml-1 h-3.5 w-3.5" />;
  return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />;
}

// ---------------------------------------------------------------------------
// DataTable Component
// ---------------------------------------------------------------------------

export function DataTable<TData>({
  columns,
  data,
  sorting: controlledSorting,
  onSortingChange,
  pagination: controlledPagination,
  onPaginationChange,
  pageCount: controlledPageCount,
  selection,
  onSelectionChange,
  onRowClick,
  expandable = false,
  renderExpanded,
  loading = false,
  emptyState,
  stickyHeader = true,
  virtualized = false,
  className,
}: DataTableProps<TData>) {
  // --- Internal state fallbacks ---
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(-1);

  const sorting = controlledSorting ?? internalSorting;
  const pagination = controlledPagination ?? internalPagination;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
      ...(selection !== undefined ? { rowSelection: selection } : {}),
    },
    onSortingChange: onSortingChange ?? setInternalSorting,
    onPaginationChange: onPaginationChange ?? setInternalPagination,
    ...(onSelectionChange ? { onRowSelectionChange: onSelectionChange, enableRowSelection: true } : {}),
    ...(controlledPageCount !== undefined
      ? { pageCount: controlledPageCount, manualPagination: true }
      : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: controlledSorting ? undefined : getSortedRowModel(),
    getPaginationRowModel: controlledPageCount !== undefined ? undefined : getPaginationRowModel(),
    getExpandedRowModel: expandable ? getExpandedRowModel() : undefined,
  });

  const rows = table.getRowModel().rows;

  // --- Virtualizer ---
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 20,
    enabled: virtualized,
  });

  // --- Keyboard navigation ---
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.min(prev + 1, rows.length - 1));
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter' && focusedRowIndex >= 0 && expandable) {
        e.preventDefault();
        const row = rows[focusedRowIndex];
        if (row) row.toggleExpanded();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedRowIndex, rows, expandable]);

  // --- Pagination info ---
  const totalRows = controlledPageCount !== undefined
    ? controlledPageCount * pagination.pageSize
    : data.length;
  const from = pagination.pageIndex * pagination.pageSize + 1;
  const to = Math.min(from + pagination.pageSize - 1, totalRows);

  // --- Render row (shared between virtual and normal) ---
  function renderRow(row: Row<TData>, index: number) {
    const isExpanded = row.getIsExpanded();
    const isFocused = index === focusedRowIndex;

    return (
      <React.Fragment key={row.id}>
        <tr
          className={cn(
            'border-b border-border transition-colors duration-fast',
            onRowClick || expandable ? 'cursor-pointer' : '',
            isFocused ? 'bg-surface-elevated ring-1 ring-inset ring-accent' : 'hover:bg-surface-elevated/50',
            isExpanded ? 'bg-surface-elevated' : ''
          )}
          onClick={() => {
            setFocusedRowIndex(index);
            if (expandable) row.toggleExpanded();
            onRowClick?.(row.original);
          }}
          tabIndex={0}
          role="row"
          aria-expanded={expandable ? isExpanded : undefined}
          aria-selected={isFocused}
        >
          {row.getVisibleCells().map((cell) => (
            <td key={cell.id} className="px-4 py-3 text-body-sm text-content-primary">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
        {expandable && isExpanded && renderExpanded && (
          <tr className="border-b border-border bg-surface-card">
            <td colSpan={columns.length} className="p-0">
              <div className="animate-slide-up px-4 py-4">
                {renderExpanded(row.original)}
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Table container */}
      <div
        ref={parentRef}
        className={cn(
          'relative overflow-auto rounded-lg border border-border bg-surface-base',
          virtualized ? 'max-h-[calc(100vh-280px)]' : ''
        )}
      >
        <table className="w-full border-collapse text-left">
          {/* Header */}
          <thead
            className={cn(
              'bg-surface-card',
              stickyHeader ? 'sticky top-0 z-10' : ''
            )}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-caption font-semibold uppercase tracking-wider text-content-secondary',
                        canSort ? 'cursor-pointer select-none hover:text-content-primary' : ''
                      )}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      aria-sort={
                        sortDir === 'asc'
                          ? 'ascending'
                          : sortDir === 'desc'
                            ? 'descending'
                            : canSort
                              ? 'none'
                              : undefined
                      }
                      role="columnheader"
                      scope="col"
                    >
                      <div className="flex items-center">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon direction={sortDir} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState ?? <DefaultEmptyState />}
                </td>
              </tr>
            ) : virtualized ? (
              <>
                {virtualizer.getVirtualItems().length > 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0, padding: 0 }}
                    />
                  </tr>
                )}
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return renderRow(row, virtualRow.index);
                })}
                {virtualizer.getVirtualItems().length > 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{
                        height:
                          virtualizer.getTotalSize() -
                          (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                        padding: 0,
                      }}
                    />
                  </tr>
                )}
              </>
            ) : (
              rows.map((row, index) => renderRow(row, index))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center justify-between border-t border-border bg-surface-card px-4 py-3">
          <p className="text-body-sm text-content-secondary">
            Showing <span className="font-mono text-mono-sm text-content-primary">{from}</span>
            {' - '}
            <span className="font-mono text-mono-sm text-content-primary">{to}</span>
            {' of '}
            <span className="font-mono text-mono-sm text-content-primary">{totalRows.toLocaleString()}</span>
          </p>
          <div className="flex items-center gap-1">
            <PaginationButton
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </PaginationButton>
            <PaginationButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </PaginationButton>
            <span className="px-3 text-body-sm text-content-secondary">
              Page{' '}
              <span className="font-mono text-mono-sm text-content-primary">
                {pagination.pageIndex + 1}
              </span>{' '}
              of{' '}
              <span className="font-mono text-mono-sm text-content-primary">
                {table.getPageCount()}
              </span>
            </span>
            <PaginationButton
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </PaginationButton>
            <PaginationButton
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination button
// ---------------------------------------------------------------------------

function PaginationButton({
  children,
  disabled,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-content-secondary transition-colors duration-fast',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:bg-surface-elevated hover:text-content-primary'
      )}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
