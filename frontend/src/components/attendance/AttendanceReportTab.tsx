import React from 'react';
import { FileDown, FileText, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type {
  AttendanceDetailedReport,
  AttendanceReport,
  DetailedRowWithSubtotal,
  Employee,
  PayPeriod,
} from './attendanceTypes';
import { ALL_VALUE } from './attendanceHelpers';
import SummaryStrip from './SummaryStrip';

interface AttendanceReportTabProps {
  companySelected: boolean;
  payPeriods: PayPeriod[];
  employees: Employee[];
  reportPayPeriod: PayPeriod | null;
  reportEmployeeId: string;
  reportFilters: { start_date: string; end_date: string };
  reportView: 'summary' | 'detailed';
  report: AttendanceReport | null;
  detailedReport: AttendanceDetailedReport | null;
  title: string;
  headcount: number | string;
  rowsWithSubtotals: DetailedRowWithSubtotal[];
  onPayPeriodChange: (periodNumber: string) => void;
  onEmployeeChange: (employeeId: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onGenerate: () => void;
  onViewChange: (view: 'summary' | 'detailed') => void;
  onPrint: () => void;
  onExport: () => void;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const headClass =
  'sticky top-0 z-10 h-9 bg-muted px-3 text-xs font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase';
const num = 'px-3 py-2 text-right text-xs tabular-nums';

const DayLeaveCell: React.FC<{ leave?: string; holiday?: string }> = ({ leave, holiday }) => (
  <div className="flex flex-wrap gap-1">
    {leave && (
      <Badge variant="secondary" className="rounded-md bg-sky-500/15 px-1.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
        {leave}
      </Badge>
    )}
    {holiday && (
      <Badge variant="secondary" className="rounded-md bg-amber-500/15 px-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
        {holiday}
      </Badge>
    )}
    {!leave && !holiday && <span className="text-muted-foreground/50">{'\u2014'}</span>}
  </div>
);

const AttendanceReportTab: React.FC<AttendanceReportTabProps> = ({
  companySelected,
  payPeriods,
  employees,
  reportPayPeriod,
  reportEmployeeId,
  reportFilters,
  reportView,
  report,
  detailedReport,
  title,
  headcount,
  rowsWithSubtotals,
  onPayPeriodChange,
  onEmployeeChange,
  onStartDateChange,
  onEndDateChange,
  onGenerate,
  onViewChange,
  onPrint,
  onExport,
}) => {
  const noReport = !report && !detailedReport;

  return (
    <div className="flex flex-col gap-4">
      {/* Report filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-solid border-border bg-card p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-period" className={labelClass}>
            Pay Period
          </Label>
          <Select
            value={reportPayPeriod ? `${reportPayPeriod.period_number}` : ALL_VALUE}
            onValueChange={(v) => onPayPeriodChange(v === ALL_VALUE ? '' : v)}
            disabled={!companySelected || payPeriods.length === 0}
          >
            <SelectTrigger id="report-period" className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>None</SelectItem>
              {payPeriods.map((p) => (
                <SelectItem key={p.period_number} value={`${p.period_number}`}>
                  Period {p.period_number} ({p.start_date} to {p.end_date})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-employee" className={labelClass}>
            Employee
          </Label>
          <Select
            value={reportEmployeeId || ALL_VALUE}
            onValueChange={(v) => onEmployeeChange(v === ALL_VALUE ? '' : v)}
            disabled={!companySelected || employees.length === 0}
          >
            <SelectTrigger id="report-employee" className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-start" className={labelClass}>
            Start Date
          </Label>
          <Input
            id="report-start"
            type="date"
            className="w-40 tabular-nums"
            value={reportFilters.start_date}
            onChange={(e) => onStartDateChange(e.target.value)}
            disabled={!!reportPayPeriod}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-end" className={labelClass}>
            End Date
          </Label>
          <Input
            id="report-end"
            type="date"
            className="w-40 tabular-nums"
            value={reportFilters.end_date}
            onChange={(e) => onEndDateChange(e.target.value)}
            disabled={!!reportPayPeriod}
          />
        </div>

        <Button onClick={onGenerate}>
          <FileText />
          Generate Report
        </Button>
      </div>

      {/* View toggle + output actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Report view"
          className="inline-flex rounded-md border border-solid border-border bg-card p-0.5"
        >
          {(['summary', 'detailed'] as const).map((view) => (
            <Button
              key={view}
              size="sm"
              variant={reportView === view ? 'default' : 'ghost'}
              aria-pressed={reportView === view}
              className="capitalize"
              onClick={() => onViewChange(view)}
            >
              {view}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrint} disabled={noReport}>
            <Printer />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={onExport} disabled={noReport}>
            <FileDown />
            Export Excel
          </Button>
        </div>
      </div>

      {noReport && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-solid border-border bg-card px-6 py-12 text-center">
          <FileText className="size-10 text-muted-foreground/60" aria-hidden="true" />
          <p className="m-0 text-sm font-medium text-foreground">No report generated yet</p>
          <p className="m-0 text-sm text-muted-foreground">
            Pick a pay period or date range, then generate a {reportView} report.
          </p>
          <Button size="sm" className="mt-2" onClick={onGenerate}>
            Generate Report
          </Button>
        </div>
      )}

      {/* Summary report */}
      {report && reportView === 'summary' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="m-0 text-base font-semibold text-foreground">Time Attendance - {title}</h2>
            <span className="text-sm text-muted-foreground">Total number of headcount: {headcount}</span>
          </div>
          <SummaryStrip
            regular={report.total_regular_hours}
            ot={report.total_ot_hours}
            weekendOT={report.total_weekend_ot_hours}
            statHoliday={report.total_stat_holiday_hours}
          />
          <div className="overflow-hidden rounded-lg border border-solid border-border bg-card">
            <Table containerClassName="max-h-[60vh] overflow-auto">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={headClass}>Employee</TableHead>
                  <TableHead className={cn(headClass, 'text-right')}>Regular Hours</TableHead>
                  <TableHead className={cn(headClass, 'text-right')}>OT Hours</TableHead>
                  <TableHead className={cn(headClass, 'text-right')}>Weekend OT</TableHead>
                  <TableHead className={cn(headClass, 'text-right')}>Stat Holiday</TableHead>
                  <TableHead className={cn(headClass, 'text-right')}>Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.summary.map((item) => (
                  <TableRow key={item.employee_id}>
                    <TableCell className="px-3 py-2 text-sm font-medium text-foreground">{item.employee_name}</TableCell>
                    <TableCell className={num}>{item.total_regular_hours.toFixed(2)}</TableCell>
                    <TableCell className={num}>{item.total_ot_hours.toFixed(2)}</TableCell>
                    <TableCell className={num}>{item.total_weekend_ot_hours.toFixed(2)}</TableCell>
                    <TableCell className={num}>{item.total_stat_holiday_hours.toFixed(2)}</TableCell>
                    <TableCell className={num}>{item.total_days}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Detailed report */}
      {detailedReport && reportView === 'detailed' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="m-0 text-base font-semibold text-foreground">Time Attendance - {title}</h2>
            <span className="text-sm text-muted-foreground">Total number of headcount: {headcount}</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-solid border-border bg-card">
            <Table containerClassName="max-h-[70vh] overflow-auto" className="min-w-[900px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={headClass}>Employee</TableHead>
                  <TableHead className={headClass}>Date</TableHead>
                  <TableHead className={headClass}>Leave / Stat Holiday</TableHead>
                  <TableHead className={headClass}>Start Time</TableHead>
                  <TableHead className={headClass}>End Time</TableHead>
                  <TableHead className={headClass}>Day</TableHead>
                  <TableHead className={cn(headClass, 'text-right')}>Reg Hours</TableHead>
                  <TableHead className={cn(headClass, 'text-right')}>OT Hours</TableHead>
                  <TableHead className={cn(headClass, 'text-right')}>Weekend OT</TableHead>
                  <TableHead className={cn(headClass, 'text-right')}>Stat Holiday</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsWithSubtotals.map((item, index) => {
                  if (item.type === 'detail' && item.row) {
                    const row = item.row;
                    const weekend = row.day_type === 'Saturday' || row.day_type === 'Sunday';
                    return (
                      <TableRow
                        key={`${row.employee_id}-${row.date}-${index}`}
                        className={cn(weekend && 'bg-muted/70')}
                      >
                        <TableCell className="px-3 py-1.5 text-xs font-medium text-foreground">{row.employee_name}</TableCell>
                        <TableCell className="px-3 py-1.5 text-xs tabular-nums">{row.date}</TableCell>
                        <TableCell className="px-3 py-1.5 text-xs">
                          <DayLeaveCell leave={row.leave_type} holiday={row.stat_holiday_name} />
                        </TableCell>
                        <TableCell className="px-3 py-1.5 text-xs tabular-nums">{row.check_in || '-'}</TableCell>
                        <TableCell className="px-3 py-1.5 text-xs tabular-nums">{row.check_out || '-'}</TableCell>
                        <TableCell className="px-3 py-1.5 text-xs">{row.day_type}</TableCell>
                        <TableCell className={cn(num, 'py-1.5')}>{row.regular_hours.toFixed(2)}</TableCell>
                        <TableCell className={cn(num, 'py-1.5')}>{row.ot_hours.toFixed(2)}</TableCell>
                        <TableCell className={cn(num, 'py-1.5')}>{row.weekend_ot_hours.toFixed(2)}</TableCell>
                        <TableCell className={cn(num, 'py-1.5')}>{(row.stat_holiday_hours || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  } else if (item.type === 'subtotal' && item.subtotal) {
                    const subtotal = item.subtotal;
                    return (
                      <TableRow
                        key={`subtotal-${subtotal.employee_id}-${index}`}
                        className="bg-muted/60 hover:bg-muted/60"
                      >
                        <TableCell colSpan={6} className="px-3 py-2 text-right text-xs font-semibold">
                          Subtotal for {subtotal.employee_name} ({subtotal.employee_id}):
                        </TableCell>
                        <TableCell className={cn(num, 'font-semibold')}>{subtotal.regular_hours.toFixed(2)}</TableCell>
                        <TableCell className={cn(num, 'font-semibold')}>{subtotal.ot_hours.toFixed(2)}</TableCell>
                        <TableCell className={cn(num, 'font-semibold')}>{subtotal.weekend_ot_hours.toFixed(2)}</TableCell>
                        <TableCell className={cn(num, 'font-semibold')}>{(subtotal.stat_holiday_hours || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  }
                  return null;
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReportTab;
