import React, { useMemo, useState } from 'react';
import { FileSearch, Search, X } from 'lucide-react';
import { ReportType } from '../../types/reports';
import { getReportIcon, groupReportTypes } from './reportCatalog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ReportSelectorProps {
  reportTypes: ReportType[];
  onSelectReport: (reportType: string) => void;
  selectedReportType?: string;
  loading?: boolean;
}

/** Compact, searchable report catalog grouped by category. */
export const ReportSelector: React.FC<ReportSelectorProps> = ({
  reportTypes,
  onSelectReport,
  selectedReportType,
  loading = false,
}) => {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? reportTypes.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.type.toLowerCase().includes(q)
        )
      : reportTypes;
    return groupReportTypes(filtered);
  }, [reportTypes, query]);

  return (
    <div className="overflow-hidden rounded-lg border border-solid border-border bg-card">
      <div className="border-0 border-b border-solid border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter reports..."
            className="px-8"
            aria-label="Filter reports"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <nav aria-label="Report catalog" className="max-h-[calc(100vh-14rem)] overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <FileSearch className="size-6 text-muted-foreground" />
            <p className="m-0 text-sm font-medium text-foreground">No reports found</p>
            <p className="m-0 text-xs text-muted-foreground">
              {query ? 'Try a different search term.' : 'No reports are available.'}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="mb-2 last:mb-0">
              <h3 className="m-0 px-2 pt-2 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                {group.label}
              </h3>
              <ul className="m-0 list-none space-y-0.5 p-0">
                {group.reports.map((report) => {
                  const Icon = getReportIcon(report.type);
                  const isSelected = selectedReportType === report.type;
                  return (
                    <li key={report.type}>
                      <button
                        type="button"
                        aria-current={isSelected ? 'true' : undefined}
                        onClick={() => onSelectReport(report.type)}
                        className={cn(
                          'flex w-full cursor-pointer items-start gap-2.5 rounded-md border-0 border-l-2 border-solid border-l-transparent bg-transparent px-2 py-2 text-left [font-family:inherit] text-foreground transition-colors outline-none hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                          isSelected &&
                            'border-l-primary bg-accent font-medium text-accent-foreground hover:bg-accent'
                        )}
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{report.name}</span>
                          <span className="block truncate text-xs font-normal text-muted-foreground">
                            {report.description}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>
    </div>
  );
};
