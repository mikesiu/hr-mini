import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, FilterX, Loader2, Play, SlidersHorizontal,
} from 'lucide-react';
import { ReportFilter, ReportFilters as FilterValues } from '../../types/reports';
import { useCompanyFilter } from '../../contexts/CompanyFilterContext';
import { employeeAPI, reportsAPI } from '../../api/client';
import { 
  validateFilters, 
  isFilterApplicable,
  FilterValidationResult 
} from '../../utils/filterValidation';
import {
  validateSortGroupFields,
  getAvailableSortFields,
  getAvailableGroupFields,
  getFieldDisplayName,
  getFieldDescription,
  SortGroupValidationResult
} from '../../utils/sortGroupValidation';
import EmployeeMultiSelect from './EmployeeMultiSelect';
import type { EmployeeOption } from './EmployeeMultiSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Radix Select forbids empty-string item values, so "nothing selected" uses a sentinel. */
const NONE = '__none__';

const Field: React.FC<{
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, error, hint, className, children }) => (
  <div className={cn('grid min-w-0 grid-cols-1 content-start gap-1.5', className)}>
    <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
      {label}
    </Label>
    {children}
    {error ? (
      <p className="m-0 text-xs text-destructive">{error}</p>
    ) : hint ? (
      <p className="m-0 text-xs text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

const Section: React.FC<{
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, open, onToggle, children }) => (
  <Collapsible open={open} onOpenChange={onToggle} className="border-0 border-b border-solid border-border last:border-b-0">
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-0 py-2 text-left [font-family:inherit] text-sm font-medium text-foreground transition-colors outline-none hover:text-foreground/80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {title}
      <ChevronDown
        className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
      />
    </button>
    <CollapsibleContent>
      <div className="pt-2 pb-4">{children}</div>
    </CollapsibleContent>
  </Collapsible>
);

interface ReportFiltersProps {
  reportType: string;
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  loading?: boolean;
  /** Whether the filter body is expanded (controlled by the page). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  reportType,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  loading = false,
  open = true,
  onOpenChange,
}) => {
    // Use companies from the global context instead of fetching them again
  const { selectedCompanyId, companies } = useCompanyFilter();
  
  const [filterOptions, setFilterOptions] = useState<{ common_filters: ReportFilter[]; specific_filters: ReportFilter[] } | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    common: true,
    specific: false,
    sortGroup: false,
  });
  const [validationResult, setValidationResult] = useState<FilterValidationResult | null>(null);
  const [sortGroupValidation, setSortGroupValidation] = useState<SortGroupValidationResult | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Load filter options when report type changes
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await reportsAPI.getFilters(reportType);
        if (response.data.success) {
          setFilterOptions(response.data.data);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    if (reportType) {
      loadFilterOptions();
      
      // Validate existing filters for the new report type
      const validation = validateFilters(filters, reportType);
      setValidationResult(validation);
      
      // Validate sort/group fields for the new report type
      const sortGroupValidation = validateSortGroupFields(
        filters.sort_by,
        filters.group_by,
        filters.group_by_secondary,
        reportType
      );
      setSortGroupValidation(sortGroupValidation);
      
      setShowValidationErrors(!validation.isValid || !sortGroupValidation.isValid);
    }
  }, [reportType, filters]);

  // Set company filter from global context
  useEffect(() => {
    if (selectedCompanyId && selectedCompanyId !== filters.company_id) {
      onFiltersChange({ ...filters, company_id: selectedCompanyId, employee_ids: undefined });
    }
  }, [selectedCompanyId, filters, onFiltersChange]);

  // Load employees for multi-select when company is set
  useEffect(() => {
    const needsEmployees = filterOptions?.common_filters.some(f => f.type === 'multiselect' && f.name === 'employee_ids')
      || filterOptions?.specific_filters.some(f => f.type === 'multiselect' && f.name === 'employee_ids');
    if (!needsEmployees) {
      setEmployees([]);
      return;
    }

    const companyId = filters.company_id || selectedCompanyId;
    if (!companyId) {
      setEmployees([]);
      return;
    }

    let cancelled = false;
    const loadEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const response = await employeeAPI.list({ company_id: companyId });
        if (!cancelled && response.data.success) {
          setEmployees(response.data.data || []);
        }
      } catch (error) {
        console.error('Error loading employees for report filter:', error);
        if (!cancelled) setEmployees([]);
      } finally {
        if (!cancelled) setEmployeesLoading(false);
      }
    };
    loadEmployees();
    return () => { cancelled = true; };
  }, [filters.company_id, selectedCompanyId, filterOptions]);

  const handleFilterChange = (name: string, value: any) => {
    const newFilters = { ...filters, [name]: value };
    // Clear employee selection when company changes
    if (name === 'company_id' && value !== filters.company_id) {
      newFilters.employee_ids = undefined;
    }
    onFiltersChange(newFilters);
    
    // Validate filters in real-time
    const validation = validateFilters(newFilters, reportType);
    setValidationResult(validation);
    
    // Validate sort/group fields if they changed
    if (['sort_by', 'group_by', 'group_by_secondary'].includes(name)) {
      const sortGroupValidation = validateSortGroupFields(
        newFilters.sort_by,
        newFilters.group_by,
        newFilters.group_by_secondary,
        reportType
      );
      setSortGroupValidation(sortGroupValidation);
    }
    
    // Show validation errors if there are any
    if (!validation.isValid || (sortGroupValidation && !sortGroupValidation.isValid)) {
      setShowValidationErrors(true);
    }
  };

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderFilterField = (filter: ReportFilter) => {
    const value = filters[filter.name as keyof FilterValues];
    const isApplicable = isFilterApplicable(filter.name, reportType);
    const hasWarning = validationResult?.warnings.some(w => w.includes(filter.label)) || false;

    // Don't render filters that are not applicable to this report type
    if (!isApplicable) {
      return null;
    }

    const warningText = hasWarning
      ? validationResult?.warnings.find(w => w.includes(filter.label))
      : undefined;
    const fieldId = `report-filter-${filter.name}`;

    switch (filter.type) {
      case 'text':
        return (
          <Field label={filter.label} htmlFor={fieldId} error={warningText}>
            <Input
              id={fieldId}
              aria-invalid={hasWarning || undefined}
              value={(value as string) || ''}
              onChange={(e) => handleFilterChange(filter.name, e.target.value)}
              placeholder={filter.description}
            />
          </Field>
        );

      case 'select':
        if (filter.name === 'company_id') {
          return (
            <Field label={filter.label} error={warningText}>
              <Select
                value={(value as string) || NONE}
                onValueChange={(v) => handleFilterChange(filter.name, v === NONE ? '' : v)}
              >
                <SelectTrigger id={fieldId} className="w-full" aria-invalid={hasWarning || undefined}>
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.legal_name}
                      {company.trade_name && ` (${company.trade_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          );
        }

        return (
          <Field label={filter.label} error={warningText}>
            <Select
              value={(value as string) || NONE}
              onValueChange={(v) => handleFilterChange(filter.name, v === NONE ? '' : v)}
            >
              <SelectTrigger id={fieldId} className="w-full" aria-invalid={hasWarning || undefined}>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Any</SelectItem>
                {filter.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        );

      case 'date':
        return (
          <Field label={filter.label} htmlFor={fieldId} error={warningText}>
            <Input
              id={fieldId}
              type="date"
              aria-invalid={hasWarning || undefined}
              value={(value as string) || ''}
              onChange={(e) => handleFilterChange(filter.name, e.target.value)}
            />
          </Field>
        );

      case 'number':
        return (
          <Field label={filter.label} htmlFor={fieldId} error={warningText}>
            <Input
              id={fieldId}
              type="number"
              aria-invalid={hasWarning || undefined}
              value={(value as number | string | undefined) || ''}
              onChange={(e) => handleFilterChange(filter.name, parseFloat(e.target.value) || undefined)}
              placeholder={filter.description}
            />
          </Field>
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-2 self-end pb-2">
            <Checkbox
              id={fieldId}
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleFilterChange(filter.name, checked === true)}
            />
            <Label htmlFor={fieldId} className="cursor-pointer text-sm font-normal text-foreground">
              {filter.label}
            </Label>
          </div>
        );

      case 'multiselect':
        if (filter.name === 'employee_ids') {
          const selectedIds = typeof value === 'string' && value
            ? value.split(',').map((id) => id.trim()).filter(Boolean)
            : [];
          const selectedEmployees = employees.filter((emp) => selectedIds.includes(emp.id));
          return (
            <Field
              label={filter.label}
              error={warningText}
              hint="Leave empty for all employees"
            >
              <EmployeeMultiSelect
                employees={employees}
                selected={selectedEmployees}
                loading={employeesLoading}
                disabled={!filters.company_id && !selectedCompanyId}
                invalid={hasWarning}
                noOptionsText={
                  !filters.company_id && !selectedCompanyId
                    ? 'Select a company first'
                    : 'No matching employees'
                }
                onChange={(newValue) => {
                  handleFilterChange(
                    filter.name,
                    newValue.length > 0 ? newValue.map((e: EmployeeOption) => e.id).join(',') : undefined
                  );
                }}
              />
            </Field>
          );
        }
        return null;

      default:
        return null;
    }
  };

    const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== '' && value !== null && !(Array.isArray(value) && value.length === 0)
    ).length;
  };

  const handleApplyFilters = () => {
    // Validate filters before applying
    const validation = validateFilters(filters, reportType);
    setValidationResult(validation);
    
    // Validate sort/group fields
    const sortGroupValidation = validateSortGroupFields(
      filters.sort_by,
      filters.group_by,
      filters.group_by_secondary,
      reportType
    );
    setSortGroupValidation(sortGroupValidation);
    
    if (!validation.isValid || !sortGroupValidation.isValid) {
      setShowValidationErrors(true);
      return;
    }
    
    setShowValidationErrors(false);
    onApplyFilters();
  };

  const handleClearFilters = () => {
    onClearFilters();
    setValidationResult(null);
    setSortGroupValidation(null);
    setShowValidationErrors(false);
  };

  const sortError = sortGroupValidation?.errors.find((e) => e.includes('Sort field'));
  const groupError = sortGroupValidation?.errors.find((e) => e.includes('Group field'));
  const secondaryError = sortGroupValidation?.errors.find((e) => e.includes('Secondary group field'));
  const activeCount = getActiveFiltersCount();
  const generateDisabled =
    loading ||
    (validationResult ? !validationResult.isValid : false) ||
    (sortGroupValidation ? !sortGroupValidation.isValid : false);

  const renderFilterGrid = (list: ReportFilter[], wideMultiselect: boolean) => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((filter) => {
        const field = renderFilterField(filter);
        if (!field) return null;
        return (
          <div
            key={filter.name}
            className={cn('min-w-0', wideMultiselect && filter.type === 'multiselect' && 'sm:col-span-2')}
          >
            {field}
          </div>
        );
      })}
    </div>
  );

  if (!filterOptions) {
    return (
      <Card className="gap-3 p-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <h2 className="m-0 text-sm font-semibold text-foreground">Report Filters</h2>
          {activeCount > 0 && <Badge variant="secondary">{activeCount} active</Badge>}
          {validationResult && !validationResult.isValid && (
            <Badge variant="destructive">
              {validationResult.errors.length} error{validationResult.errors.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {validationResult && validationResult.warnings.length > 0 && (
            <Badge
              variant="secondary"
              className="border-transparent bg-event-cra/15 text-event-cra"
            >
              {validationResult.warnings.length} warning{validationResult.warnings.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          aria-expanded={open}
          onClick={() => onOpenChange?.(!open)}
        >
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          {open ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleContent>
          <div className="border-0 border-t border-solid border-border px-4 pt-3 pb-4">
            {/* Validation Errors */}
            {showValidationErrors && validationResult && !validationResult.isValid && (
              <div
                role="alert"
                className="mb-3 rounded-md border border-solid border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <p className="m-0 font-medium">Filter Validation Errors:</p>
                <ul className="m-0 mt-1 list-none space-y-0.5 p-0">
                  {validationResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Warnings */}
            {((validationResult?.warnings?.length || 0) > 0 ||
              (sortGroupValidation?.warnings?.length || 0) > 0) && (
              <div className="mb-3 rounded-md border border-solid border-event-cra/30 bg-event-cra/10 p-3 text-sm text-event-cra">
                <p className="m-0 font-medium">Filter Warnings:</p>
                <ul className="m-0 mt-1 list-none space-y-0.5 p-0">
                  {validationResult?.warnings?.map((warning, index) => (
                    <li key={`filter-${index}`}>• {warning}</li>
                  ))}
                  {sortGroupValidation?.warnings?.map((warning, index) => (
                    <li key={`sortgroup-${index}`}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              {filterOptions.common_filters.length > 0 && (
                <Section
                  title="Common Filters"
                  open={expandedSections.common}
                  onToggle={() => handleSectionToggle('common')}
                >
                  {renderFilterGrid(filterOptions.common_filters, true)}
                </Section>
              )}

              {filterOptions.specific_filters.length > 0 && (
                <Section
                  title="Specific Filters"
                  open={expandedSections.specific}
                  onToggle={() => handleSectionToggle('specific')}
                >
                  {renderFilterGrid(filterOptions.specific_filters, false)}
                </Section>
              )}

              <Section
                title="Sort & Group Options"
                open={expandedSections.sortGroup}
                onToggle={() => handleSectionToggle('sortGroup')}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sort By" error={sortError}>
                    <Select
                      value={filters.sort_by || NONE}
                      onValueChange={(v) => handleFilterChange('sort_by', v === NONE ? '' : v)}
                    >
                      <SelectTrigger className="w-full" aria-invalid={!!sortError || undefined}>
                        <SelectValue placeholder="No Sorting" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>No Sorting</SelectItem>
                        {getAvailableSortFields(reportType).map((field) => (
                          <SelectItem key={field} value={field} title={getFieldDescription(field)}>
                            {getFieldDisplayName(field)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Sort Direction">
                    <Select
                      value={filters.sort_direction || 'asc'}
                      onValueChange={(v) => handleFilterChange('sort_direction', v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending (A-Z)</SelectItem>
                        <SelectItem value="desc">Descending (Z-A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Group By" error={groupError}>
                    <Select
                      value={filters.group_by || NONE}
                      onValueChange={(v) => handleFilterChange('group_by', v === NONE ? '' : v)}
                    >
                      <SelectTrigger className="w-full" aria-invalid={!!groupError || undefined}>
                        <SelectValue placeholder="No Grouping" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>No Grouping</SelectItem>
                        {getAvailableGroupFields(reportType).map((field) => (
                          <SelectItem
                            key={field}
                            value={field}
                            title={`Group by ${getFieldDisplayName(field).toLowerCase()}`}
                          >
                            {getFieldDisplayName(field)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Secondary Group By" error={secondaryError}>
                    <Select
                      value={filters.group_by_secondary || NONE}
                      onValueChange={(v) => handleFilterChange('group_by_secondary', v === NONE ? '' : v)}
                      disabled={!filters.group_by}
                    >
                      <SelectTrigger className="w-full" aria-invalid={!!secondaryError || undefined}>
                        <SelectValue placeholder="No Secondary Grouping" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>No Secondary Grouping</SelectItem>
                        {getAvailableGroupFields(reportType)
                          .filter((field) => field !== filters.group_by) // Don't allow same field as primary group
                          .map((field) => (
                            <SelectItem
                              key={field}
                              value={field}
                              title={`Secondary group by ${getFieldDisplayName(field).toLowerCase()}`}
                            >
                              {getFieldDisplayName(field)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                {reportType === 'leave_taken' && (
                  <p className="m-0 mt-3 text-xs text-muted-foreground">
                    Leave Category groups rows into Vacation, Sick, No Pay (unpaid leave and unpaid sick), and Others, with a day subtotal on each group. Grouping by employee adds those categories under each person.
                  </p>
                )}
              </Section>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-0 border-t border-solid border-border pt-4">
              <Button variant="outline" onClick={handleClearFilters}>
                <FilterX className="size-4" /> Clear Filters
              </Button>
              <Button onClick={handleApplyFilters} disabled={generateDisabled}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
