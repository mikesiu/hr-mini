import React from 'react';
import { Eye } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getInitials } from '../employee/employeeTypes';
import PermitStatusBadge from './PermitStatusBadge';
import { daysTextClass, formatDateString, formatDaysRemaining } from './workPermitTypes';
import type { CurrentPermit } from './workPermitTypes';

const headClass =
  'h-10 bg-muted/40 px-3 text-xs font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase';

interface PermitRegistryTableProps {
  rows: CurrentPermit[];
  onView: (row: CurrentPermit) => void;
}

const PermitRegistryTable: React.FC<PermitRegistryTableProps> = ({ rows, onView }) => (
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className={headClass}>Employee</TableHead>
        <TableHead className={headClass}>Company</TableHead>
        <TableHead className={headClass}>Permit Type</TableHead>
        <TableHead className={headClass}>Permit Number</TableHead>
        <TableHead className={headClass}>Issue Date</TableHead>
        <TableHead className={headClass}>Expiry Date</TableHead>
        <TableHead className={headClass}>Days Remaining</TableHead>
        <TableHead className={cn(headClass, 'text-right')}>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((row) => (
        <TableRow
          key={row.id}
          tabIndex={0}
          aria-label={`View work permit details for ${row.full_name}`}
          className="cursor-pointer outline-none focus-visible:bg-muted/50"
          onClick={() => onView(row)}
          onKeyDown={(e) => {
            if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onView(row);
            }
          }}
        >
          <TableCell className="px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8">
                <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                  {getInitials(row.first_name || row.full_name, row.last_name || '')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-medium whitespace-nowrap text-foreground">{row.full_name}</div>
                <div className="font-mono text-xs text-muted-foreground">{row.employee_code}</div>
              </div>
            </div>
          </TableCell>
          <TableCell className="max-w-[200px] truncate px-3 py-2.5 text-sm">
            {row.company_name || row.company_code || '—'}
          </TableCell>
          <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap">{row.permit_type}</TableCell>
          <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap">
            {row.permit_number ? (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                {row.permit_number}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
            {formatDateString(row.issue_date)}
          </TableCell>
          <TableCell className="px-3 py-2.5 text-sm font-medium whitespace-nowrap text-foreground tabular-nums">
            {formatDateString(row.expiry_date)}
          </TableCell>
          <TableCell className="px-3 py-2.5">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className={cn('text-sm font-medium tabular-nums', daysTextClass(row.permit_status))}>
                {formatDaysRemaining(row.days_remaining)}
              </span>
              <PermitStatusBadge status={row.permit_status} />
            </div>
          </TableCell>
          <TableCell className="px-3 py-2.5">
            <div className="flex items-center justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="View Details"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(row);
                    }}
                  >
                    <Eye className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Details</TooltipContent>
              </Tooltip>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default PermitRegistryTable;
