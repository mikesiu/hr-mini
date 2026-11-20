import React from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import VacationTiersEditor from './VacationTiersEditor';
import { CompanyFormData } from './types';

const NONE = '__none__';

interface CompanyFormDialogProps {
  open: boolean;
  isEditing: boolean;
  formData: CompanyFormData;
  setFormData: (data: CompanyFormData) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="m-0 text-xs text-muted-foreground">{children}</p>
);

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space-y-3 pt-2 sm:col-span-2">
    <Separator />
    <h3 className="m-0 text-sm font-semibold text-primary">{children}</h3>
  </div>
);

const CompanyFormDialog: React.FC<CompanyFormDialogProps> = ({
  open, isEditing, formData, setFormData, onClose, onSubmit,
}) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Company' : 'Add New Company'}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Update company details, payroll configuration and vacation pay schedules.'
            : 'Create a company with its payroll configuration and vacation pay schedules.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="company-id">Company ID *</Label>
          <Input
            id="company-id"
            value={formData.id}
            onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
            required
            disabled={isEditing}
            className="font-mono"
          />
          <Hint>Unique identifier (e.g., TOPCO)</Hint>
        </div>
        <div className="grid min-w-0 content-start gap-1.5">
          <Label htmlFor="company-country">Country *</Label>
          <Input
            id="company-country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            required
          />
        </div>
        <div className="grid min-w-0 gap-1.5 sm:col-span-2">
          <Label htmlFor="company-legal-name">Legal Name *</Label>
          <Input
            id="company-legal-name"
            value={formData.legal_name}
            onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
            required
          />
        </div>
        <div className="grid min-w-0 gap-1.5 sm:col-span-2">
          <Label htmlFor="company-trade-name">Trade Name</Label>
          <Input
            id="company-trade-name"
            value={formData.trade_name}
            onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
          />
          <Hint>Optional trading name</Hint>
        </div>
        <div className="grid min-w-0 gap-1.5 sm:col-span-2">
          <Label htmlFor="company-address1">Address Line 1</Label>
          <Input
            id="company-address1"
            value={formData.address_line1}
            onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
          />
        </div>
        <div className="grid min-w-0 gap-1.5 sm:col-span-2">
          <Label htmlFor="company-address2">Address Line 2</Label>
          <Input
            id="company-address2"
            value={formData.address_line2}
            onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
          />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-3">
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor="company-city">City</Label>
            <Input
              id="company-city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor="company-province">Province/State</Label>
            <Input
              id="company-province"
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            />
          </div>
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor="company-postal">Postal Code</Label>
            <Input
              id="company-postal"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-1.5 sm:col-span-2">
          <Label htmlFor="company-notes">Notes</Label>
          <Textarea
            id="company-notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <Hint>Additional notes about the company</Hint>
        </div>

        <SectionHeading>Payroll Configuration</SectionHeading>

        <div className="grid min-w-0 content-start gap-1.5">
          <Label htmlFor="company-payroll-due-start">Payroll Due Start Date</Label>
          <Input
            id="company-payroll-due-start"
            type="date"
            value={formData.payroll_due_start_date}
            onChange={(e) => setFormData({ ...formData, payroll_due_start_date: e.target.value })}
          />
          <Hint>Reference date to calculate pay due dates</Hint>
        </div>
        <div className="grid min-w-0 content-start gap-1.5">
          <Label htmlFor="company-pay-period-start">Payroll Start Date</Label>
          <Input
            id="company-pay-period-start"
            type="date"
            value={formData.pay_period_start_date}
            onChange={(e) => setFormData({ ...formData, pay_period_start_date: e.target.value })}
          />
          <Hint>Start date for calculating pay periods</Hint>
        </div>
        <div className="grid min-w-0 content-start gap-1.5">
          <Label htmlFor="company-frequency">Payroll Frequency</Label>
          <Select
            value={formData.payroll_frequency || NONE}
            onValueChange={(v) =>
              setFormData({ ...formData, payroll_frequency: v === NONE ? '' : v })
            }
          >
            <SelectTrigger id="company-frequency" className="w-full">
              <SelectValue placeholder="Select Frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Select Frequency</SelectItem>
              <SelectItem value="bi-weekly">Bi-weekly (Every 14 days)</SelectItem>
              <SelectItem value="bi-monthly">Bi-monthly (15th and last day)</SelectItem>
              <SelectItem value="monthly">Monthly (Same day each month)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-0 content-start gap-1.5">
          <Label htmlFor="company-cra">CRA Due Dates</Label>
          <Input
            id="company-cra"
            value={formData.cra_due_dates}
            placeholder="15,30"
            onChange={(e) => setFormData({ ...formData, cra_due_dates: e.target.value })}
          />
          <Hint>Comma-separated day numbers (e.g., 15,30)</Hint>
        </div>
        <div className="grid min-w-0 content-start gap-1.5">
          <Label htmlFor="company-union-due">Union Due Date</Label>
          <Input
            id="company-union-due"
            type="number"
            min={1}
            max={31}
            value={formData.union_due_date}
            onChange={(e) => setFormData({ ...formData, union_due_date: e.target.value })}
          />
          <Hint>Day of month (1-31)</Hint>
        </div>

        <SectionHeading>Vacation Pay %</SectionHeading>

        <div className="flex min-w-0 items-start gap-2 sm:col-span-2">
          <Checkbox
            id="company-vacation-with-payroll"
            className="mt-0.5"
            checked={formData.vacation_pay_with_payroll}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, vacation_pay_with_payroll: checked === true })
            }
          />
          <Label htmlFor="company-vacation-with-payroll" className="leading-snug font-normal">
            Vacation paid with payroll (uncheck for deferred vacation pay / staff choose payout period)
          </Label>
        </div>

        <p className="m-0 text-sm text-muted-foreground sm:col-span-2">
          Separate YOS schedules for union and non-union staff. Each employee uses the schedule
          matching their <strong className="text-foreground">Union Member</strong> checkbox.
        </p>

        <div className="min-w-0 space-y-3 sm:col-span-2">
          <VacationTiersEditor formData={formData} setFormData={setFormData} />
        </div>

        <p className="m-0 text-xs text-muted-foreground sm:col-span-2">
          Max is exclusive. For CA 0–4 / 5–10 / 11–20 / 21+ years of service, use max values{' '}
          <strong className="text-foreground">5, 11, 21</strong> (not 4, 10, 20) so year 10 stays at 6% until the 11-year mark.
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>{isEditing ? 'Update' : 'Create'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default CompanyFormDialog;
