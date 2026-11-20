import React from 'react';
import { Info, Pencil, Users } from 'lucide-react';
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
  formatDate,
  isActiveAssignment,
  type EmployeeAssignment,
  type WorkSchedule,
} from './scheduleTypes';

const labelClass = 'text-xs font-medium text-muted-foreground';
const headClass =
  'sticky top-0 z-10 h-9 bg-muted px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase';

const assignmentStatus = (a: EmployeeAssignment) =>
  a.end_date && new Date(a.end_date) < new Date()
    ? { label: 'Ended', tint: 'bg-muted text-muted-foreground' }
    : a.end_date
      ? { label: 'Active (Scheduled End)', tint: 'bg-event-cra/15 text-event-cra' }
      : { label: 'Active', tint: 'bg-event-union/15 text-event-union' };

interface ScheduleAssignmentsDialogProps {
  open: boolean;
  schedule: WorkSchedule | null;
  assignments: EmployeeAssignment[];
  loading: boolean;
  filter: 'active' | 'all';
  onFilterChange: (filter: 'active' | 'all') => void;
  onEdit: (assignment: EmployeeAssignment) => void;
  onClose: () => void;
}

export const ScheduleAssignmentsDialog: React.FC<ScheduleAssignmentsDialogProps> = ({
  open,
  schedule,
  assignments,
  loading,
  filter,
  onFilterChange,
  onEdit,
  onClose,
}) => {
  const visible = filter === 'all' ? assignments : assignments.filter(isActiveAssignment);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Employee Assignments: {schedule?.name || ''}</DialogTitle>
          <DialogDescription>Employees currently or previously on this schedule.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-0.5 pr-1">
          <div className="flex items-center gap-2">
            <Label htmlFor="assignment-filter" className={labelClass}>
              Show
            </Label>
            <Select value={filter} onValueChange={(v) => onFilterChange(v as 'active' | 'all')}>
              <SelectTrigger id="assignment-filter" size="sm" className="w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (exclude terminated)</SelectItem>
                <SelectItem value="all">All assignments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-solid border-border px-6 py-8 text-center">
              <Users className="size-9 text-muted-foreground/60" aria-hidden="true" />
              <p className="m-0 text-sm text-muted-foreground">
                {assignments.length === 0
                  ? 'No employees assigned to this schedule.'
                  : 'No active assignments. Switch to All assignments to see ended or terminated staff.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-solid border-border">
              <Table containerClassName="max-h-96 overflow-y-auto">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={headClass}>Employee Name</TableHead>
                    <TableHead className={headClass}>Employee ID</TableHead>
                    <TableHead className={headClass}>Effective Date</TableHead>
                    <TableHead className={headClass}>End Date</TableHead>
                    <TableHead className={headClass}>Status</TableHead>
                    <TableHead className={cn(headClass, 'text-right')}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((assignment) => {
                    const status = assignmentStatus(assignment);
                    return (
                      <TableRow key={assignment.id}>
                        <TableCell className="px-3 text-sm font-medium text-foreground">
                          {assignment.employee_name || assignment.employee_id}
                        </TableCell>
                        <TableCell className="px-3 text-sm text-muted-foreground">
                          {assignment.employee_id}
                        </TableCell>
                        <TableCell className="px-3 text-sm tabular-nums">
                          {formatDate(assignment.effective_date)}
                        </TableCell>
                        <TableCell className="px-3 text-sm tabular-nums">
                          {assignment.end_date ? (
                            formatDate(assignment.end_date)
                          ) : (
                            <span className="text-muted-foreground">Ongoing</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3">
                          <Badge
                            variant="secondary"
                            className={cn('rounded-md px-1.5 text-[11px] font-medium', status.tint)}
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3">
                          <div className="flex justify-end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  aria-label="Edit assignment"
                                  onClick={() => onEdit(assignment)}
                                >
                                  <Pencil />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit assignment</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface EditAssignmentDialogProps {
  assignment: EmployeeAssignment | null;
  formData: { effective_date: string; end_date: string };
  onChange: (patch: Partial<{ effective_date: string; end_date: string }>) => void;
  onClose: () => void;
  onSave: () => void;
}

export const EditAssignmentDialog: React.FC<EditAssignmentDialogProps> = ({
  assignment,
  formData,
  onChange,
  onClose,
  onSave,
}) => (
  <Dialog open={!!assignment} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          Edit Assignment: {assignment?.employee_name || assignment?.employee_id}
        </DialogTitle>
        <DialogDescription>Adjust when this assignment starts or ends.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-assign-effective" className={labelClass}>
            Effective Date
          </Label>
          <Input
            id="edit-assign-effective"
            type="date"
            value={formData.effective_date}
            onChange={(e) => onChange({ effective_date: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-assign-end" className={labelClass}>
            End Date (Optional)
          </Label>
          <Input
            id="edit-assign-end"
            type="date"
            value={formData.end_date}
            onChange={(e) => onChange({ end_date: e.target.value })}
          />
          <p className="m-0 text-xs text-muted-foreground">
            Leave empty to make assignment ongoing, or set a date to deactivate
          </p>
        </div>
        <Alert>
          <Info />
          <AlertDescription>
            To deactivate this assignment, set an End Date. To make it ongoing again, clear the End
            Date.
          </AlertDescription>
        </Alert>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={!formData.effective_date}>
          Update Assignment
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
