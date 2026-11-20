import React, { useState, useEffect, useCallback } from 'react';
import { Building2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { companyAPI } from '../api/client';
import AppToast from '../components/AppToast';
import {
  EmptyState, PageHeader, SearchInput, TableCard, TableSkeleton, Toolbar, adminCellClass,
  adminHeadClass,
} from '../components/admin/AdminParts';
import CompanyFormDialog from '../components/company/CompanyFormDialog';
import {
  Company,
  CompanyFormData,
  VacationTier,
  defaultVacationTiers,
} from '../components/company/types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const emptyFormData = (): CompanyFormData => ({
  id: '',
  legal_name: '',
  trade_name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  province: '',
  postal_code: '',
  country: 'Canada',
  notes: '',
  payroll_due_start_date: '',
  pay_period_start_date: '',
  payroll_frequency: '',
  cra_due_dates: '',
  union_due_date: '',
  vacation_pay_with_payroll: true,
  vacation_percent_tiers: defaultVacationTiers(),
});

const CompanyPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(emptyFormData());
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [toast, setToast] = useState<{ message: string | null; variant: 'success' | 'error' }>({
    message: null,
    variant: 'success',
  });
  const closeToast = useCallback(() => setToast((prev) => ({ ...prev, message: null })), []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await companyAPI.list({ search: searchTerm || undefined });
      if (response.data.success) {
        setCompanies(response.data.data || []);
      } else {
        setCompanies([]);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
      setToast({ message: 'Error fetching companies', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        id: company.id,
        legal_name: company.legal_name,
        trade_name: company.trade_name || '',
        address_line1: company.address_line1 || '',
        address_line2: company.address_line2 || '',
        city: company.city || '',
        province: company.province || '',
        postal_code: company.postal_code || '',
        country: company.country || 'Canada',
        notes: company.notes || '',
        payroll_due_start_date: company.payroll_due_start_date || '',
        pay_period_start_date: company.pay_period_start_date || '',
        payroll_frequency: company.payroll_frequency || '',
        cra_due_dates: company.cra_due_dates || '',
        union_due_date: company.union_due_date ? company.union_due_date.toString() : '',
        vacation_pay_with_payroll: company.vacation_pay_with_payroll !== false,
        vacation_percent_tiers: (() => {
          const loaded = (company.vacation_percent_tiers || []).map((t) => ({
            id: t.id,
            min_years: t.min_years,
            max_years: t.max_years ?? null,
            percent: t.percent,
            union_member: !!(t as VacationTier).union_member,
          }));
          if (!loaded.length) return defaultVacationTiers();
          const hasUnion = loaded.some((t) => t.union_member);
          const hasNonUnion = loaded.some((t) => !t.union_member);
          // Legacy rows without union_member were treated as non-union; seed the missing group
          if (!hasUnion && hasNonUnion) {
            return [
              ...loaded,
              ...loaded.map((t) => ({
                min_years: t.min_years,
                max_years: t.max_years,
                percent: t.percent,
                union_member: true,
              })),
            ];
          }
          if (hasUnion && !hasNonUnion) {
            return [
              ...loaded.map((t) => ({
                min_years: t.min_years,
                max_years: t.max_years,
                percent: t.percent,
                union_member: false,
              })),
              ...loaded,
            ];
          }
          return loaded;
        })(),
      });
    } else {
      setEditingCompany(null);
      setFormData(emptyFormData());
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCompany(null);
    setFormData(emptyFormData());
  };

  const handleSubmit = async () => {
    try {
      // Clean form data - convert empty strings to null/undefined for optional fields
      const cleanedFormData = {
        ...formData,
        trade_name: formData.trade_name || undefined,
        address_line1: formData.address_line1 || undefined,
        address_line2: formData.address_line2 || undefined,
        city: formData.city || undefined,
        province: formData.province || undefined,
        postal_code: formData.postal_code || undefined,
        notes: formData.notes || undefined,
        payroll_due_start_date: formData.payroll_due_start_date && formData.payroll_due_start_date !== '' ? formData.payroll_due_start_date : undefined,
        pay_period_start_date: formData.pay_period_start_date && formData.pay_period_start_date !== '' ? formData.pay_period_start_date : undefined,
        payroll_frequency: formData.payroll_frequency || undefined,
        cra_due_dates: formData.cra_due_dates || undefined,
        union_due_date: formData.union_due_date && formData.union_due_date !== '' ? Number(formData.union_due_date) : undefined,
        vacation_pay_with_payroll: formData.vacation_pay_with_payroll,
      };
      const { vacation_percent_tiers, ...companyPayload } = cleanedFormData as any;

      if (editingCompany) {
        await companyAPI.update(editingCompany.id, companyPayload);
        await companyAPI.replaceVacationPercentTiers(
          editingCompany.id,
          formData.vacation_percent_tiers.map((t) => ({
            min_years: Number(t.min_years),
            max_years: t.max_years === null || t.max_years === ('' as any) ? null : Number(t.max_years),
            percent: Number(t.percent),
            union_member: !!t.union_member,
          }))
        );
        setToast({ message: 'Company updated successfully', variant: 'success' });
      } else {
        await companyAPI.create(companyPayload);
        // New company seeds BC ESA tiers on backend; overwrite if user edited
        if (formData.id) {
          await companyAPI.replaceVacationPercentTiers(
            formData.id.toUpperCase(),
            formData.vacation_percent_tiers.map((t) => ({
              min_years: Number(t.min_years),
              max_years: t.max_years === null || t.max_years === ('' as any) ? null : Number(t.max_years),
              percent: Number(t.percent),
              union_member: !!t.union_member,
            }))
          );
        }
        setToast({ message: 'Company created successfully', variant: 'success' });
      }
      handleCloseDialog();
      fetchCompanies();
    } catch (error: any) {
      console.error('Error saving company:', error);
      setToast({
        message: error.response?.data?.detail || 'Error saving company',
        variant: 'error',
      });
    }
  };

  const handleDelete = async (companyId: string) => {
    try {
      await companyAPI.delete(companyId);
      setToast({ message: 'Company deleted successfully', variant: 'success' });
      fetchCompanies();
    } catch (error: any) {
      console.error('Error deleting company:', error);
      setToast({
        message: error.response?.data?.detail || 'Error deleting company',
        variant: 'error',
      });
    }
  };

  const confirmDelete = () => {
    const company = companyToDelete;
    if (!company) return;
    setCompanyToDelete(null);
    handleDelete(company.id);
  };

  const formatAddress = (company: Company) => {
    const parts = [
      company.address_line1,
      company.address_line2,
      company.city,
      company.province,
      company.postal_code,
    ].filter(Boolean);
    return parts.join(', ') || 'No address';
  };

  const renderBody = () => {
    if (loading) return <TableSkeleton />;
    if (companies.length === 0) {
      const searching = !!searchTerm;
      return (
        <EmptyState
          icon={Building2}
          title={searching ? 'No matching companies' : 'No companies found'}
          description={
            searching
              ? `No companies match "${searchTerm}".`
              : 'Add your first company to start managing payroll and vacation settings.'
          }
          actionLabel={searching ? 'Clear search' : 'Add Company'}
          actionIcon={searching ? undefined : Plus}
          onAction={searching ? () => setSearchTerm('') : () => handleOpenDialog()}
        />
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={adminHeadClass}>Company ID</TableHead>
            <TableHead className={adminHeadClass}>Legal Name</TableHead>
            <TableHead className={adminHeadClass}>Trade Name</TableHead>
            <TableHead className={adminHeadClass}>Address</TableHead>
            <TableHead className={adminHeadClass}>Country</TableHead>
            <TableHead className={cn(adminHeadClass, 'w-28 text-right')}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell className={adminCellClass}>
                <Badge variant="secondary" className="gap-1 font-mono text-xs">
                  <Building2 className="size-3" />
                  {company.id}
                </Badge>
              </TableCell>
              <TableCell className={cn(adminCellClass, 'text-sm font-medium text-foreground')}>
                {company.legal_name}
              </TableCell>
              <TableCell className={cn(adminCellClass, 'text-sm text-muted-foreground')}>
                {company.trade_name || '-'}
              </TableCell>
              <TableCell className={cn(adminCellClass, 'text-sm')}>
                <div className="flex max-w-xs items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate" title={formatAddress(company)}>
                    {formatAddress(company)}
                  </span>
                </div>
              </TableCell>
              <TableCell className={cn(adminCellClass, 'text-sm')}>{company.country}</TableCell>
              <TableCell className={adminCellClass}>
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Edit Company"
                        onClick={() => handleOpenDialog(company)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit Company</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label="Delete Company"
                        onClick={() => setCompanyToDelete(company)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete Company</TooltipContent>
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
        title="Company Management"
        subtitle="Manage companies, payroll configuration and vacation pay schedules"
        actions={
          <Button className="rounded-md" onClick={() => handleOpenDialog()}>
            <Plus className="size-4" /> Add Company
          </Button>
        }
      />

      <Toolbar>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search companies by name or ID..."
          ariaLabel="Search companies"
        />
        <Badge variant="secondary" className="tabular-nums">
          {companies.length} {companies.length === 1 ? 'company' : 'companies'}
        </Badge>
      </Toolbar>

      <TableCard>{renderBody()}</TableCard>

      <CompanyFormDialog
        open={dialogOpen}
        isEditing={!!editingCompany}
        formData={formData}
        setFormData={setFormData}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!companyToDelete} onOpenChange={(o) => !o && setCompanyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete company?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this company
              {companyToDelete ? ` (${companyToDelete.id} – ${companyToDelete.legal_name})` : ''}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppToast message={toast.message} variant={toast.variant} onClose={closeToast} />
    </div>
  );
};

export default CompanyPage;
