import React from 'react';
import { Info, Loader2, TriangleAlert } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

const labelClass = 'text-xs font-medium text-muted-foreground';

/* ---------------------------------- Upload --------------------------------- */

interface UploadCsvDialogProps {
  open: boolean;
  file: File | null;
  loading: boolean;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  onClose: () => void;
}

export const UploadCsvDialog: React.FC<UploadCsvDialogProps> = ({
  open,
  file,
  loading,
  onFileChange,
  onUpload,
  onClose,
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Upload Attendance CSV</DialogTitle>
        <DialogDescription>Choose a punch-log CSV export to import.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="attendance-csv" className={labelClass}>
          CSV file
        </Label>
        <Input
          id="attendance-csv"
          type="file"
          accept=".csv"
          className="h-auto cursor-pointer py-1.5"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        />
        {file && <p className="m-0 text-xs text-muted-foreground">Selected: {file.name}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onUpload} disabled={!file || loading}>
          {loading && <Loader2 className="animate-spin" />}
          Upload
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

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
