import React from 'react';
import { Building2, Pencil, Save, Trash2, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import EmployeeFormTabs, { type VacationOpeningProps } from './EmployeeFormTabs';
import StatusBadge from './StatusBadge';
import { getInitials, type Employee, type EmployeeFormData } from './employeeTypes';

interface EmployeeDetailPanelProps {
  employee: Employee;
  isEditing: boolean;
  formData: EmployeeFormData;
  onFormChange: (patch: Partial<EmployeeFormData>) => void;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  vacationOpening: VacationOpeningProps;
}

const EmployeeDetailPanel: React.FC<EmployeeDetailPanelProps> = ({
  employee,
  isEditing,
  formData,
  onFormChange,
  canUpdate,
  canDelete,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  vacationOpening,
}) => (
  <Card className="gap-0 py-0">
    <CardHeader className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-12">
          <AvatarFallback className="bg-primary text-base font-semibold text-primary-foreground">
            {getInitials(employee.first_name, employee.last_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="m-0 truncate text-lg leading-tight font-semibold text-foreground">
            {employee.full_name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>Employee ID: {employee.id}</span>
            {employee.company_short_form && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3.5" aria-hidden="true" />
                {employee.company_short_form}
              </span>
            )}
            <StatusBadge status={employee.status} />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={onCancel}>
              <X />
              Cancel
            </Button>
            <Button onClick={onSave}>
              <Save />
              Save
            </Button>
          </>
        ) : (
          <>
            {canUpdate && (
              <Button variant="outline" onClick={onEdit}>
                <Pencil />
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 />
                Delete
              </Button>
            )}
          </>
        )}
      </div>
    </CardHeader>

    <Separator />

    <CardContent className="px-6 py-5">
      <EmployeeFormTabs
        key={employee.id}
        mode={isEditing ? 'edit' : 'view'}
        employee={employee}
        formData={formData}
        onChange={onFormChange}
        vacationOpening={vacationOpening}
      />
    </CardContent>
  </Card>
);

export default EmployeeDetailPanel;
