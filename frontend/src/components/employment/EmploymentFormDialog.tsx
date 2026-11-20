import React from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import CodeSelectField from '../CodeSelectField';

export interface EmploymentFormData {
  employee_id: string;
  company_id: string;
  position: string;
  department: string;
  start_date: string;
  end_date: string;
  remarks: string;
  employee_type: string;
  count_all_ot: boolean;
  is_driver: boolean;
}

export const createEmptyEmploymentForm = (): EmploymentFormData => ({
  employee_id: '',
  company_id: '',
  position: '',
  department: '',
  start_date: '',
  end_date: '',
  remarks: '',
  employee_type: '',
  count_all_ot: false,
  is_driver: false,
});

interface EmployeeOption {
  id: string;
  full_name: string;
}

interface CompanyOption {
  id: string;
  legal_name: string;
  trade_name?: string | null;
}

interface EmploymentFormDialogProps {
  open: boolean;
  title: string;
  isEditing: boolean;
  formData: EmploymentFormData;
  employees: EmployeeOption[];
  companies: CompanyOption[];
  employeeLocked: boolean;
  error: string | null;
  onChange: (patch: Partial<EmploymentFormData>) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
}

const labelClass = 'text-xs font-medium text-muted-foreground';

const EmploymentFormDialog: React.FC<EmploymentFormDialogProps> = ({
  open,
  title,
  isEditing,
  formData,
  employees,
  companies,
  employeeLocked,
  error,
  onChange,
  onClose,
  onSubmit,
}) => {
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Position, company and start date describe where and when the employee works.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="emp-employee" className={labelClass}>
                Employee <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.employee_id}
                onValueChange={(employee_id) => onChange({ employee_id })}
                disabled={employeeLocked}
              >
                <SelectTrigger id="emp-employee" className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="emp-company" className={labelClass}>
                Company <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.company_id}
                onValueChange={(company_id) => onChange({ company_id })}
              >
                <SelectTrigger id="emp-company" className="w-full">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.id} - {company.legal_name}
                      {company.trade_name ? ` (${company.trade_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <CodeSelectField
              id="emp-position"
              category="position"
              label="Position"
              value={formData.position}
              onChange={(position) => onChange({ position })}
              required
            />
            <CodeSelectField
              id="emp-department"
              category="department"
              label="Department"
              value={formData.department}
              onChange={(department) => onChange({ department })}
            />
            <CodeSelectField
              id="emp-type"
              category="employee_type"
              label="Employee Type"
              value={formData.employee_type}
              onChange={(employee_type) => onChange({ employee_type })}
            />
            <div aria-hidden="true" className="hidden sm:block" />

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="emp-start" className={labelClass}>
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="emp-start"
                type="date"
                value={formData.start_date}
                onChange={(e) => onChange({ start_date: e.target.value })}
                required
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="emp-end" className={labelClass}>
                End Date
              </Label>
              <Input
                id="emp-end"
                type="date"
                value={formData.end_date}
                onChange={(e) => onChange({ end_date: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="emp-driver"
                checked={formData.is_driver}
                onCheckedChange={(c) => onChange({ is_driver: c === true })}
              />
              <Label htmlFor="emp-driver" className="text-sm font-normal">
                Driver (early-start OT)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="emp-count-ot"
                checked={formData.count_all_ot}
                onCheckedChange={(c) => onChange({ count_all_ot: c === true })}
              />
              <Label htmlFor="emp-count-ot" className="text-sm font-normal">
                Count All Overtime (even &lt; 30 min)
              </Label>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="emp-remarks" className={labelClass}>
                Remarks
              </Label>
              <Textarea
                id="emp-remarks"
                rows={3}
                value={formData.remarks}
                onChange={(e) => onChange({ remarks: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmploymentFormDialog;
