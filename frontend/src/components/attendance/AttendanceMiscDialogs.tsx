import React, { useRef } from 'react';
import { Eye, Info, Loader2, TriangleAlert, Upload } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AttendanceUploadPreview, AttendanceUploadResponse } from './attendanceTypes';

const labelClass = 'text-xs font-medium text-muted-foreground';
const headClass =
  'sticky top-0 z-10 h-9 bg-muted px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase';

/* ---------------------------------- Upload --------------------------------- */

interface UploadCsvDialogProps {
  open: boolean;
  file: File | null;
  previewData: AttendanceUploadPreview | null;
  uploadResult: AttendanceUploadResponse | null;
  previewLoading: boolean;
  uploadLoading: boolean;
  onFileChange: (file: File | null) => void;
  onPreview: () => void;
  onImport: () => void;
  onClose: () => void;
}

function statusBadgeClass(status: string) {
  if (status === 'valid') return 'bg-event-union/15 text-event-union';
  if (status === 'duplicate') return 'bg-event-cra/15 text-event-cra';
  return 'bg-destructive/10 text-destructive';
}

export const UploadCsvDialog: React.FC<UploadCsvDialogProps> = ({
  open,
  file,
  previewData,
  uploadResult,
  previewLoading,
  uploadLoading,
  onFileChange,
  onPreview,
  onImport,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = previewLoading || uploadLoading;

  const resultTiles = uploadResult
    ? [
        { label: 'Imported', value: uploadResult.imported_count, tint: 'bg-event-union/15 text-event-union' },
        { label: 'Skipped', value: uploadResult.skipped_count, tint: 'bg-event-cra/15 text-event-cra' },
        { label: 'Errors', value: uploadResult.error_count, tint: 'bg-destructive/10 text-destructive' },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upload Attendance CSV</DialogTitle>
          <DialogDescription>
            Choose a punch-log CSV, preview the rows, then confirm import.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-0.5 pr-1">
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-sm font-semibold text-foreground">Select CSV File</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              />
              <Button variant="outline" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                <Upload />
                Choose File
              </Button>
              {file && <span className="text-sm text-muted-foreground">{file.name}</span>}
            </div>
          </div>

          {file && !uploadResult && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onPreview} disabled={!file || busy}>
                  {previewLoading ? <Loader2 className="animate-spin" /> : <Eye />}
                  Preview
                </Button>
                {previewData && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {previewData.valid_rows} valid, {previewData.invalid_rows} invalid,{' '}
                    {previewData.duplicate_rows} duplicates
                  </span>
                )}
              </div>

              {previewData && (
                <div className="flex flex-col gap-2">
                  <h3 className="m-0 text-sm font-semibold text-foreground">Preview Results</h3>
                  <div className="overflow-hidden rounded-lg border border-solid border-border">
                    <Table containerClassName="max-h-72 overflow-y-auto">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          {[
                            'Row',
                            'Person ID',
                            'Name',
                            'Date',
                            'Check-In',
                            'Check-Out',
                            'Status',
                            'Will Import',
                            'Error',
                          ].map((h) => (
                            <TableHead key={h} className={headClass}>
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.rows.map((row) => (
                          <TableRow key={row.row_number}>
                            <TableCell className="px-3 text-sm tabular-nums">{row.row_number}</TableCell>
                            <TableCell className="px-3 text-sm">{row.person_id}</TableCell>
                            <TableCell className="px-3 text-sm">{row.name}</TableCell>
                            <TableCell className="px-3 text-sm tabular-nums">{row.date}</TableCell>
                            <TableCell className="px-3 text-sm tabular-nums">{row.check_in || '-'}</TableCell>
                            <TableCell className="px-3 text-sm tabular-nums">{row.check_out || '-'}</TableCell>
                            <TableCell className="px-3">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'rounded-md px-1.5 text-[11px] font-medium capitalize',
                                  statusBadgeClass(row.status),
                                )}
                              >
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-3">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'rounded-md px-1.5 text-[11px] font-medium',
                                  row.status === 'valid'
                                    ? 'bg-event-union/15 text-event-union'
                                    : 'bg-destructive/10 text-destructive',
                                )}
                              >
                                {row.status === 'valid' ? 'Yes' : 'No'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-3 text-xs text-destructive">
                              {row.error_message || ''}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadResult && (
            <div className="flex flex-col gap-3">
              <h3 className="m-0 text-sm font-semibold text-foreground">Import Results</h3>
              <div className="grid grid-cols-3 gap-3">
                {resultTiles.map((tile) => (
                  <div
                    key={tile.label}
                    className={cn('flex flex-col items-center rounded-lg px-3 py-3 text-center', tile.tint)}
                  >
                    <span className="text-2xl font-semibold tabular-nums">{tile.value}</span>
                    <span className="text-xs">{tile.label}</span>
                  </div>
                ))}
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="m-0 text-sm font-semibold text-foreground">Error Details</h3>
                  <div className="overflow-hidden rounded-lg border border-solid border-border">
                    <Table containerClassName="max-h-52 overflow-y-auto">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className={headClass}>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadResult.errors.map((err, index) => (
                          <TableRow key={index}>
                            <TableCell className="px-3 text-xs text-destructive">{err}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {uploadResult ? 'Close' : 'Cancel'}
          </Button>
          {previewData && !uploadResult && (
            <Button onClick={onImport} disabled={busy || previewData.valid_rows === 0}>
              {uploadLoading && <Loader2 className="animate-spin" />}
              Confirm Import ({previewData.valid_rows})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ------------------------------ Delete by range ----------------------------- */

interface DeleteRangeDialogProps {
  open: boolean;
  startDate: string;
  endDate: string;
  employeeId: string;
  loading: boolean;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteRangeDialog: React.FC<DeleteRangeDialogProps> = ({
  open,
  startDate,
  endDate,
  employeeId,
  loading,
  onStartChange,
  onEndChange,
  onConfirm,
  onClose,
}) => (
  <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Attendance Records</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. All attendance records within the specified date range will
          be permanently deleted.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-start" className={labelClass}>
              Start Date
            </Label>
            <Input
              id="delete-start"
              type="date"
              value={startDate}
              onChange={(e) => onStartChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-end" className={labelClass}>
              End Date
            </Label>
            <Input
              id="delete-end"
              type="date"
              value={endDate}
              onChange={(e) => onEndChange(e.target.value)}
            />
          </div>
        </div>
        {employeeId && (
          <Alert>
            <Info />
            <AlertDescription>
              Only records for employee {employeeId} will be deleted (based on current filter).
            </AlertDescription>
          </Alert>
        )}
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          disabled={!startDate || !endDate || loading}
          onClick={(e) => {
            e.preventDefault();
            onConfirm();
          }}
        >
          {loading && <Loader2 className="animate-spin" />}
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/* ----------------------------- Override subtotals ---------------------------- */

export interface OverrideFormData {
  override_regular_hours: string;
  override_ot_hours: string;
  override_weekend_ot_hours: string;
  override_stat_holiday_hours: string;
  reason: string;
}

interface OverrideSubtotalsDialogProps {
  open: boolean;
  /** null when no employee + pay period are selected (nothing to override) */
  context: {
    employeeLabel: string;
    periodLabel: string;
    calculated: { regular: number; ot: number; weekendOT: number; statHoliday: number };
  } | null;
  formData: OverrideFormData;
  hasExisting: boolean;
  loading: boolean;
  onChange: (patch: Partial<OverrideFormData>) => void;
  onClear: () => void;
  onSave: () => void;
  onClose: () => void;
}

export const OverrideSubtotalsDialog: React.FC<OverrideSubtotalsDialogProps> = ({
  open,
  context,
  formData,
  hasExisting,
  loading,
  onChange,
  onClear,
  onSave,
  onClose,
}) => {
  const calc = context?.calculated;
  const referenceFields: [string, number | undefined][] = [
    ['Calculated Regular Hours', calc?.regular],
    ['Calculated OT Hours', calc?.ot],
    ['Calculated Weekend OT', calc?.weekendOT],
    ['Calculated Stat Holiday', calc?.statHoliday],
  ];
  const overrideFields: [keyof OverrideFormData, string][] = [
    ['override_regular_hours', 'Override Regular Hours'],
    ['override_ot_hours', 'Override OT Hours'],
    ['override_weekend_ot_hours', 'Override Weekend OT'],
    ['override_stat_holiday_hours', 'Override Stat Holiday'],
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Override Period Subtotals</DialogTitle>
          <DialogDescription>
            Replace the calculated pay period totals for a single employee.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-0.5 pr-1">
          {context && (
            <>
              <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                <span>Employee: {context.employeeLabel}</span>
                <span>Pay Period: {context.periodLabel}</span>
              </div>

              <section className="flex flex-col gap-3">
                <h3 className="m-0 text-sm font-semibold text-foreground">
                  Calculated Values (Reference)
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {referenceFields.map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-1.5">
                      <Label className={labelClass}>{label}</Label>
                      <Input value={(value ?? 0).toFixed(2)} disabled readOnly className="tabular-nums" />
                    </div>
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <h3 className="m-0 text-sm font-semibold text-foreground">Override Values</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {overrideFields.map(([key, label]) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label htmlFor={`ovr-${key}`} className={labelClass}>
                        {label}
                      </Label>
                      <Input
                        id={`ovr-${key}`}
                        type="number"
                        step={0.25}
                        min={0}
                        className="tabular-nums"
                        value={formData[key]}
                        onChange={(e) => onChange({ [key]: e.target.value })}
                      />
                      <p className="m-0 text-xs text-muted-foreground">Leave empty to use calculated</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ovr-reason" className={labelClass}>
                    Reason for Override
                  </Label>
                  <Textarea
                    id="ovr-reason"
                    rows={3}
                    value={formData.reason}
                    onChange={(e) => onChange({ reason: e.target.value })}
                    placeholder="Enter reason for overriding subtotals"
                  />
                </div>
              </section>
            </>
          )}
          {!context && (
            <Alert>
              <TriangleAlert />
              <AlertDescription>
                Select an employee and a pay period to override subtotals.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {hasExisting && (
            <Button variant="destructive" onClick={onClear} disabled={loading}>
              Clear Override
            </Button>
          )}
          <Button onClick={onSave} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
