import React from 'react';
import { CloudUpload, Download, Eye, FileSpreadsheet, Loader2, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface ImportEmployeesDialogProps {
  open: boolean;
  error: string;
  selectedFile: File | null;
  previewData: any;
  uploadResult: any;
  previewLoading: boolean;
  uploadLoading: boolean;
  onFileChange: (file: File | null) => void;
  onDownloadTemplate: () => void;
  onPreview: () => void;
  onUpload: () => void;
  onChooseDifferentFile: () => void;
  onClose: () => void;
}

const StepTitle: React.FC<{ step: number; title: string; children: React.ReactNode }> = ({
  step,
  title,
  children,
}) => (
  <div className="flex gap-3">
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {step}
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div>
        <h3 className="m-0 text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  </div>
);

const ImportEmployeesDialog: React.FC<ImportEmployeesDialogProps> = ({
  open,
  error,
  selectedFile,
  previewData,
  uploadResult,
  previewLoading,
  uploadLoading,
  onFileChange,
  onDownloadTemplate,
  onPreview,
  onUpload,
  onChooseDifferentFile,
  onClose,
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CloudUpload className="size-5 text-muted-foreground" aria-hidden="true" />
          Import Employees
        </DialogTitle>
        <DialogDescription>Upload Excel file to import employee data</DialogDescription>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {!previewData && !uploadResult && (
          <div className="flex flex-col gap-6">
            <StepTitle step={1} title="Download Template">
              <p className="m-0 text-sm text-muted-foreground">
                Download the Excel template to see the required format, then fill it with your
                employee data.
              </p>
              <Button variant="outline" size="sm" className="w-fit" onClick={onDownloadTemplate}>
                <Download />
                Download Template
              </Button>
            </StepTitle>

            <StepTitle step={2} title="Upload File">
              <p className="m-0 text-sm text-muted-foreground">
                Select your filled Excel file to preview the data before importing.
              </p>
              <Label htmlFor="employee-import-file" className="sr-only">
                Excel file
              </Label>
              <Input
                id="employee-import-file"
                type="file"
                accept=".xlsx,.xls"
                className="max-w-md cursor-pointer"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              />
              {selectedFile && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileSpreadsheet className="size-4" aria-hidden="true" />
                    {selectedFile.name}
                  </span>
                  <Button size="sm" onClick={onPreview} disabled={previewLoading}>
                    {previewLoading ? <Loader2 className="animate-spin" /> : <Eye />}
                    {previewLoading ? 'Previewing...' : 'Preview Upload'}
                  </Button>
                </div>
              )}
            </StepTitle>
          </div>
        )}

        {previewData && !uploadResult && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="m-0 mr-2 text-sm font-semibold">Preview Results</h3>
              <Badge variant="secondary">Total rows: {previewData.total_rows}</Badge>
              <Badge variant="secondary" className="bg-event-union/15 text-event-union">
                Valid: {previewData.valid_rows}
              </Badge>
              <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                Invalid: {previewData.invalid_rows}
              </Badge>
            </div>

            {previewData.rows && previewData.rows.length > 0 && (
              <div className="max-h-96 overflow-auto rounded-md border border-solid border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.rows.slice(0, 10).map((row: any) => (
                      <TableRow key={row.row_number}>
                        <TableCell>{row.row_number}</TableCell>
                        <TableCell>{row.employee_id}</TableCell>
                        <TableCell>{row.full_name}</TableCell>
                        <TableCell>{row.company_id}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'rounded-md text-[11px]',
                              row.will_import
                                ? 'bg-event-union/15 text-event-union'
                                : 'bg-destructive/10 text-destructive',
                            )}
                          >
                            {row.will_import ? 'Valid' : 'Invalid'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {row.error_message && (
                            <span className="text-xs text-destructive">{row.error_message}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewData.rows.length > 10 && (
                  <p className="m-0 px-2 py-2 text-xs text-muted-foreground">
                    Showing first 10 rows...
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={onUpload}
                disabled={uploadLoading || previewData.valid_rows === 0}
              >
                {uploadLoading ? <Loader2 className="animate-spin" /> : <CloudUpload />}
                {uploadLoading ? 'Uploading...' : `Import ${previewData.valid_rows} Employees`}
              </Button>
              <Button variant="outline" onClick={onChooseDifferentFile}>
                Upload Different File
              </Button>
            </div>
          </div>
        )}

        {uploadResult && (
          <div className="flex flex-col gap-4">
            <h3 className="m-0 text-sm font-semibold">Import Results</h3>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-event-union">
                Successfully imported: {uploadResult.success_count} employees
              </span>
              {uploadResult.error_count > 0 && (
                <span className="text-destructive">Errors: {uploadResult.error_count} employees</span>
              )}
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="flex max-h-48 flex-col gap-1 overflow-auto rounded-md border border-solid border-border p-3">
                <span className="text-xs font-medium">Error Details:</span>
                {uploadResult.errors.slice(0, 5).map((err: any, index: number) => (
                  <span key={index} className="text-xs text-destructive">
                    Row {err.row_number}: {err.error_message}
                  </span>
                ))}
                {uploadResult.errors.length > 5 && (
                  <span className="text-xs text-muted-foreground">
                    ... and {uploadResult.errors.length - 5} more errors
                  </span>
                )}
              </div>
            )}

            <Button className="w-fit" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default ImportEmployeesDialog;
