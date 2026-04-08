import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  PictureAsPdf as PdfIcon,
  OpenInNew as OpenInNewIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { expenseAPI } from '../../api/client';
import { ExpenseClaim, CreateClaimRequest, UpdateClaimRequest, ClaimValidationResult, EXPENSE_TYPES } from '../../types/expense';
import FileBrowser from './FileBrowser';

interface ClaimsTabProps {
  employeeId: string;
}

const ClaimsTab: React.FC<ClaimsTabProps> = ({ employeeId }) => {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ClaimValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [overrideApproval, setOverrideApproval] = useState(false);

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<CreateClaimRequest>({
    employee_id: employeeId,
    paid_date: new Date().toISOString().split('T')[0],
    expense_type: 'Gas',
    receipts_amount: 0,
    notes: '',
    supporting_document_path: '', // Legacy field
    document_path: '',
    document_filename: '',
  });

  // Load claims
  const loadClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseAPI.claims({ employee_id: employeeId, limit: 20 });
      if (response.data.success) {
        setClaims(response.data.data || []);
      } else {
        setError('Failed to load claims');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const validateClaim = async (data: CreateClaimRequest) => {
    setValidating(true);
    try {
      const response = await expenseAPI.validateClaim({
        employee_id: data.employee_id,
        expense_type: data.expense_type,
        receipts_amount: data.receipts_amount,
      });
      if (response.data.success) {
        setValidationResult(response.data.data);
      }
    } catch (err: any) {
      setValidationResult({
        valid: false,
        message: err.response?.data?.detail || 'Validation failed',
        claimable_amount: 0,
      });
    } finally {
      setValidating(false);
    }
  };

  const handleCreate = async () => {
    try {
      const claimData = {
        ...formData,
        override_approval: overrideApproval,
      };
      const response = await expenseAPI.createClaim(claimData);
      if (response.data.success) {
        setSuccess('Claim submitted successfully!');
        setFormOpen(false);
        resetForm();
        loadClaims();
      } else {
        setError('Failed to create claim');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create claim');
    }
  };

  const handleUpdate = async (claimId: string, updateData: UpdateClaimRequest) => {
    try {
      const response = await expenseAPI.updateClaim(claimId, updateData);
      if (response.data.success) {
        setSuccess('Claim updated successfully!');
        setEditingId(null);
        loadClaims();
      } else {
        setError('Failed to update claim');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update claim');
    }
  };

  const handleDelete = async () => {
    if (!claimToDelete) return;
    
    try {
      const response = await expenseAPI.deleteClaim(claimToDelete);
      if (response.data.success) {
        setSuccess('Claim deleted successfully!');
        setDeleteDialogOpen(false);
        setClaimToDelete(null);
        loadClaims();
      } else {
        setError('Failed to delete claim');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete claim');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: employeeId,
      paid_date: new Date().toISOString().split('T')[0],
      expense_type: 'Gas',
      receipts_amount: 0,
      notes: '',
      supporting_document_path: '', // Legacy field
      document_path: '',
      document_filename: '',
    });
    setValidationResult(null);
    setOverrideApproval(false);
  };

  const openDeleteDialog = (claimId: string) => {
    setClaimToDelete(claimId);
    setDeleteDialogOpen(true);
  };

  const getStatusIcon = (claim: ExpenseClaim) => {
    if (claim.receipts_amount === claim.claims_amount) {
      return <CheckCircleIcon color="success" />;
    } else if (claim.claims_amount < claim.receipts_amount) {
      return <WarningIcon color="warning" />;
    } else {
      return <ErrorIcon color="error" />;
    }
  };

  const getStatusText = (claim: ExpenseClaim) => {
    if (claim.receipts_amount === claim.claims_amount) {
      return '';
    } else if (claim.claims_amount < claim.receipts_amount) {
      return ' (capped)';
    } else {
      return ' (error)';
    }
  };

  const formatDate = (dateStr: string) => {
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const openPdfFile = async (filePath: string) => {
    try {
      // Use the backend API to open the file with os.startfile (like Streamlit does)
      const response = await expenseAPI.openFile(filePath);
      if (response.data.success) {
        // File opened successfully - no need to show any message
        return;
      }
    } catch (error: any) {
      // If the API call fails, provide helpful guidance
      const errorMessage = error.response?.data?.detail || 'Failed to open file';
      
      let helpMessage = '';
        if (errorMessage.includes('File not found') || errorMessage.includes('404')) {
          helpMessage = `The file cannot be found at:\n${filePath}\n\nThis usually means:\n• The file has been moved or deleted\n• The file path is incorrect\n• The file doesn't exist in the C:\\temp\\expenses\\ directory\n\nWould you like to copy the path to try opening it manually?`;
        } else {
          helpMessage = `Unable to open PDF directly.\n\nError: ${errorMessage}\n\nFile: ${filePath}\n\nWould you like to copy the path to clipboard instead?`;
        }
      
      if (window.confirm(helpMessage)) {
        try {
          await navigator.clipboard.writeText(filePath);
          alert('File path copied to clipboard!\n\nTo open the file:\n1. Open File Explorer\n2. Paste the path in the address bar (Ctrl+V)\n3. Press Enter\n\nMake sure the file exists in the C:\\temp\\expenses\\ directory.');
        } catch (clipboardError) {
          prompt('Copy this file path:', filePath);
        }
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getFileName = (filePath: string) => {
    return filePath.split('\\').pop() || filePath.split('/').pop() || filePath;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Expense Claims</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
        >
          Submit New Claim
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {claims.length === 0 ? (
        <Alert severity="info">
          No claims found for this employee.
        </Alert>
      ) : (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Recent Claims
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {claims.length} claim{claims.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          
          {claims.map((claim) => {
            const isExpanded = editingId === claim.id;
            return (
            <Accordion 
              key={claim.id} 
              sx={{ mb: 1 }} 
              expanded={isExpanded}
              onChange={(event, expanded) => {
                if (expanded) {
                  setEditingId(claim.id);
                } else {
                  setEditingId(null);
                }
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(claim)}
                    <Typography variant="h6">
                      {claim.expense_type} - {formatCurrency(claim.claims_amount)}{getStatusText(claim)} - {formatDate(claim.paid_date)}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(claim.id);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(claim.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Receipts Amount:</strong> {formatCurrency(claim.receipts_amount)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Claims Amount:</strong> {formatCurrency(claim.claims_amount)}
                    </Typography>
                    {claim.receipts_amount !== claim.claims_amount && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        ⚠️ Claim was capped at entitlement limit
                      </Alert>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Date:</strong> {formatDate(claim.paid_date)}
                    </Typography>
                    {claim.notes && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Notes:</strong> {claim.notes}
                      </Typography>
                    )}
                    {(claim.document_path && claim.document_filename) || claim.supporting_document_path ? (
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <PdfIcon color="error" fontSize="small" />
                        <Box display="flex" alignItems="center" gap={1} flex={1}>
                          <Typography 
                            variant="body2" 
                            color="primary" 
                            sx={{ 
                              cursor: 'pointer', 
                              textDecoration: 'underline',
                              wordBreak: 'break-all',
                              flex: 1,
                              fontFamily: 'monospace'
                            }}
                            onClick={() => openPdfFile(
                              claim.document_path && claim.document_filename 
                                ? `${claim.document_path}${claim.document_filename}`
                                : claim.supporting_document_path!
                            )}
                            title="Click to open PDF in default viewer"
                          >
                            {claim.document_path && claim.document_filename 
                              ? `${claim.document_path}${claim.document_filename}`
                              : claim.supporting_document_path}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => openPdfFile(
                              claim.document_path && claim.document_filename 
                                ? `${claim.document_path}${claim.document_filename}`
                                : claim.supporting_document_path!
                            )}
                            title="Open PDF in default viewer"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          (Click to open)
                        </Typography>
                      </Box>
                    ) : null}
                  </Grid>
                </Grid>

                {editingId === claim.id && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Edit Claim
                    </Typography>
                    <ClaimForm
                      claim={claim}
                      onSave={(data) => {
                        handleUpdate(claim.id, data);
                      }}
                      onCancel={() => {
                        setEditingId(null);
                      }}
                    />
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
            );
          })}
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={formOpen} 
        onClose={() => {
          setFormOpen(false);
          setOverrideApproval(false);
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Submit New Claim</DialogTitle>
        <DialogContent>
          <ClaimForm
            formData={formData}
            onFormDataChange={setFormData}
            onValidate={validateClaim}
            onSave={handleCreate}
            onCancel={() => {
              setFormOpen(false);
              setOverrideApproval(false);
            }}
            validationResult={validationResult}
            validating={validating}
            previousClaims={claims}
            overrideApproval={overrideApproval}
            onOverrideApprovalChange={setOverrideApproval}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Claim</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this claim? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

interface ClaimFormProps {
  claim?: ExpenseClaim;
  formData?: CreateClaimRequest;
  onFormDataChange?: (data: CreateClaimRequest) => void;
  onValidate?: (data: CreateClaimRequest) => void;
  onSave: (data: CreateClaimRequest | UpdateClaimRequest) => void;
  onCancel: () => void;
  validationResult?: ClaimValidationResult | null;
  validating?: boolean;
  previousClaims?: ExpenseClaim[];
  overrideApproval?: boolean;
  onOverrideApprovalChange?: (value: boolean) => void;
}

const ClaimForm: React.FC<ClaimFormProps> = ({
  claim,
  formData: propFormData,
  onFormDataChange,
  onValidate,
  onSave,
  onCancel,
  validationResult,
  validating,
  previousClaims = [],
  overrideApproval = false,
  onOverrideApprovalChange,
}) => {
  const [formData, setFormData] = useState<CreateClaimRequest>(
    propFormData || {
      employee_id: '',
      paid_date: new Date().toISOString().split('T')[0],
      expense_type: 'Gas',
      receipts_amount: 0,
      notes: '',
      supporting_document_path: '',
      document_path: '',
      document_filename: '',
    }
  );

  useEffect(() => {
    if (claim) {
      setFormData({
        employee_id: claim.employee_id,
        paid_date: claim.paid_date,
        expense_type: claim.expense_type,
        receipts_amount: claim.receipts_amount,
        notes: claim.notes || '',
        supporting_document_path: claim.supporting_document_path || '', // Legacy field
        document_path: claim.document_path || '',
        document_filename: claim.document_filename || '',
      });
    }
  }, [claim]);

  // Reset override approval when validation result changes or when receipts amount changes
  useEffect(() => {
    if (onOverrideApprovalChange && !claim) {
      // Reset if validation result changes or if claimable amount is no longer less than receipts
      if (validationResult && validationResult.claimable_amount >= formData.receipts_amount) {
        onOverrideApprovalChange(false);
      }
    }
  }, [validationResult, formData.receipts_amount, formData.expense_type, claim, onOverrideApprovalChange]);

  const handleChange = (field: keyof CreateClaimRequest, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    if (onFormDataChange) {
      onFormDataChange(newData);
    }
    
    // Auto-validate when amount or type changes
    if ((field === 'receipts_amount' || field === 'expense_type') && onValidate) {
      setTimeout(() => onValidate(newData), 500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Find the most recent claim with document information
  const findMostRecentClaimWithDocument = (): ExpenseClaim | null => {
    if (!previousClaims || previousClaims.length === 0) {
      return null;
    }

    // Claims are already sorted by paid_date desc, so first one with document info is most recent
    for (const prevClaim of previousClaims) {
      // Check if claim has document_path and document_filename (non-empty strings)
      if (prevClaim.document_path && prevClaim.document_path.trim() && 
          prevClaim.document_filename && prevClaim.document_filename.trim()) {
        return prevClaim;
      }
      // Check legacy field (non-empty string)
      if (prevClaim.supporting_document_path && prevClaim.supporting_document_path.trim()) {
        return prevClaim;
      }
    }
    return null;
  };

  const handleCopyFromLastClaim = () => {
    const lastClaim = findMostRecentClaimWithDocument();
    if (!lastClaim) {
      return;
    }

    let newDocumentPath = '';
    let newDocumentFilename = '';

    // If new format fields exist, use them
    if (lastClaim.document_path && lastClaim.document_filename) {
      newDocumentPath = lastClaim.document_path;
      newDocumentFilename = lastClaim.document_filename;
    } 
    // Otherwise, parse from legacy field
    else if (lastClaim.supporting_document_path) {
      const lastSlash = lastClaim.supporting_document_path.lastIndexOf('\\');
      if (lastSlash !== -1) {
        newDocumentPath = lastClaim.supporting_document_path.substring(0, lastSlash + 1);
        newDocumentFilename = lastClaim.supporting_document_path.substring(lastSlash + 1);
      } else {
        // If no backslash found, treat entire string as filename
        newDocumentFilename = lastClaim.supporting_document_path;
      }
    }

    // Update form data
    const newData = {
      ...formData,
      document_path: newDocumentPath,
      document_filename: newDocumentFilename,
      supporting_document_path: '', // Clear legacy field
    };
    setFormData(newData);
    if (onFormDataChange) {
      onFormDataChange(newData);
    }
  };

  const mostRecentClaimWithDocument = findMostRecentClaimWithDocument();
  const canCopyFromLastClaim = !claim && mostRecentClaimWithDocument !== null;

  // Debug logging (can be removed later)
  React.useEffect(() => {
    if (!claim) {
      console.log('=== ClaimForm Debug ===');
      console.log('Creating new claim (not editing)');
      console.log('Previous claims count:', previousClaims?.length || 0);
      if (previousClaims && previousClaims.length > 0) {
        console.log('First claim:', previousClaims[0]);
        console.log('First claim document_path:', previousClaims[0].document_path);
        console.log('First claim document_filename:', previousClaims[0].document_filename);
        console.log('First claim supporting_document_path:', previousClaims[0].supporting_document_path);
      }
      console.log('Most recent claim with document:', mostRecentClaimWithDocument);
      console.log('Can copy from last claim:', canCopyFromLastClaim);
      console.log('======================');
    }
  }, [claim, previousClaims, mostRecentClaimWithDocument, canCopyFromLastClaim]);

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Paid Date"
            type="date"
            value={formData.paid_date}
            onChange={(e) => handleChange('paid_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Expense Type</InputLabel>
            <Select
              value={formData.expense_type}
              onChange={(e) => handleChange('expense_type', e.target.value)}
              label="Expense Type"
            >
              {EXPENSE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Receipts Amount"
            type="number"
            value={formData.receipts_amount}
            onChange={(e) => handleChange('receipts_amount', parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} mb={1}>
            <Typography variant="body2">
              Supporting Document (PDF)
            </Typography>
            {canCopyFromLastClaim ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyFromLastClaim}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Copy from Last Claim
              </Button>
            ) : (
              // Debug: Show why button is not visible (remove this after debugging)
              previousClaims && previousClaims.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  (No document in last claim)
                </Typography>
              )
            )}
          </Box>
          <FileBrowser
            key={`${formData.document_path}-${formData.document_filename}-${formData.supporting_document_path}`}
            value={(() => {
              // Use the new fields if they exist, otherwise fall back to legacy field
              let combinedPath = '';
              if (formData.document_path && formData.document_filename) {
                // Ensure path ends with backslash
                const normalizedPath = formData.document_path.endsWith('\\') ? formData.document_path : formData.document_path + '\\';
                combinedPath = normalizedPath + formData.document_filename;
              } else if (formData.supporting_document_path) {
                combinedPath = formData.supporting_document_path;
              }
              return combinedPath;
            })()}
            onChange={(filePath) => {
              // Parse the combined path into separate fields
              const lastSlash = filePath.lastIndexOf('\\');
              if (lastSlash !== -1) {
                const path = filePath.substring(0, lastSlash + 1);
                const filename = filePath.substring(lastSlash + 1);
                
                // Update both fields in a single state update to avoid race conditions
                const newData = { 
                  ...formData, 
                  document_path: path,
                  document_filename: filename,
                  supporting_document_path: '' // Clear legacy field
                };
                setFormData(newData);
                
                if (onFormDataChange) {
                  onFormDataChange(newData);
                }
              } else {
                // Fallback to legacy field
                handleChange('supporting_document_path', filePath);
              }
            }}
            onClear={() => {
              const newData = { 
                ...formData, 
                document_path: '',
                document_filename: '',
                supporting_document_path: ''
              };
              setFormData(newData);
              if (onFormDataChange) {
                onFormDataChange(newData);
              }
            }}
            label="Supporting Document (PDF)"
          />
        </Grid>
      </Grid>

      {/* Validation Result */}
      {validating && (
        <Box display="flex" alignItems="center" gap={1} mt={2}>
          <CircularProgress size={20} />
          <Typography variant="body2">Validating claim...</Typography>
        </Box>
      )}

      {validationResult && !validating && (
        <Box mt={2}>
          {validationResult.valid ? (
            <Alert severity={overrideApproval ? "info" : "success"}>
              {overrideApproval ? (
                <>
                  <strong>Override Approval Active</strong>
                  <br />
                  Claimable Amount (capped): ${validationResult.claimable_amount.toFixed(2)}
                  <br />
                  <strong>Approved Amount: ${formData.receipts_amount.toFixed(2)}</strong>
                </>
              ) : (
                <>
                  {validationResult.message}
                  <br />
                  <strong>Claimable Amount: ${validationResult.claimable_amount.toFixed(2)}</strong>
                  {validationResult.claimable_amount < formData.receipts_amount && (
                    <>
                      <br />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Receipts Amount: ${formData.receipts_amount.toFixed(2)}
                      </Typography>
                    </>
                  )}
                </>
              )}
            </Alert>
          ) : (
            <Alert severity="error">
              {validationResult.message}
            </Alert>
          )}
        </Box>
      )}

      <Box display="flex" justifyContent="flex-end" gap={1} mt={3}>
        <Button onClick={onCancel} startIcon={<CancelIcon />}>
          Cancel
        </Button>
        {!claim && validationResult?.valid && validationResult.claimable_amount < formData.receipts_amount && (
          <Button
            variant={overrideApproval ? "contained" : "outlined"}
            color={overrideApproval ? "success" : "primary"}
            onClick={() => {
              if (onOverrideApprovalChange) {
                onOverrideApprovalChange(!overrideApproval);
              }
            }}
            startIcon={overrideApproval ? <CheckCircleIcon /> : <SaveIcon />}
          >
            {overrideApproval ? 'Approved Full Amount' : 'Approve Full Amount'}
          </Button>
        )}
        <Button 
          type="submit" 
          variant="contained" 
          startIcon={<SaveIcon />}
          disabled={!validationResult?.valid && !claim}
        >
          {claim ? 'Update' : 'Submit Claim'}
        </Button>
      </Box>
    </form>
  );
};

export default ClaimsTab;
