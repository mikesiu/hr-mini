import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getStatusMeta } from './employeeTypes';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => (
  <Badge
    variant="secondary"
    className={cn('rounded-md px-1.5 text-[11px] font-medium', getStatusMeta(status).badge, className)}
  >
    {status}
  </Badge>
);

export default StatusBadge;
