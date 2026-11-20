import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_META } from './workPermitTypes';
import type { PermitStatus } from './workPermitTypes';

const PermitStatusBadge: React.FC<{ status: PermitStatus; className?: string }> = ({
  status,
  className,
}) => (
  <Badge variant="secondary" className={cn(STATUS_META[status].badgeClass, className)}>
    {STATUS_META[status].label}
  </Badge>
);

export default PermitStatusBadge;
