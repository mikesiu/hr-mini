import React, { useRef } from 'react';
import { Download, Eye, Loader2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { LeaveUploadPreviewResponse, LeaveUploadResponse } from './leaveTypes';

interface LeaveUploadDialogProps {
  open: boolean;
  selectedFile: File | null;
  previewData: LeaveUploadPreviewResponse | null;
  uploadResult: LeaveUploadResponse | null;
  previewLoading: boolean;
  uploadLoading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  onPreview: () => void;
  onImport: () => void;
  onClose: () => void;
}

const headClass =
  'sticky top-0 z-10 h-9 bg-muted px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase';

const LeaveUploadDialog: React.FC<LeaveUploadDialogProps> = ({
  open,
  selectedFile,
  previewData,
  uploadResult,
  previewLoading,
  uploadLoading,
  onFileSelect,
  onDownloadTemplate,
  onPreview,
  onImport,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = uploadLoading || previewLoading;

  const resultTiles = uploadResult
    ? [
        { label: 'Successfully Imported', value: uploadResult.success_count, tint: 'bg-event-union/15 text-event-union' },
        { label: 'Skipped', value: uploadResult.skipped_count, tint: 'bg-event-cra/15 text-event-cra' },
        { label: 'Errors', value: uploadResult.error_count, tint: 'bg-destructive/10 text-destructive' },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upload Leave Data</DialogTitle>
          <DialogDescription>
            Choose an Excel file, preview the rows, then import the valid ones.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-0.5 pr-1">
          {/* File selection */}
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-sm font-semibold text-foreground">Select Excel File</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button variant="outline" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                <Upload />
                Choose File
              </Button>
              {selectedFile && (
                <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
              )}
              <Button variant="outline" onClick={onDownloadTemplate} disabled={busy}>
                <Download />
                Download Template
              </Button>
            </div>
          </div>

          {/* Preview */}
          {selectedFile && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onPreview} disabled={!selectedFile || previewLoading || uploadLoading}>
                  {previewLoading ? <Loader2 className="animate-spin" /> : <Eye />}
                  Preview
                </Button>
                {previewData && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {previewData.valid_rows} valid, {previewData.invalid_rows} invalid,{' '}
                    {previewData.duplicate_rows} duplicates
                  </span>
                )}
              </div>

              {previewData && (
                <div className="flex flex-col gap-2">
                  <h3 className="m-0 text-sm font-semibold text-foreground">Preview Results</h3>
                  <div className="overflow-hidden rounded-lg border border-solid border-border">
                    <Table containerClassName="max-h-72 overflow-y-auto">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          {['Row', 'Employee ID', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Will Import', 'Error'].map(
                            (h) => (
                              <TableHead key={h} className={headClass}>
                                {h}
                              </TableHead>
                            ),
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.rows.map((row) => (
                          <TableRow key={row.row_number}>
                            <TableCell className="px-3 text-sm tabular-nums">{row.row_number}</TableCell>
                            <TableCell className="px-3 text-sm">{row.employee_id}</TableCell>
                            <TableCell className="px-3 text-sm">{row.leave_type_id}</TableCell>
                            <TableCell className="px-3 text-sm tabular-nums">{row.start_date}</TableCell>
                            <TableCell className="px-3 text-sm tabular-nums">{row.end_date}</TableCell>
                            <TableCell className="px-3 text-sm tabular-nums">{row.days}</TableCell>
                            <TableCell className="px-3 text-sm">{row.status}</TableCell>
                            <TableCell className="px-3">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'rounded-md px-1.5 text-[11px] font-medium',
                                  row.will_import
                                    ? 'bg-event-union/15 text-event-union'
                                    : 'bg-destructive/10 text-destructive',
                                )}
                              >
                                {row.will_import ? 'Yes' : 'No'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-3 text-xs text-destructive">
                              {row.error_message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload results */}
          {uploadResult && (
            <div className="flex flex-col gap-3">
              <h3 className="m-0 text-sm font-semibold text-foreground">Upload Results</h3>
              <div className="grid grid-cols-3 gap-3">
                {resultTiles.map((tile) => (
                  <div
                    key={tile.label}
                    className={cn('flex flex-col items-center rounded-lg px-3 py-3 text-center', tile.tint)}
                  >
                    <span className="text-2xl font-semibold tabular-nums">{tile.value}</span>
                    <span className="text-xs">{tile.label}</span>
                  </div>
                ))}
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="m-0 text-sm font-semibold text-foreground">Error Details</h3>
                  <div className="overflow-hidden rounded-lg border border-solid border-border">
                    <Table containerClassName="max-h-52 overflow-y-auto">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className={headClass}>Row</TableHead>
                          <TableHead className={headClass}>Error Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadResult.errors.map((err, index) => (
                          <TableRow key={index}>
                            <TableCell className="px-3 text-sm tabular-nums">{err.row_number}</TableCell>
                            <TableCell className="px-3 text-xs text-destructive">
                              {err.error_message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {uploadResult ? 'Close' : 'Cancel'}
          </Button>
          {previewData && !uploadResult && (
            <Button onClick={onImport} disabled={uploadLoading || previewData.valid_rows === 0}>
              {uploadLoading && <Loader2 className="animate-spin" />}
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveUploadDialog;
