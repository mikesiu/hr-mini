import React, { useRef } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const headClass =
  'sticky top-0 z-10 h-9 bg-muted px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase';
const labelClass = 'text-xs font-medium text-muted-foreground';

interface PayrollImportDialogProps {
  open: boolean;
  file: File | null;
  preview: any;
  loading: boolean;
  onFileChange: (file: File | null) => void;
  onPreview: () => void;
  onImport: () => void;
  onClose: () => void;
}

export const PayrollImportDialog: React.FC<PayrollImportDialogProps> = ({
  open,
  file,
  preview,
  loading,
  onFileChange,
  onPreview,
  onImport,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasIssues = !!(preview?.summary?.unmatched || preview?.summary?.ambiguous);
  const alertTint = !preview
    ? ''
    : !preview.can_import
      ? ''
      : hasIssues
        ? 'border-event-cra/40 bg-event-cra/10 text-event-cra'
        : 'border-event-union/40 bg-event-union/10 text-event-union';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Payroll Details (EmplDetl)</DialogTitle>
          <DialogDescription>
            Upload an EmplDetl Excel export. Same Import button supports both:
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-0.5 pr-1">
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">All staff after one payroll</strong> (e.g.
              EmplDetl_QWP.xlsx) — many employees, one cheque each
            </li>
            <li>
              <strong className="text-foreground">One staff, many pay periods</strong> (e.g.
              EmplDetl_Harjit.xlsx) — one employee, multiple cheques / YTD
            </li>
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload />
              Choose Excel file
            </Button>
            {file && <span className="text-sm text-muted-foreground">Selected: {file.name}</span>}
          </div>

          {preview && (
            <div className="flex flex-col gap-2">
              <Alert variant={preview.can_import ? 'default' : 'destructive'} className={alertTint}>
                <AlertDescription className="text-current">
                  {preview.report_kind === 'single_employee_multi_pay'
                    ? 'Detected: one employee, multiple pay lines. '
                    : preview.report_kind === 'all_staff_single_pay'
                      ? 'Detected: all-staff single payroll. '
                      : ''}
                  Matched {preview.summary?.matched}/{preview.summary?.total}. Unmatched:{' '}
                  {preview.summary?.unmatched}, Ambiguous: {preview.summary?.ambiguous}.
                  {preview.can_import && hasIssues
                    ? ' Import will save matched rows only (overwrites existing); fix unmatched names and re-upload later.'
                    : ''}
                </AlertDescription>
              </Alert>
              <div className="overflow-hidden rounded-lg border border-solid border-border">
                <Table containerClassName="max-h-72 overflow-y-auto">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {['Name', 'Match', 'Employee', 'Payroll Date', 'Cheque', 'Gross', 'Benefits', 'Vac Paid', 'Vac Earned'].map(
                        (h) => (
                          <TableHead key={h} className={headClass}>
                            {h}
                          </TableHead>
                        ),
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(preview.rows || []).slice(0, 50).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="px-3 text-sm">{r.employee_name}</TableCell>
                        <TableCell className="px-3 text-sm">{r.match_status}</TableCell>
                        <TableCell className="px-3 text-sm">
                          {r.matched_name || r.employee_id || '—'}
                        </TableCell>
                        <TableCell className="px-3 text-sm tabular-nums">{r.pay_date || '—'}</TableCell>
                        <TableCell className="px-3 text-sm tabular-nums">{r.cheque_no || '—'}</TableCell>
                        <TableCell className="px-3 text-sm tabular-nums">{r.gross}</TableCell>
                        <TableCell className="px-3 text-sm tabular-nums">{r.benefits ?? 0}</TableCell>
                        <TableCell className="px-3 text-sm tabular-nums">{r.vacation_paid}</TableCell>
                        <TableCell className="px-3 text-sm tabular-nums">{r.vacation_earned}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onPreview} disabled={!file || loading}>
            Preview
          </Button>
          <Button onClick={onImport} disabled={!preview?.can_import || loading}>
            {loading && <Loader2 className={cn('animate-spin')} />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface OpeningBalanceDialogProps {
  open: boolean;
  year: number;
  amount: string;
  onYearChange: (year: number) => void;
  onAmountChange: (amount: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export const OpeningBalanceDialog: React.FC<OpeningBalanceDialogProps> = ({
  open,
  year,
  amount,
  onYearChange,
  onAmountChange,
  onSave,
  onClose,
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Vacation $ Opening Balance</DialogTitle>
        <DialogDescription>
          Brought-forward vacation dollar balance as of Jan 1 for the selected employee/company.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opening-year" className={labelClass}>
            Year
          </Label>
          <Input
            id="opening-year"
            type="number"
            className="tabular-nums"
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opening-amount" className={labelClass}>
            Opening amount ($)
          </Label>
          <Input
            id="opening-amount"
            type="number"
            step={0.01}
            className="tabular-nums"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
          />
          <p className="m-0 text-xs text-muted-foreground">
            {amount !== ''
              ? `Current saved / entered value for ${year}`
              : `No opening saved yet for ${year}`}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSave}>Save</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
