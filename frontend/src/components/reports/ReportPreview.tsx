import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSearch, Loader2 } from 'lucide-react';
import { ReportSummary, GroupedReportData, ReportFilters as FilterValues } from '../../types/reports';
import { formatLeaveDays, leaveGroupHeading } from '../../utils/leaveReportFormat';
import { useCompanyFilter } from '../../contexts/CompanyFilterContext';
import { FILTER_CONFIGS } from '../../utils/filterValidation';
import { formatDate, getReportColumns } from './reportColumns';
import type { ReportColumn } from './reportColumns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface ReportPreviewProps {
  reportType: string;
  data: any[] | GroupedReportData[];
  summary: ReportSummary | null;
  loading?: boolean;
  isGrouped?: boolean;
  appliedFilters?: FilterValues;
}

const SKIP_FILTER_KEYS = new Set([
  'sort_by',
  'sort_direction',
  'group_by',
  'group_by_secondary',
]);

const headClass =
  'sticky top-0 z-10 h-9 bg-muted px-3 text-xs font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase shadow-[inset_0_-1px_0_var(--border)]';
const cellClass = 'px-3 py-2 text-sm';
const alignClass = (a?: ReportColumn['align']) =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : undefined;

/** One report table (flat page, group, or subgroup) driven by the column definitions. */
const ReportTable: React.FC<{
  reportType: string;
  columns: ReportColumn[];
  rows: any[];
  subtotalDays?: number | null;
  maxHeightClass?: string;
}> = ({ reportType, columns, rows, subtotalDays, maxHeightClass }) => {
  const hasGroups = columns.some((c) => c.group);

  // Spanning header cells for consecutive columns that share a group
  const groupCells: { label?: string; span: number; index: number }[] = [];
  if (hasGroups) {
    columns.forEach((c, index) => {
      const last = groupCells[groupCells.length - 1];
      if (c.group && last && last.label === c.group) last.span += 1;
      else groupCells.push({ label: c.group, span: 1, index });
    });
  }

  const daysIndex = columns.findIndex((c) => c.header === 'Days');
  const showSubtotal =
    reportType === 'leave_taken' && subtotalDays !== undefined && subtotalDays !== null && daysIndex >= 0;
  const trailing = columns.length - daysIndex - 1;

  return (
    <Table containerClassName={cn('overflow-auto', maxHeightClass)}>
      <TableHeader>
        {hasGroups && (
          <TableRow className="hover:bg-transparent">
            {groupCells.map((g) =>
              g.label ? (
                <TableHead key={g.index} colSpan={g.span} className={cn(headClass, 'text-center')}>
                  {g.label}
                </TableHead>
              ) : (
                <TableHead key={g.index} rowSpan={2} className={headClass}>
                  {columns[g.index].header}
                </TableHead>
              )
            )}
          </TableRow>
        )}
        <TableRow className="hover:bg-transparent">
          {columns
            .filter((c) => !hasGroups || c.group)
            .map((c, i) => (
              <TableHead
                key={`${c.header}-${i}`}
                className={cn(headClass, alignClass(c.align), hasGroups && 'top-9')}
              >
                {c.header}
              </TableHead>
            ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((record, rowIndex) => (
          <TableRow key={rowIndex}>
            {columns.map((c, ci) => (
              <TableCell key={`${c.header}-${ci}`} className={cn(cellClass, alignClass(c.align))}>
                {c.render(record)}
              </TableCell>
            ))}
          </TableRow>
        ))}
        {showSubtotal && (
          <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
            <TableCell colSpan={daysIndex} className={cn(cellClass, 'text-right')}>
              Subtotal
            </TableCell>
            <TableCell className={cn(cellClass, 'text-center tabular-nums')}>
              {formatLeaveDays(subtotalDays)}
            </TableCell>
            {trailing > 0 && <TableCell colSpan={trailing} />}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  reportType,
  data,
  summary,
  loading = false,
  isGrouped = false,
  appliedFilters,
}) => {
  const { companies } = useCompanyFilter();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    setPage(0);
  }, [reportType, data, rowsPerPage]);

  const formatFilterValue = (key: string, value: any): string | null => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (key === 'company_id') {
      const company = companies.find((c) => c.id === value);
      return company
        ? `${company.legal_name}${company.trade_name ? ` (${company.trade_name})` : ''}`
        : String(value);
    }
    if (key === 'employee_ids') {
      const ids = String(value).split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) return null;
      return ids.length === 1 ? ids[0] : `${ids.length} selected`;
    }
    if (key === 'include_inactive' || key === 'include_history' || key === 'is_expired') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  const filterSummaryChips = useMemo(() => {
    const source: Record<string, any> = {
      ...(summary?.filters_applied || {}),
      ...(appliedFilters || {}),
    };
    const chips: { key: string; label: string; value: string }[] = [];
    Object.entries(source).forEach(([key, value]) => {
      if (SKIP_FILTER_KEYS.has(key)) return;
      const display = formatFilterValue(key, value);
      if (!display) return;
      const config = FILTER_CONFIGS.find((f) => f.name === key);
      const label = config?.label
        || (key === 'year' ? 'Year' : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
      // Prefer appliedFilters over summary when both present — de-dupe by key
      const existing = chips.findIndex((c) => c.key === key);
      if (existing >= 0) chips[existing] = { key, label, value: display };
      else chips.push({ key, label, value: display });
    });
    return chips;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- formatFilterValue uses companies
  }, [appliedFilters, summary?.filters_applied, companies]);

  const flatRows = useMemo(
    () => (isGrouped ? [] : (data as any[])),
    [isGrouped, data]
  );
  const totalRecordCount = summary?.total_records ?? (isGrouped
    ? (data as GroupedReportData[]).reduce((sum, g) => sum + (g.group_count || g.records?.length || 0), 0)
    : flatRows.length);
  const totalPages = isGrouped ? 1 : Math.max(1, Math.ceil(flatRows.length / rowsPerPage));
  const pageRows = useMemo(() => {
    if (isGrouped) return [];
    return flatRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [flatRows, isGrouped, page, rowsPerPage]);

  const columns = useMemo(() => getReportColumns(reportType), [reportType]);

  const groupTitle = (group: GroupedReportData) =>
    reportType === 'leave_taken'
      ? leaveGroupHeading(group)
      : `${group.group_value} (${group.group_count} records)`;

  const renderGroupedData = () => {
    if (!isGrouped || !Array.isArray(data)) return null;
    const groupedData = data as GroupedReportData[];

    return (
      <div className="space-y-4 p-4">
        {groupedData.map((group, groupIndex) => (
          <section key={groupIndex} className="overflow-hidden rounded-md border border-solid border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/60 px-3 py-2">
              <h3 className="m-0 text-sm font-semibold text-foreground">{groupTitle(group)}</h3>
              {reportType !== 'leave_taken' && group.group_summary && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(group.group_summary).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="tabular-nums">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {group.records && group.records.length > 0 && (
              <ReportTable
                reportType={reportType}
                columns={columns}
                rows={group.records}
                subtotalDays={group.group_summary?.total_days}
              />
            )}

            {group.subgroups && group.subgroups.length > 0 && (
              <div className="space-y-3 border-0 border-t border-solid border-border p-3">
                {group.subgroups.map((subgroup, subIndex) => (
                  <div key={subIndex} className="overflow-hidden rounded-md border border-solid border-border">
                    <h4 className="m-0 bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground">
                      {groupTitle(subgroup)}
                    </h4>
                    {subgroup.records && subgroup.records.length > 0 && (
                      <ReportTable
                        reportType={reportType}
                        columns={columns}
                        rows={subgroup.records}
                        subtotalDays={subgroup.group_summary?.total_days}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="gap-0 overflow-hidden py-0" aria-busy="true">
        <div className="flex items-center gap-2 border-0 border-b border-solid border-border px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Generating report...
        </div>
        <div className="space-y-2 p-4">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      {/* Metadata strip: record count, active filters, generated date */}
      <div className="flex flex-wrap items-center gap-2 border-0 border-b border-solid border-border px-4 py-2.5">
        <Badge variant="secondary" className="tabular-nums">
          {totalRecordCount} record{totalRecordCount === 1 ? '' : 's'}
        </Badge>
        {filterSummaryChips.map((chip) => (
          <Badge key={chip.key} variant="outline" className="font-normal">
            {chip.label}: {chip.value}
          </Badge>
        ))}
        {summary?.generated_at && (
          <span className="ml-auto text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            Generated {formatDate(summary.generated_at)}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <FileSearch className="size-8 text-muted-foreground" />
          <p className="m-0 text-sm font-medium text-foreground">No data found</p>
          <p className="m-0 text-sm text-muted-foreground">
            No data found for the selected filters. Try adjusting your filter criteria.
          </p>
        </div>
      ) : isGrouped ? (
        renderGroupedData()
      ) : (
        <>
          <ReportTable
            reportType={reportType}
            columns={columns}
            rows={pageRows}
            maxHeightClass="max-h-[65vh]"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-0 border-t border-solid border-border px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Rows
              <Select
                value={String(rowsPerPage)}
                onValueChange={(v) => {
                  setRowsPerPage(parseInt(v, 10));
                  setPage(0);
                }}
              >
                <SelectTrigger size="sm" className="w-[76px]" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {Math.min(page + 1, totalPages)} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Previous page"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Next page"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
