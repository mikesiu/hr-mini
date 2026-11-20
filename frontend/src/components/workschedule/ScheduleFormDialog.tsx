import React from 'react';
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
import { DAYS, DAY_LABELS, type WorkSchedule } from './scheduleTypes';

interface ScheduleFormDialogProps {
  open: boolean;
  isEditing: boolean;
  formData: Partial<WorkSchedule>;
  onChange: (patch: Partial<WorkSchedule>) => void;
  onClose: () => void;
  onSave: () => void;
}

const labelClass = 'text-xs font-medium text-muted-foreground';

const ScheduleFormDialog: React.FC<ScheduleFormDialogProps> = ({
  open,
  isEditing,
  formData,
  onChange,
  onClose,
  onSave,
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
        <DialogDescription>
          Set a start and end time for each working day. Leave a day empty for a rest day.
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-0.5 pr-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-name" className={labelClass}>
            Schedule Name
          </Label>
          <Input
            id="schedule-name"
            value={formData.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[5.5rem_1fr_1fr] items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>Day</span>
            <span>Start</span>
            <span>End</span>
          </div>
          {DAYS.map((day, idx) => (
            <div key={day} className="grid grid-cols-[5.5rem_1fr_1fr] items-center gap-2">
              <span className="text-sm font-medium text-foreground">{DAY_LABELS[idx]}</span>
              <Input
                type="time"
                aria-label={`${DAY_LABELS[idx]} Start`}
                className="tabular-nums"
                value={formData[`${day}_start`] || ''}
                onChange={(e) => onChange({ [`${day}_start`]: e.target.value })}
              />
              <Input
                type="time"
                aria-label={`${DAY_LABELS[idx]} End`}
                className="tabular-nums"
                value={formData[`${day}_end`] || ''}
                onChange={(e) => onChange({ [`${day}_end`]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-status" className={labelClass}>
            Status
          </Label>
          <Select
            value={formData.is_active ? 'active' : 'inactive'}
            onValueChange={(v) => onChange({ is_active: v === 'active' })}
          >
            <SelectTrigger id="schedule-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
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

export default ScheduleFormDialog;
