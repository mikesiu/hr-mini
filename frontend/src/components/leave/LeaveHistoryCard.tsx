import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  DEFAULT_LEAVE_TINT,
  LEAVE_CODE_TINT,
  formatLeaveDate,
  formatLeaveRange,
  getLeaveTypeCategory,
  type Leave,
  type LeaveCategory,
  type LeaveType,
} from './leaveTypes';

interface LeaveHistoryCardProps {
  leaves: Leave[];
  leaveTypes: LeaveType[];
  category: LeaveCategory;
  loading: boolean;
  onEdit: (leave: Leave) => void;
  onDelete: (leave: Leave) => void;
}

type SortOrder = 'newest' | 'oldest';

const ALL = 'all';
const PAGE_SIZES = ['10', '25', ALL];

const STATUS_TINT: Record<string, string> = {
  active: 'bg-event-union/15 text-event-union',
  cancelled: 'bg-destructive/10 text-destructive',
  pending: 'bg-event-cra/15 text-event-cra',
};

const headClass =
  'sticky top-0 z-10 h-9 bg-muted px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase';

const LeaveHistoryCard: React.FC<LeaveHistoryCardProps> = ({
  leaves,
  leaveTypes,
  category,
  loading,
  onEdit,
  onDelete,
}) => {
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [keyword, setKeyword] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [pageSize, setPageSize] = useState('10');
  const [page, setPage] = useState(0);

  const typeById = useMemo(() => new Map(leaveTypes.map((t) => [t.id, t])), [leaveTypes]);

  // Types and statuses actually present in the data (plus the standard ones)
  const typeOptions = useMemo(() => {
    const ids = new Set(leaves.map((l) => l.leave_type_id));
    return leaveTypes.filter((t) => ids.has(t.id));
  }, [leaves, leaveTypes]);

  const statusOptions = useMemo(() => {
    const present = new Set(['Active', 'Cancelled']);
    leaves.forEach((l) => present.add(l.status));
    return Array.from(present);
  }, [leaves]);

  const rows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const filtered = leaves.filter((leave) => {
      if (typeFilter !== ALL && String(leave.leave_type_id) !== typeFilter) return false;
      if (statusFilter !== ALL && leave.status !== statusFilter) return false;
      if (q) {
        const type = typeById.get(leave.leave_type_id);
        const haystack = [
          leave.start_date,
          leave.end_date,
          formatLeaveDate(leave.start_date),
          formatLeaveDate(leave.end_date),
          leave.reason ?? '',
          type?.code ?? '',
          type?.name ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    const dir = sortOrder === 'newest' ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const diff = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      return diff !== 0 ? diff * dir : (a.id - b.id) * dir;
    });
  }, [leaves, typeFilter, statusFilter, keyword, sortOrder, typeById]);

  // Back to the first page whenever the result set changes shape
  useEffect(() => {
    setPage(0);
  }, [typeFilter, statusFilter, keyword, sortOrder, pageSize, category, leaves.length]);

  const size = pageSize === ALL ? rows.length || 1 : Number(pageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = pageSize === ALL ? rows : rows.slice(currentPage * size, (currentPage + 1) * size);
  const rangeStart = rows.length === 0 ? 0 : currentPage * size + 1;
  const rangeEnd = pageSize === ALL ? rows.length : Math.min(rows.length, (currentPage + 1) * size);

  const hasFilters = typeFilter !== ALL || statusFilter !== ALL || keyword.trim() !== '';
  const clearFilters = () => {
    setTypeFilter(ALL);
    setStatusFilter(ALL);
    setKeyword('');
  };

  const iconAction = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    className?: string,
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-8', className)}
          aria-label={label}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <section className="overflow-hidden rounded-lg border border-solid border-border bg-card text-card-foreground">
      {/* Header + toolbar */}
      <div className="flex flex-col gap-3 border-0 border-solid border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-base font-semibold text-foreground">Leave History</h2>
          <Badge variant="secondary" className="rounded-md tabular-nums">
            {rows.length} record{rows.length === 1 ? '' : 's'}
          </Badge>
          {category !== 'all' && (
            <Badge variant="outline" className="rounded-md capitalize">
              {category} only
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger size="sm" className="w-full sm:w-52" aria-label="Filter by leave type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Types</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name} ({t.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger size="sm" className="w-full sm:w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:max-w-xs sm:flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Filter by date or reason..."
              aria-label="Filter by date or reason"
              className="h-8 px-8 text-sm"
            />
            {keyword && (
              <button
                type="button"
                aria-label="Clear filter text"
                onClick={() => setKeyword('')}
                className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))}
            aria-label="Toggle sort order"
          >
            {sortOrder === 'newest' ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
            {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <FilterX />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      {loading && leaves.length === 0 ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <CalendarX2 className="size-10 text-muted-foreground/60" aria-hidden="true" />
          <p className="m-0 text-sm font-medium text-foreground">
            {hasFilters ? 'No records match your filters' : 'No leave records found'}
          </p>
          <p className="m-0 text-sm text-muted-foreground">
            {hasFilters
              ? 'Try changing or resetting the filters.'
              : category === 'all'
                ? 'No leave has been recorded for this employee in the selected year.'
                : 'No leave records found for this category.'}
          </p>
          {hasFilters && (
            <Button variant="outline" size="sm" className="mt-2" onClick={clearFilters}>
              <FilterX />
              Reset filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table containerClassName="max-h-[38rem] overflow-y-auto">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={headClass}>Leave Type</TableHead>
                <TableHead className={headClass}>Dates</TableHead>
                <TableHead className={cn(headClass, 'text-right')}>Days</TableHead>
                <TableHead className={headClass}>Status</TableHead>
                <TableHead className={headClass}>Reason</TableHead>
                <TableHead className={cn(headClass, 'text-right')}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((leave) => {
                const type = typeById.get(leave.leave_type_id);
                const code = type?.code.toUpperCase() ?? '';
                const cancelled = leave.status.toLowerCase() === 'cancelled';
                const tint =
                  LEAVE_CODE_TINT[code] ??
                  (getLeaveTypeCategory(code) === 'vacation'
                    ? LEAVE_CODE_TINT.VAC
                    : DEFAULT_LEAVE_TINT);
                return (
                  <TableRow key={leave.id} className={cn(cancelled && 'opacity-65')}>
                    <TableCell className="px-3">
                      <div className="flex items-center gap-2">
                        {type && (
                          <Badge
                            variant="secondary"
                            className={cn('rounded-md px-1.5 text-[11px] font-medium', tint)}
                          >
                            {type.code}
                          </Badge>
                        )}
                        <span className="text-sm text-foreground">{type?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 text-sm tabular-nums">
                      {formatLeaveRange(leave.start_date, leave.end_date)}
                    </TableCell>
                    <TableCell className="px-3 text-right text-sm font-medium tabular-nums">
                      {leave.days_requested}
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'rounded-md px-1.5 text-[11px] font-medium',
                          STATUS_TINT[leave.status.toLowerCase()] ?? DEFAULT_LEAVE_TINT,
                        )}
                      >
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[16rem] px-3 text-sm">
                      {leave.reason ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              className="block cursor-default truncate rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                              {leave.reason}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm whitespace-pre-wrap">
                            {leave.reason}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">{'\u2014'}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {iconAction('Edit', <Pencil />, () => onEdit(leave))}
                        {iconAction(
                          'Delete',
                          <Trash2 />,
                          () => onDelete(leave),
                          'text-destructive hover:text-destructive',
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-0 border-solid border-t border-border px-4 py-2.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger size="sm" className="w-20" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === ALL ? 'All' : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="tabular-nums">
                {rangeStart}&ndash;{rangeEnd} of {rows.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Previous page"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Next page"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default LeaveHistoryCard;
