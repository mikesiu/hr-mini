import React, { useState, useEffect, useCallback } from 'react';
import { Building2, CalendarDays, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { holidayAPI } from '../api/client';
import { useCompanyFilter } from '../contexts/CompanyFilterContext';
import AppToast from '../components/AppToast';
import {
  EmptyState, PageHeader, SearchInput, TableCard, TableSkeleton, Toolbar, adminCellClass,
  adminHeadClass,
} from '../components/admin/AdminParts';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ALL = 'all';

interface Holiday {
  id: number;
  company_id: string;
  holiday_date: string;
  name: string;
  is_active: boolean;
  union_only: boolean;
}

interface HolidayFormData {
  company_id: string;
  holiday_date: string;
  name: string;
  is_active: boolean;
  union_only: boolean;
}

const HolidayPage: React.FC = () => {
  // Use companies from the global context instead of fetching them again
  const { companies, loading: companiesLoading } = useCompanyFilter();
  
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number | string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>({
    company_id: '',
    holiday_date: '',
    name: '',
    is_active: true,
    union_only: false,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [submitting, setSubmitting] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copying, setCopying] = useState(false);

  // Get current year and generate year options (current year ± 2)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const [copyFormData, setCopyFormData] = useState({
    source_company_id: '',
    target_company_id: '',
    year: currentYear,
  });

  const fetchHolidays = useCallback(async () => {
    // Don't try to fetch if no companies available or still loading
    if (companiesLoading || companies.length === 0) {
      setHolidays([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get holidays for all companies if "all" is selected
      if (selectedCompanyId === 'all') {
        const allHolidays: Holiday[] = [];
        for (const company of companies) {
          try {
            const params: any = { active_only: false };
            if (selectedYear !== 'all') {
              params.year = selectedYear;
            }
            const response = await holidayAPI.list(company.id, params);
            const companyHolidays = response.data || [];
            allHolidays.push(...companyHolidays);
          } catch (error: any) {
            console.error(`Error fetching holidays for company ${company.id}:`, error);
            // Don't show error for individual companies, just log it
          }
        }
        setHolidays(allHolidays);
      } else {
        // Get holidays for selected company
        const params: any = { active_only: false };
        if (selectedYear !== 'all') {
          params.year = selectedYear;
        }
        const response = await holidayAPI.list(selectedCompanyId, params);
        setHolidays(response.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching holidays:', error);
      let errorMessage = 'Error fetching holidays';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout: Backend is not responding. Please check if the backend server is running.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedYear, companies, companiesLoading]);

  useEffect(() => {
    // Only fetch holidays if companies are loaded and not loading
    if (!companiesLoading && companies.length > 0) {
      fetchHolidays();
    } else if (!companiesLoading && companies.length === 0) {
      // If no companies and finished loading, set holidays to empty
      setHolidays([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companiesLoading, companies.length, selectedCompanyId, selectedYear]);

  // Filter holidays by search term
  const filteredHolidays = holidays.filter(holiday => {
    const matchesSearch = !searchTerm || 
      holiday.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      holiday.company_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCompany = selectedCompanyId === 'all' || holiday.company_id === selectedCompanyId;
    
    // Parse date string to avoid timezone issues
    const holidayYear = holiday.holiday_date.match(/^\d{4}-\d{2}-\d{2}$/) 
      ? parseInt(holiday.holiday_date.split('-')[0])
      : new Date(holiday.holiday_date).getFullYear();
    const matchesYear = selectedYear === 'all' || holidayYear === selectedYear;
    
    return matchesSearch && matchesCompany && matchesYear;
  });

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        company_id: holiday.company_id,
        holiday_date: holiday.holiday_date,
        name: holiday.name,
        is_active: holiday.is_active,
        union_only: holiday.union_only || false,
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        company_id: selectedCompanyId !== 'all' ? selectedCompanyId : '',
        holiday_date: '',
        name: '',
        is_active: true,
        union_only: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingHoliday(null);
    setFormData({
      company_id: '',
      holiday_date: '',
      name: '',
      is_active: true,
      union_only: false,
    });
  };

  const handleSubmit = async () => {
    if (!formData.company_id || !formData.holiday_date || !formData.name.trim()) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error',
      });
      return;
    }

    try {
      setSubmitting(true);
      if (editingHoliday) {
        await holidayAPI.update(editingHoliday.id, {
          holiday_date: formData.holiday_date,
          name: formData.name.trim(),
          is_active: formData.is_active,
          union_only: formData.union_only,
        });
        setSnackbar({
          open: true,
          message: 'Holiday updated successfully',
          severity: 'success',
        });
      } else {
        await holidayAPI.create({
          company_id: formData.company_id,
          holiday_date: formData.holiday_date,
          name: formData.name.trim(),
          is_active: formData.is_active,
          union_only: formData.union_only,
        });
        setSnackbar({
          open: true,
          message: 'Holiday created successfully',
          severity: 'success',
        });
      }
      handleCloseDialog();
      fetchHolidays();
    } catch (error: any) {
      console.error('Error saving holiday:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Error saving holiday',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!holidayToDelete) return;

    try {
      await holidayAPI.delete(holidayToDelete.id);
      setSnackbar({
        open: true,
        message: 'Holiday deleted successfully',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setHolidayToDelete(null);
      fetchHolidays();
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Error deleting holiday',
        severity: 'error',
      });
    }
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company ? (company.trade_name || company.legal_name) : companyId;
  };

  const formatDate = (dateString: string) => {
    // Parse the date string as local date to avoid timezone issues
    // If the date string is in YYYY-MM-DD format, use it directly
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
      });
    }
    // Otherwise, parse as date and format
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  const closeSnackbar = useCallback(() => setSnackbar((s) => ({ ...s, open: false })), []);

  const handleCopySubmit = async () => {
    if (!copyFormData.source_company_id || !copyFormData.target_company_id) {
      setSnackbar({
        open: true,
        message: 'Please select both source and target companies',
        severity: 'error',
      });
      return;
    }

    if (copyFormData.source_company_id === copyFormData.target_company_id) {
      setSnackbar({
        open: true,
        message: 'Source and target companies must be different',
        severity: 'error',
      });
      return;
    }

    try {
      setCopying(true);
      const response = await holidayAPI.copy(
        copyFormData.source_company_id,
        copyFormData.target_company_id,
        copyFormData.year,
        true // skip duplicates
      );

      setSnackbar({
        open: true,
        message: response.data.message || `Successfully copied ${response.data.copied} holiday(s)`,
        severity: 'success',
      });

      setCopyDialogOpen(false);
      fetchHolidays(); // Refresh the list
    } catch (error: any) {
      console.error('Error copying holidays:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Error copying holidays',
        severity: 'error',
      });
    } finally {
      setCopying(false);
    }
  };

  const openCopyDialog = () => {
    setCopyFormData({
      source_company_id: '',
      target_company_id: selectedCompanyId !== 'all' ? selectedCompanyId : '',
      year: currentYear,
    });
    setCopyDialogOpen(true);
  };

  const hasFilters = !!searchTerm || selectedCompanyId !== 'all' || selectedYear !== 'all';
  const companyLabel = (c: { id: string; trade_name?: string | null; legal_name: string }) =>
    `${c.trade_name || c.legal_name} (${c.id})`;

  const renderBody = () => {
    if (companiesLoading || loading) return <TableSkeleton />;
    if (filteredHolidays.length === 0) {
      return (
        <EmptyState
          icon={CalendarDays}
          title="No holidays found"
          description={hasFilters ? 'Try adjusting your filters' : 'Add your first holiday to get started'}
          actionLabel={hasFilters ? 'Clear filters' : 'Add Holiday'}
          actionIcon={hasFilters ? undefined : Plus}
          onAction={
            hasFilters
              ? () => {
                  setSearchTerm('');
                  setSelectedCompanyId('all');
                  setSelectedYear('all');
                }
              : companies.length > 0
                ? () => handleOpenDialog()
                : undefined
          }
        />
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={adminHeadClass}>Date</TableHead>
            <TableHead className={adminHeadClass}>Holiday Name</TableHead>
            <TableHead className={adminHeadClass}>Company</TableHead>
            <TableHead className={adminHeadClass}>Status</TableHead>
            <TableHead className={cn(adminHeadClass, 'text-right')}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredHolidays.map((holiday) => (
            <TableRow key={holiday.id} className={cn(!holiday.is_active && 'opacity-60')}>
              <TableCell className={cn(adminCellClass, 'text-sm whitespace-nowrap tabular-nums')}>
                {formatDate(holiday.holiday_date)}
              </TableCell>
              <TableCell className={cn(adminCellClass, 'text-sm font-medium text-foreground')}>
                {holiday.name}
              </TableCell>
              <TableCell className={adminCellClass}>
                <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                  <Building2 className="size-4 text-muted-foreground" />
                  {getCompanyName(holiday.company_id)}
                </div>
              </TableCell>
              <TableCell className={adminCellClass}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={cn(
                      holiday.is_active && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    )}
                  >
                    {holiday.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {holiday.union_only && <Badge variant="outline">Union Only</Badge>}
                </div>
              </TableCell>
              <TableCell className={adminCellClass}>
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Edit"
                        onClick={() => handleOpenDialog(holiday)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label="Delete"
                        onClick={() => handleDeleteClick(holiday)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Holiday Management"
        subtitle="Maintain statutory and company holidays used in leave and pay calculations"
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={openCopyDialog}
              disabled={companies.length === 0 || companies.length < 2}
              title={
                companies.length < 2
                  ? 'Need at least 2 companies to copy holidays'
                  : 'Copy holidays from one company to another'
              }
            >
              <Copy className="size-4" /> Copy Holidays
            </Button>
            <Button className="rounded-md" onClick={() => handleOpenDialog()} disabled={companies.length === 0}>
              <Plus className="size-4" /> Add Holiday
            </Button>
          </>
        }
      />

      {!companiesLoading && !loading && companies.length === 0 && (
        <Alert>
          <AlertDescription>
            No companies found. Please create companies first before adding holidays.
          </AlertDescription>
        </Alert>
      )}

      <Toolbar>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search holidays by name or company..."
            ariaLabel="Search holidays"
          />
          <Select
            value={selectedCompanyId}
            onValueChange={setSelectedCompanyId}
            disabled={companiesLoading}
          >
            <SelectTrigger className="w-full sm:w-[240px]" aria-label="Filter by company">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {companyLabel(company)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(v === ALL ? ALL : Number(v))}
            disabled={companiesLoading}
          >
            <SelectTrigger className="w-full sm:w-[130px]" aria-label="Filter by year">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Years</SelectItem>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {filteredHolidays.length} {filteredHolidays.length === 1 ? 'holiday' : 'holidays'}
        </Badge>
      </Toolbar>

      <TableCard>{renderBody()}</TableCard>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && !submitting && handleCloseDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
            <DialogDescription>
              {editingHoliday
                ? 'Update the holiday details.'
                : 'Add a holiday for a company.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Company *</Label>
              <Select
                value={formData.company_id}
                onValueChange={(v) => setFormData({ ...formData, company_id: v })}
                disabled={!!editingHoliday}
              >
                <SelectTrigger className="w-full" aria-label="Company">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {companyLabel(company)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="holiday-date">Holiday Date *</Label>
              <Input
                id="holiday-date"
                type="date"
                value={formData.holiday_date}
                onChange={(e) => setFormData({ ...formData, holiday_date: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="holiday-name">Holiday Name *</Label>
              <Input
                id="holiday-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., New Year's Day, Christmas Day"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="holiday-active"
                className="mt-0.5"
                checked={formData.is_active}
                onCheckedChange={(c) => setFormData({ ...formData, is_active: c === true })}
              />
              <div className="grid gap-0.5">
                <Label htmlFor="holiday-active">Active</Label>
                <p className="m-0 text-xs text-muted-foreground">
                  Inactive holidays will not be excluded from leave calculations
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="holiday-union"
                className="mt-0.5"
                checked={formData.union_only}
                onCheckedChange={(c) => setFormData({ ...formData, union_only: c === true })}
              />
              <div className="grid gap-0.5">
                <Label htmlFor="holiday-union">Union Members Only</Label>
                <p className="m-0 text-xs text-muted-foreground">
                  If checked, this holiday will only apply to union members. Non-union employees will
                  not have this holiday excluded from leave calculations or receive stat holiday pay.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formData.company_id || !formData.holiday_date || !formData.name.trim()}
            >
              {submitting ? 'Saving…' : editingHoliday ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this holiday? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {holidayToDelete && (
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-muted p-3 text-sm">
              <dt className="font-medium">Date:</dt>
              <dd className="m-0 tabular-nums">{formatDate(holidayToDelete.holiday_date)}</dd>
              <dt className="font-medium">Name:</dt>
              <dd className="m-0">{holidayToDelete.name}</dd>
              <dt className="font-medium">Company:</dt>
              <dd className="m-0">{getCompanyName(holidayToDelete.company_id)}</dd>
            </dl>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy Holidays Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={(o) => !o && !copying && setCopyDialogOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Holidays from Another Company</DialogTitle>
            <DialogDescription>
              Copy a year of holidays from one company to another.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Source Company (Copy From) *</Label>
              <Select
                value={copyFormData.source_company_id}
                onValueChange={(v) => setCopyFormData({ ...copyFormData, source_company_id: v })}
              >
                <SelectTrigger className="w-full" aria-label="Source company">
                  <SelectValue placeholder="Select source company" />
                </SelectTrigger>
                <SelectContent>
                  {companies
                    .filter((c) => c.id !== copyFormData.target_company_id)
                    .map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {companyLabel(company)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Target Company (Copy To) *</Label>
              <Select
                value={copyFormData.target_company_id}
                onValueChange={(v) => setCopyFormData({ ...copyFormData, target_company_id: v })}
              >
                <SelectTrigger className="w-full" aria-label="Target company">
                  <SelectValue placeholder="Select target company" />
                </SelectTrigger>
                <SelectContent>
                  {companies
                    .filter((c) => c.id !== copyFormData.source_company_id)
                    .map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {companyLabel(company)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="copy-year">Year *</Label>
              <Input
                id="copy-year"
                type="number"
                min={2000}
                max={2100}
                value={copyFormData.year}
                onChange={(e) =>
                  setCopyFormData({ ...copyFormData, year: parseInt(e.target.value) || currentYear })
                }
              />
              <p className="m-0 text-xs text-muted-foreground">
                Holidays from the selected year will be copied to the target company
              </p>
            </div>
            <Alert>
              <AlertDescription>
                This will copy all holidays from the source company for the selected year to the
                target company. Duplicate holidays (same date) will be skipped automatically.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)} disabled={copying}>
              Cancel
            </Button>
            <Button
              onClick={handleCopySubmit}
              disabled={copying || !copyFormData.source_company_id || !copyFormData.target_company_id}
            >
              <Copy className="size-4" /> {copying ? 'Copying...' : 'Copy Holidays'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppToast
        message={snackbar.open ? snackbar.message : null}
        variant={snackbar.severity}
        onClose={closeSnackbar}
      />
    </div>
  );
};

export default HolidayPage;
