import React from 'react';
import { Info, Loader2, RefreshCw } from 'lucide-react';
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
import type { Attendance } from './attendanceTypes';

export interface AttendanceFormData {
  employee_id: string;
  date: string;
  check_in: string;
  check_out: string;
  edited_check_in: string;
  edited_check_out: string;
  edited_regular_hours: string;
  edited_ot_hours: string;
  edited_weekend_ot_hours: string;
  edited_stat_holiday_hours: string;
  time_edit_reason: string;
  hours_edit_reason: string;
  remarks: string;
}

interface EditAttendanceDialogProps {
  open: boolean;
  editingAttendance: Attendance | null;
  formData: AttendanceFormData;
  loading: boolean;
  formatTime: (t?: string) => string;
  onChange: (patch: Partial<AttendanceFormData>) => void;
  onClose: () => void;
  onSave: () => void;
  onRecalculate: () => void;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const hint = 'm-0 text-xs text-muted-foreground';

const Field: React.FC<{
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ id, label, hint: hintText, children, className }) => (
  <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
    <Label htmlFor={id} className={labelClass}>
      {label}
    </Label>
    {children}
    {hintText && <p className={hint}>{hintText}</p>}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="m-0 text-sm font-semibold text-foreground">{children}</h3>
);

const EditAttendanceDialog: React.FC<EditAttendanceDialogProps> = ({
  open,
  editingAttendance,
  formData,
  loading,
  formatTime,
  onChange,
  onClose,
  onSave,
  onRecalculate,
}) => {
  const att = editingAttendance;
  const hasTimes = !!(att && (att.check_in || att.check_out));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
          <DialogDescription>
            Override times or hours for a single day. Original punches are kept for reference.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-0.5 pr-1">
          {att ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="att-employee" label="Employee ID">
                  <Input id="att-employee" value={formData.employee_id} disabled readOnly />
                </Field>
                <Field id="att-date" label="Date">
                  <Input id="att-date" type="date" value={formData.date} disabled readOnly />
                </Field>
              </div>

              {hasTimes && (
                <section className="flex flex-col gap-3">
                  <SectionTitle>Check-In / Check-Out Times</SectionTitle>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id="att-orig-in" label="Original Check-In">
                      <Input
                        id="att-orig-in"
                        value={formatTime(formData.check_in)}
                        disabled
                        readOnly
                        className="tabular-nums"
                      />
                    </Field>
                    <Field id="att-orig-out" label="Original Check-Out">
                      <Input
                        id="att-orig-out"
                        value={formatTime(formData.check_out)}
                        disabled
                        readOnly
                        className="tabular-nums"
                      />
                    </Field>
                    <Field id="att-edit-in" label="Edited Check-In" hint="Leave empty to use original">
                      <Input
                        id="att-edit-in"
                        type="time"
                        value={formData.edited_check_in}
                        onChange={(e) => onChange({ edited_check_in: e.target.value })}
                      />
                    </Field>
                    <Field id="att-edit-out" label="Edited Check-Out" hint="Leave empty to use original">
                      <Input
                        id="att-edit-out"
                        type="time"
                        value={formData.edited_check_out}
                        onChange={(e) => onChange({ edited_check_out: e.target.value })}
                      />
                    </Field>
                    <Field
                      id="att-time-reason"
                      label="Reason for Time Edit"
                      className="sm:col-span-2"
                    >
                      <Textarea
                        id="att-time-reason"
                        rows={2}
                        value={formData.time_edit_reason}
                        onChange={(e) => onChange({ time_edit_reason: e.target.value })}
                        placeholder="Enter reason for editing check-in/check-out times"
                      />
                    </Field>
                  </div>
                </section>
              )}

              {att.stat_holiday_name && !att.check_in && !att.check_out && (
                <p className="m-0 text-sm text-amber-700 italic dark:text-amber-300">
                  Statutory Holiday: {att.stat_holiday_name}
                </p>
              )}

              <section className="flex flex-col gap-3">
                <SectionTitle>Hours</SectionTitle>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field id="att-orig-reg" label="Original Regular">
                    <Input id="att-orig-reg" value={(att.regular_hours ?? 0).toFixed(2)} disabled readOnly className="tabular-nums" />
                  </Field>
                  <Field id="att-orig-ot" label="Original OT">
                    <Input id="att-orig-ot" value={(att.ot_hours ?? 0).toFixed(2)} disabled readOnly className="tabular-nums" />
                  </Field>
                  <Field id="att-orig-wot" label="Original Weekend OT">
                    <Input id="att-orig-wot" value={(att.weekend_ot_hours ?? 0).toFixed(2)} disabled readOnly className="tabular-nums" />
                  </Field>
                  <Field id="att-orig-stat" label="Original Stat Holiday">
                    <Input id="att-orig-stat" value={(att.stat_holiday_hours ?? 0).toFixed(2)} disabled readOnly className="tabular-nums" />
                  </Field>
                  <Field id="att-edit-reg" label="Edited Regular Hours" hint="Leave empty to use calculated">
                    <Input id="att-edit-reg" type="number" step={0.25} min={0} className="tabular-nums" value={formData.edited_regular_hours} onChange={(e) => onChange({ edited_regular_hours: e.target.value })} />
                  </Field>
                  <Field id="att-edit-ot" label="Edited OT Hours" hint="Leave empty to use calculated">
                    <Input id="att-edit-ot" type="number" step={0.25} min={0} className="tabular-nums" value={formData.edited_ot_hours} onChange={(e) => onChange({ edited_ot_hours: e.target.value })} />
                  </Field>
                  <Field id="att-edit-wot" label="Edited Weekend OT" hint="Leave empty to use calculated">
                    <Input id="att-edit-wot" type="number" step={0.25} min={0} className="tabular-nums" value={formData.edited_weekend_ot_hours} onChange={(e) => onChange({ edited_weekend_ot_hours: e.target.value })} />
                  </Field>
                  <Field id="att-edit-stat" label="Edited Stat Holiday" hint="Leave empty to use original">
                    <Input id="att-edit-stat" type="number" step={0.25} min={0} className="tabular-nums" value={formData.edited_stat_holiday_hours} onChange={(e) => onChange({ edited_stat_holiday_hours: e.target.value })} />
                  </Field>
                </div>

                <Field id="att-hours-reason" label="Reason for Hours Edit">
                  <Textarea
                    id="att-hours-reason"
                    rows={2}
                    value={formData.hours_edit_reason}
                    onChange={(e) => onChange({ hours_edit_reason: e.target.value })}
                    placeholder="Enter reason for editing hours"
                  />
                </Field>

                <Field
                  id="att-remarks"
                  label="Remarks"
                  hint={`${formData.remarks.length}/18 characters`}
                >
                  <Input
                    id="att-remarks"
                    maxLength={18}
                    value={formData.remarks}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 18) onChange({ remarks: value });
                    }}
                    placeholder="Optional short remarks (max 18 characters)"
                  />
                </Field>

                <div>
                  <Button variant="outline" onClick={onRecalculate} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                    Recalculate Hours
                  </Button>
                </div>
              </section>
            </>
          ) : (
            <Alert>
              <Info />
              <AlertDescription>
                Manual entry is now available in the "Manual Entry" tab. Click the "Manual Entry"
                button above or switch to the "Manual Entry" tab to add new attendance records.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAttendanceDialog;
