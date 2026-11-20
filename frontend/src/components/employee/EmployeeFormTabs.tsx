import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  EMPLOYEE_STATUSES,
  employeeToFormData,
  formatDate,
  type Employee,
  type EmployeeFormData,
} from './employeeTypes';

export type EmployeeFormMode = 'view' | 'edit' | 'create';

export interface VacationOpeningProps {
  year: number;
  amount: string;
  loaded: boolean;
  hasCompany: boolean;
  onYearChange: (year: number) => void;
  onAmountChange: (amount: string) => void;
}

interface EmployeeFormTabsProps {
  mode: EmployeeFormMode;
  /** Required in `view` mode; values are read from the employee. */
  employee?: Employee;
  /** Used in `edit` and `create` modes. */
  formData: EmployeeFormData;
  onChange: (patch: Partial<EmployeeFormData>) => void;
  /** Vacation % and opening balance (edit/view only). */
  vacationOpening?: VacationOpeningProps;
}

const TAB_ITEMS = [
  { value: 'personal', label: 'Personal' },
  { value: 'address', label: 'Address' },
  { value: 'employment', label: 'Employment' },
  { value: 'emergency', label: 'Emergency & Notes' },
] as const;

const gridClass = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3';
const fullRow = 'sm:col-span-2 xl:col-span-3';
const labelClass = 'text-xs font-medium text-muted-foreground';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  readOnly: boolean;
  onChange?: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  display?: string;
  className?: string;
  inputProps?: React.ComponentProps<typeof Input>;
}

