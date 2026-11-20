import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { workPermitAPI } from '../../api/client';
import { getInitials } from '../employee/employeeTypes';
import PermitStatusBadge from './PermitStatusBadge';
import {
  daysTextClass, formatDateString, formatDaysRemaining, isRenewedPermit,
} from './workPermitTypes';
import type { CurrentPermit, WorkPermit } from './workPermitTypes';

interface WorkPermitDetailSheetProps {
  /** Employee's current permit (registry row); null closes the sheet. */
  row: CurrentPermit | null;
  /** Bump to reload history after a create / edit / delete. */
  refreshKey: number;
  canManage: boolean;
  onClose: () => void;
  onRenew: (row: CurrentPermit) => void;
  onEdit: (permit: WorkPermit, row: CurrentPermit) => void;
  onDelete: (permit: WorkPermit) => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode; wide?: boolean }> = ({
  label, children, wide,
}) => (
  <div className={cn('min-w-0 space-y-0.5', wide && 'col-span-2')}>
    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
    <dd className="m-0 text-sm break-words text-foreground">{children}</dd>
  </div>
);

const WorkPermitDetailSheet: React.FC<WorkPermitDetailSheetProps> = ({
  row, refreshKey, canManage, onClose, onRenew, onEdit, onDelete,
}) => {
  const [history, setHistory] = useState<WorkPermit[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const employeeId = row?.employee_id;

  const load = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      setFailed(false);
      const res = await workPermitAPI.getByEmployee(employeeId);
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch {
      setFailed(true);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const sorted = useMemo(
    () => [...history].sort((a, b) => b.expiry_date.localeCompare(a.expiry_date)),
    [history]
  );
  const currentId = useMemo(() => sorted.find((p) => !isRenewedPermit(p))?.id, [sorted]);
  const past = sorted.filter((p) => p.id !== currentId);
  const currentPermit = sorted.find((p) => p.id === currentId) ?? null;

  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {row && (
          <>
            <SheetHeader className="gap-3 p-4 pr-12">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-muted text-sm font-medium text-muted-foreground">
                    {getInitials(row.first_name || row.full_name, row.last_name || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{row.full_name}</SheetTitle>
                  <SheetDescription className="truncate">
                    <span className="font-mono text-xs">{row.employee_code}</span>
                    {row.company_name ? ` · ${row.company_name}` : ''}
                  </SheetDescription>
                </div>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-md" onClick={() => onRenew(row)}>
                    <RefreshCw className="size-4" /> Renew / Add Permit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!currentPermit}
                    onClick={() => currentPermit && onEdit(currentPermit, row)}
                  >
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={!currentPermit}
                    onClick={() => currentPermit && onDelete(currentPermit)}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              )}
            </SheetHeader>

            <Separator />

            <section className="space-y-3 p-4">
              <h3 className="m-0 text-sm font-semibold text-foreground">Current permit</h3>
              <div className="rounded-lg border border-solid border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {row.permit_type}
                  </span>
                  <PermitStatusBadge status={row.permit_status} />
                </div>
                <dl className="m-0 grid grid-cols-2 gap-3">
                  <Field label="Permit number">{row.permit_number || '—'}</Field>
                  <Field label="Days remaining">
                    <span className={cn('font-medium tabular-nums', daysTextClass(row.permit_status))}>
                      {formatDaysRemaining(row.days_remaining)}
                    </span>
                  </Field>
                  <Field label="Issue date">
                    <span className="tabular-nums">{formatDateString(row.issue_date)}</span>
                  </Field>
                  <Field label="Expiry date">
                    <span className="font-medium tabular-nums">{formatDateString(row.expiry_date)}</span>
                  </Field>
                  {row.notes && (
                    <Field label="Notes" wide>
                      <span className="whitespace-pre-wrap">{row.notes}</span>
                    </Field>
                  )}
                </dl>
              </div>
            </section>

            <Separator />

            <section className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <History className="size-4 text-muted-foreground" /> Permit history
                </h3>
                {!loading && !failed && (
                  <Badge variant="secondary" className="tabular-nums">
                    {past.length} past {past.length === 1 ? 'permit' : 'permits'}
                  </Badge>
                )}
              </div>

              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : failed ? (
                <div className="flex flex-col items-start gap-2 rounded-lg border border-solid border-border p-4 text-sm text-muted-foreground">
                  Could not load permit history.
                  <Button size="sm" variant="outline" onClick={load}>Retry</Button>
                </div>
              ) : past.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border p-6 text-center">
                  <History className="size-6 text-muted-foreground" />
                  <p className="m-0 text-sm font-medium text-foreground">No past permits</p>
                  <p className="m-0 text-xs text-muted-foreground">
                    Earlier permits appear here once this one is renewed.
                  </p>
                </div>
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {past.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg border border-solid border-border bg-card p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm font-medium text-foreground">
                            {p.permit_type}
                          </p>
                          <p className="m-0 mt-0.5 text-xs text-muted-foreground tabular-nums">
                            {p.issue_date ? `${formatDateString(p.issue_date)} → ` : 'Expired '}
                            {formatDateString(p.expiry_date)}
                            {p.permit_number ? ` · ${p.permit_number}` : ''}
                          </p>
                          {p.renewed_date && (
                            <p className="m-0 mt-0.5 text-xs text-muted-foreground tabular-nums">
                              Closed {formatDateString(p.renewed_date)}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge variant="outline">Renewed</Badge>
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                aria-label="Edit permit"
                                onClick={() => onEdit(p, row)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                aria-label="Delete permit"
                                onClick={() => onDelete(p)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default WorkPermitDetailSheet;
