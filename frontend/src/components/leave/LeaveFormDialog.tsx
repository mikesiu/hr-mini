import React from 'react';
import { Loader2 } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { LeaveFormData, LeaveType } from './leaveTypes';

interface LeaveFormDialogProps {
  open: boolean;
  isEditing: boolean;
  formData: LeaveFormData;
  daysInput: string;
  leaveTypes: LeaveType[];
  loading: boolean;
  onChange: (field: keyof LeaveFormData, value: any) => void;
  onDaysChange: (raw: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const labelClass = 'text-xs font-medium text-muted-foreground';

const LeaveFormDialog: React.FC<LeaveFormDialogProps> = ({
  open,
  isEditing,
  formData,
  daysInput,
  leaveTypes,
  loading,
  onChange,
  onDaysChange,
  onClose,
  onSubmit,
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Leave Request' : 'Add Leave Request'}</DialogTitle>
        <DialogDescription>
          Days are calculated from the dates (excluding weekends and holidays) but can be adjusted.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-0.5 pr-1 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leave-type" className={labelClass}>
            Leave Type
          </Label>
          <Select
            value={formData.leave_type_id ? String(formData.leave_type_id) : ''}
            onValueChange={(v) => onChange('leave_type_id', Number(v))}
          >
            <SelectTrigger id="leave-type" className="w-full">
              <SelectValue placeholder="Select leave type" />
            </SelectTrigger>
            <SelectContent>
              {leaveTypes.map((type) => (
                <SelectItem key={type.id} value={String(type.id)}>
                  {type.name} ({type.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leave-status" className={labelClass}>
            Status
          </Label>
          <Select value={formData.status} onValueChange={(v) => onChange('status', v)}>
            <SelectTrigger id="leave-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leave-start" className={labelClass}>
            Start Date
          </Label>
          <Input
            id="leave-start"
            type="date"
            value={formData.start_date}
            onChange={(e) => onChange('start_date', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leave-end" className={labelClass}>
            End Date
          </Label>
          <Input
            id="leave-end"
            type="date"
            value={formData.end_date}
            onChange={(e) => onChange('end_date', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leave-days" className={labelClass}>
            Days
          </Label>
          <Input
            id="leave-days"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.]?[0-9]*"
            className="tabular-nums"
            value={daysInput}
            onChange={(e) => onDaysChange(e.target.value)}
          />
          <p className="m-0 text-xs text-muted-foreground">Use 0.5 for a half day</p>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="leave-reason" className={labelClass}>
            Reason/Note
          </Label>
          <Textarea
            id="leave-reason"
            rows={3}
            value={formData.reason}
            onChange={(e) => onChange('reason', e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {isEditing ? 'Update Leave' : 'Add Leave'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default LeaveFormDialog;
