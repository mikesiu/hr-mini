import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getRoeBadgeClass, getRoeLabel } from './terminationTypes';
import type { Termination } from './terminationTypes';

interface TerminationViewDialogProps {
  termination: Termination | null;
  formatLocalDate: (d: string) => string;
  onClose: () => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode; wide?: boolean }> = ({
  label, children, wide,
}) => (
  <div className={cn('space-y-1', wide && 'sm:col-span-2')}>
    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
    <dd className="m-0 text-sm whitespace-pre-wrap text-foreground">{children}</dd>
  </div>
);

const TerminationViewDialog: React.FC<TerminationViewDialogProps> = ({
  termination, formatLocalDate, onClose,
}) => (
  <Dialog open={!!termination} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Termination Details</DialogTitle>
      </DialogHeader>
      {termination && (
        <dl className="m-0 grid gap-4 sm:grid-cols-2">
          <Field label="Employee">{termination.employee?.full_name || 'N/A'}</Field>
          <Field label="Employee ID">
            <span className="font-mono text-xs">{termination.employee_id}</span>
          </Field>
          <Field label="Last Working Date">
            <span className="tabular-nums">{formatLocalDate(termination.last_working_date)}</span>
          </Field>
          <Field label="Termination Effective Date">
            <span className="tabular-nums">{formatLocalDate(termination.termination_effective_date)}</span>
          </Field>
          <Field label="ROE Reason Code" wide>
            <Badge variant="secondary" className={getRoeBadgeClass(termination.roe_reason_code)}>
              {termination.roe_reason_code} - {getRoeLabel(termination.roe_reason_code)}
            </Badge>
          </Field>
          {termination.other_reason && <Field label="Other Reason" wide>{termination.other_reason}</Field>}
          {termination.internal_reason && <Field label="Internal Reason" wide>{termination.internal_reason}</Field>}
          {termination.remarks && <Field label="Remarks" wide>{termination.remarks}</Field>}
          <Field label="Created Date">
            <span className="tabular-nums">{new Date(termination.created_at).toLocaleString()}</span>
          </Field>
          {termination.created_by && <Field label="Created By">{termination.created_by}</Field>}
        </dl>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default TerminationViewDialog;
