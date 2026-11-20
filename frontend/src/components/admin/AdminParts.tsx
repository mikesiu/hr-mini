import React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Table header cell class shared by admin tables. */
export const adminHeadClass =
  'h-10 bg-muted/40 px-3 text-xs font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase';

/** Shared admin table cell padding. */
export const adminCellClass = 'px-3 py-2.5';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

/** Standard admin page header: title + subtitle left, primary actions right. */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0">
      <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="m-0 mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

/** Slim toolbar container above data tables. */
export const Toolbar: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-solid border-border bg-card p-3',
      className
    )}
  >
    {children}
  </div>
);

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value, onChange, placeholder, ariaLabel, className,
}) => (
  <div className={cn('relative w-full sm:w-80', className)}>
    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="px-8"
      aria-label={ariaLabel}
    />
    {value && (
      <button
        type="button"
        aria-label="Clear search"
        onClick={() => onChange('')}
        className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <X className="size-4" />
      </button>
    )}
  </div>
);

/** Card-style wrapper around tables. */
export const TableCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'overflow-hidden rounded-lg border border-solid border-border bg-card',
      className
    )}
  >
    {children}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2 p-4">
    <Skeleton className="h-9 w-full" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: React.ElementType;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon, title, description, actionLabel, actionIcon: ActionIcon, onAction,
}) => (
  <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
    <Icon className="size-8 text-muted-foreground" />
    <p className="m-0 text-sm font-medium text-foreground">{title}</p>
    {description && <p className="m-0 max-w-md text-sm text-muted-foreground">{description}</p>}
    {actionLabel && onAction && (
      <Button variant="outline" className="mt-2" onClick={onAction}>
        {ActionIcon && <ActionIcon className="size-4" />} {actionLabel}
      </Button>
    )}
  </div>
);