const Field: React.FC<FieldProps> = ({
  id,
  label,
  value,
  readOnly,
  onChange,
  type = 'text',
  required,
  placeholder,
  hint,
  display,
  className,
  inputProps,
}) => (
  <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
    {readOnly ? (
      <>
        <span className={labelClass}>{label}</span>
        <p className="m-0 min-h-5 text-sm break-words text-foreground">
          {(display ?? value) || <span className="text-muted-foreground">—</span>}
        </p>
      </>
    ) : (
      <>
        <Label htmlFor={id} className={labelClass}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <Input
          id={id}
          type={type}
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          {...inputProps}
        />
      </>
    )}
    {hint && <p className="m-0 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

interface CheckFieldProps {
  id: string;
  label: string;
  checked: boolean;
  readOnly: boolean;
  onChange: (checked: boolean) => void;
  viewLabel?: string;
}

const CheckField: React.FC<CheckFieldProps> = ({ id, label, checked, readOnly, onChange, viewLabel }) =>
  readOnly ? (
    <Field id={id} label={viewLabel ?? label} value={checked ? 'Yes' : 'No'} readOnly />
  ) : (
    <div className="flex items-center gap-2 pt-5">
      <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
    </div>
  );

const SectionTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <h3 className={cn('m-0 text-sm font-semibold text-foreground', fullRow, className)}>{children}</h3>
);

const EmployeeFormTabs: React.FC<EmployeeFormTabsProps> = ({
  mode,
  employee,
  formData,
  onChange,
  vacationOpening,
}) => {
  const readOnly = mode === 'view';
  const isCreate = mode === 'create';
  const v: EmployeeFormData = readOnly && employee ? employeeToFormData(employee) : formData;
  const set = (key: keyof EmployeeFormData) => (value: string) =>
    onChange({ [key]: value } as Partial<EmployeeFormData>);
  const p = mode; // id prefix keeps ids unique when create dialog sits above the detail pane

  const vacationPercentView =
    employee && employee.vacation_percent !== null && employee.vacation_percent !== undefined
      ? `${employee.vacation_percent}%${employee.vacation_percent_override ? ' (override)' : ''}`
      : '';

  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList
        variant="line"
        className="group-data-[orientation=horizontal]/tabs:h-auto w-full flex-wrap justify-start gap-x-5 gap-y-0 rounded-none border-0 border-solid border-b border-border p-0"
      >
        {TAB_ITEMS.map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="h-auto flex-none rounded-none px-0.5 pt-1 pb-2.5 group-data-[orientation=horizontal]/tabs:after:bottom-[-1px] data-[state=active]:text-foreground"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="personal" className="pt-4">
        <div className={gridClass}>
          {isCreate && (
            <Field
              id={`${p}-employee-id`}
              label="Employee ID"
              value={v.employee_id}
              readOnly={false}
              onChange={set('employee_id')}
              placeholder="e.g., PR1, PR10, etc."
              hint="Optional - leave blank to auto-generate"
            />
          )}
          <Field
            id={`${p}-first-name`}
            label="First Name"
            value={v.first_name}
            readOnly={readOnly}
            onChange={set('first_name')}
            required={!readOnly}
          />
          <Field
            id={`${p}-last-name`}
            label="Last Name"
            value={v.last_name}
            readOnly={readOnly}
            onChange={set('last_name')}
            required={!readOnly}
          />
          <Field
            id={`${p}-other-name`}
            label="Other Name"
            value={v.other_name}
            readOnly={readOnly}
            onChange={set('other_name')}
          />
          <Field
            id={`${p}-email`}
            label="Email"
            type="email"
            value={v.email}
            readOnly={readOnly}
            onChange={set('email')}
          />
          <Field
            id={`${p}-phone`}
            label="Phone"
            value={v.phone}
            readOnly={readOnly}
            onChange={set('phone')}
          />
          <Field
            id={`${p}-dob`}
            label="Date of Birth"
            type="date"
            value={v.dob}
            display={formatDate(v.dob)}
            readOnly={readOnly}
            onChange={set('dob')}
          />
          <Field
            id={`${p}-sin`}
            label="SIN"
            value={v.sin}
            readOnly={readOnly}
            onChange={set('sin')}
          />
          <Field
            id={`${p}-license`}
            label="Driver's License"
            value={v.drivers_license}
            readOnly={readOnly}
            onChange={set('drivers_license')}
          />
          {readOnly ? (
            <Field id={`${p}-status`} label="Status" value={v.status} readOnly />
          ) : (
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor={`${p}-status`} className={labelClass}>
                Status
              </Label>
              <Select value={v.status} onValueChange={set('status')}>
                <SelectTrigger id={`${p}-status`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="address" className="pt-4">
        <div className={gridClass}>
          <SectionTitle>Address Information</SectionTitle>
          <Field
            id={`${p}-street`}
            label="Street Address"
            value={v.street}
            readOnly={readOnly}
            onChange={set('street')}
            className={fullRow}
          />
          <Field
            id={`${p}-city`}
            label="City"
            value={v.city}
            readOnly={readOnly}
            onChange={set('city')}
          />
          <Field
            id={`${p}-province`}
            label="Province"
            value={v.province}
            readOnly={readOnly}
            onChange={set('province')}
          />
          <Field
            id={`${p}-postal`}
            label="Postal Code"
            value={v.postal_code}
            readOnly={readOnly}
            onChange={set('postal_code')}
          />

          <SectionTitle className="mt-2">Mailing Address</SectionTitle>
          <div className={fullRow}>
            <CheckField
              id={`${p}-use-mailing`}
              label="Use separate mailing address"
              viewLabel="Use Separate Mailing Address"
              checked={v.use_mailing_address}
              readOnly={readOnly}
              onChange={(checked) => onChange({ use_mailing_address: checked })}
            />
          </div>
          {v.use_mailing_address && (
            <>
              <Field
                id={`${p}-mail-street`}
                label="Mailing Street Address"
                value={v.mailing_street}
                readOnly={readOnly}
                onChange={set('mailing_street')}
                className={fullRow}
              />
              <Field
                id={`${p}-mail-city`}
                label="Mailing City"
                value={v.mailing_city}
                readOnly={readOnly}
                onChange={set('mailing_city')}
              />
              <Field
                id={`${p}-mail-province`}
                label="Mailing Province"
                value={v.mailing_province}
                readOnly={readOnly}
                onChange={set('mailing_province')}
              />
              <Field
                id={`${p}-mail-postal`}
                label="Mailing Postal Code"
                value={v.mailing_postal_code}
                readOnly={readOnly}
                onChange={set('mailing_postal_code')}
              />
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="employment" className="pt-4">
        <div className={gridClass}>
          <SectionTitle>Employment Information</SectionTitle>
          <Field
            id={`${p}-hire-date`}
            label="Hire Date"
            type="date"
            value={v.hire_date}
            display={formatDate(v.hire_date)}
            readOnly={readOnly}
            onChange={set('hire_date')}
          />
          <Field
            id={`${p}-probation-end`}
            label="Probation End Date"
            type="date"
            value={v.probation_end_date}
            display={formatDate(v.probation_end_date)}
            readOnly={readOnly}
            onChange={set('probation_end_date')}
          />
          <Field
            id={`${p}-seniority`}
            label="Seniority Start Date"
            type="date"
            value={v.seniority_start_date}
            display={formatDate(v.seniority_start_date)}
            readOnly={readOnly}
            onChange={set('seniority_start_date')}
          />
          <CheckField
            id={`${p}-union`}
            label="Union Member"
            checked={v.union_member}
            readOnly={readOnly}
            onChange={(checked) => onChange({ union_member: checked })}
          />

          {!isCreate && (
            <>
              <Field
                id={`${p}-vacation-pct`}
                label="Vacation %"
                type="number"
                value={String(v.vacation_percent)}
                display={vacationPercentView}
                readOnly={readOnly}
                onChange={set('vacation_percent')}
                hint={
                  readOnly
                    ? undefined
                    : v.vacation_percent_override
                      ? 'Manual override'
                      : 'From company YOS tiers (union / non-union)'
                }
                inputProps={{
                  disabled: !v.vacation_percent_override,
                  min: 0,
                  step: 0.1,
                }}
              />
              {!readOnly && (
                <div className="flex items-center gap-2 pt-5">
                  <Checkbox
                    id={`${p}-vacation-override`}
                    checked={!!v.vacation_percent_override}
                    onCheckedChange={(c) => onChange({ vacation_percent_override: c === true })}
                  />
                  <Label htmlFor={`${p}-vacation-override`} className="text-sm font-normal">
                    Override vacation %
                  </Label>
                </div>
              )}

              {vacationOpening && (
                <>
                  <SectionTitle className="mt-2">
                    Vacation $ opening
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      Jan 1 brought-forward balance for leave report
                    </span>
                  </SectionTitle>
                  <Field
                    id={`${p}-opening-year`}
                    label="Opening Year"
                    type="number"
                    value={String(vacationOpening.year)}
                    readOnly={readOnly}
                    onChange={(val) => vacationOpening.onYearChange(Number(val))}
                  />
                  <Field
                    id={`${p}-opening-amount`}
                    label="Vacation $ Opening"
                    type="number"
                    value={vacationOpening.amount}
                    readOnly={readOnly}
                    onChange={vacationOpening.onAmountChange}
                    hint={
                      !vacationOpening.hasCompany
                        ? 'Needs company (set company filter or employment)'
                        : vacationOpening.loaded
                          ? 'Saved opening for this year'
                          : 'Not set yet — enter amount and Save'
                    }
                    inputProps={{
                      disabled: !vacationOpening.hasCompany,
                      step: 0.01,
                      min: 0,
                    }}
                  />
                </>
              )}
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="emergency" className="pt-4">
        <div className={gridClass}>
          <SectionTitle>Emergency Contact</SectionTitle>
          <Field
            id={`${p}-emergency-name`}
            label="Emergency Contact Name"
            value={v.emergency_contact_name}
            readOnly={readOnly}
            onChange={set('emergency_contact_name')}
          />
          <Field
            id={`${p}-emergency-phone`}
            label="Emergency Contact Phone"
            value={v.emergency_contact_phone}
            readOnly={readOnly}
            onChange={set('emergency_contact_phone')}
          />

          <SectionTitle className="mt-2">Additional Information</SectionTitle>
          <div className={cn('flex flex-col gap-1.5', fullRow)}>
            {readOnly ? (
              <>
                <span className={labelClass}>Remarks</span>
                <p className="m-0 text-sm whitespace-pre-wrap text-foreground">
                  {v.remarks || <span className="text-muted-foreground">—</span>}
                </p>
              </>
            ) : (
              <>
                <Label htmlFor={`${p}-remarks`} className={labelClass}>
                  Remarks
                </Label>
                <Textarea
                  id={`${p}-remarks`}
                  rows={3}
                  value={v.remarks}
                  onChange={(e) => onChange({ remarks: e.target.value })}
                />
              </>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default EmployeeFormTabs;
