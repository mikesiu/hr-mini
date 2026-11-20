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
import EmployeeFormTabs from './EmployeeFormTabs';
import type { EmployeeFormData } from './employeeTypes';

interface CreateEmployeeDialogProps {
  open: boolean;
  formData: EmployeeFormData;
  error: string;
  onChange: (patch: Partial<EmployeeFormData>) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
}

const CreateEmployeeDialog: React.FC<CreateEmployeeDialogProps> = ({
  open,
  formData,
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
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Employee</DialogTitle>
          <DialogDescription>
            First and last name are required. Other fields can be filled in later.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <EmployeeFormTabs mode="create" formData={formData} onChange={onChange} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            Create Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEmployeeDialog;
