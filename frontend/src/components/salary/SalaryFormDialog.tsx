import React from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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

export interface SalaryFormData {
  employee_id: string;
  pay_rate: string;
  pay_type: string;
  effective_date: Date;
  end_date: Date | null;
  notes: string;
  wage_classification: string;
}

export const PAY_TYPES = ['Hourly', 'Monthly', 'Annual'];

// Helper function to safely format date for input field
export const formatDateForInput = (date: Date | null): string => {
  if (!date) return '';
  try {
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

interface SalaryFormDialogProps {
  open: boolean;
  isEditing: boolean;
  formData: SalaryFormData;
  loading: boolean;
  error: string | null;
  onChange: (patch: Partial<SalaryFormData>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const req = <span className="text-destructive"> *</span>;

const SalaryFormDialog: React.FC<SalaryFormDialogProps> = ({
  open,
  isEditing,
  formData,
  loading,
  error,
  onChange,
  onClose,
  onSubmit,
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Salary Record' : 'Add New Salary Record'}</DialogTitle>
        <DialogDescription>
          Pay rate and effective date are required. Leave the end date empty for the current rate.
        </DialogDescription>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-0.5 pr-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-employee-id" className={labelClass}>
            Employee ID{req}
          </Label>
          <Input
            id="salary-employee-id"
            value={formData.employee_id}
            onChange={(e) => onChange({ employee_id: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="salary-pay-rate" className={labelClass}>
              Pay Rate{req}
            </Label>
            <Input
              id="salary-pay-rate"
              type="number"
              min={0}
              step={0.01}
              value={formData.pay_rate}
              onChange={(e) => onChange({ pay_rate: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="salary-pay-type" className={labelClass}>
              Pay Type{req}
            </Label>
            <Select value={formData.pay_type} onValueChange={(pay_type) => onChange({ pay_type })}>
              <SelectTrigger id="salary-pay-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <CodeSelectField
          id="salary-wage-class"
          category="wage_classification"
          label="Wage Classification"
          value={formData.wage_classification}
          onChange={(wage_classification) => onChange({ wage_classification })}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="salary-effective" className={labelClass}>
              Effective Date{req}
            </Label>
            <Input
              id="salary-effective"
              type="date"
              value={formatDateForInput(formData.effective_date)}
              onChange={(e) => onChange({ effective_date: new Date(e.target.value) })}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="salary-end" className={labelClass}>
              End Date (Optional)
            </Label>
            <Input
              id="salary-end"
              type="date"
              value={formatDateForInput(formData.end_date)}
              onChange={(e) =>
                onChange({ end_date: e.target.value ? new Date(e.target.value) : null })
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-notes" className={labelClass}>
            Notes
          </Label>
          <Textarea
            id="salary-notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={loading || !formData.employee_id || !formData.pay_rate}
        >
          {loading && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default SalaryFormDialog;
