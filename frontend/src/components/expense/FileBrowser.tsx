import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  FolderOpen as FolderOpenIcon,
  AttachFile as AttachFileIcon,
  OpenInNew as OpenInNewIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import { expenseAPI } from '../../api/client';

interface FileBrowserProps {
  value?: string; // Combined path (e.g., C:\path\to\file.pdf)
  onChange: (filePath: string) => void;
  onClear: () => void;
  label?: string;
  disabled?: boolean;
}

const FileBrowser: React.FC<FileBrowserProps> = ({
  value,
  onChange,
  onClear,
  label = "Supporting Document",
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentPath, setDocumentPath] = useState<string>('');
  const [documentFilename, setDocumentFilename] = useState<string>('');

  // Parse the current value into path and filename
  React.useEffect(() => {
    if (value) {
      const lastSlash = value.lastIndexOf('\\');
      if (lastSlash !== -1) {
        const path = value.substring(0, lastSlash + 1);
        const filename = value.substring(lastSlash + 1);
        setDocumentPath(path);
        setDocumentFilename(filename);
      } else {
        setDocumentPath('');
        setDocumentFilename(value);
      }
    } else {
      setDocumentPath('');
      setDocumentFilename('');
    }
  }, [value]);

  // Function to update the combined path with manual button click
  const handleUpdatePath = () => {
    if (documentPath && documentFilename) {
      const normalizedPath = documentPath.endsWith('\\') ? documentPath : documentPath + '\\';
      const fullPath = normalizedPath + documentFilename;
      onChange(fullPath);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes('pdf')) {
        setError('Please select a PDF file');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setError(null);
      setDocumentFilename(file.name);
      // Auto-update when file is selected
      handleUpdatePath();
    }
  };

  const handleOpenFile = async () => {
    if (!value) return;
    
    try {
      const response = await expenseAPI.openFile(value);
      if (response.data.success) {
        return;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to open file';
      
      let helpMessage = '';
      if (errorMessage.includes('File not found') || errorMessage.includes('404')) {
        helpMessage = `The file cannot be found at:\n${value}\n\nThis usually means:\n• The file has been moved or deleted\n• The file path is incorrect\n• The file doesn't exist\n\nWould you like to copy the path to try opening it manually?`;
      } else {
        helpMessage = `Unable to open PDF directly.\n\nError: ${errorMessage}\n\nFile: ${value}\n\nWould you like to copy the path to clipboard instead?`;
      }
      
      if (window.confirm(helpMessage)) {
        try {
          await navigator.clipboard.writeText(value);
          alert('File path copied to clipboard!\n\nTo open the file:\n1. Open File Explorer\n2. Paste the path in the address bar (Ctrl+V)\n3. Press Enter');
        } catch (clipboardError) {
          prompt('Copy this file path:', value);
        }
      }
    }
  };

  return (
    <Box>
      {/* Document Path Input */}
      <Box mb={2}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Document Path (Directory):
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <TextField
            fullWidth
            value={documentPath}
            placeholder="Enter directory path (e.g., G:\\Shared drives\\4.HR & Payroll\\TimeCard 2025May30\\RPPC\\Reimbursement)"
            onChange={(e) => setDocumentPath(e.target.value)}
            disabled={disabled}
            size="small"
            InputProps={{
              startAdornment: <AttachFileIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>
      </Box>

      {/* Filename Input */}
      <Box mb={2}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Filename:
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <TextField
            fullWidth
            value={documentFilename}
            placeholder="Enter filename (e.g., CLM001.pdf)"
            onChange={(e) => setDocumentFilename(e.target.value)}
            disabled={disabled}
            size="small"
            InputProps={{
              startAdornment: <AttachFileIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={handleBrowseClick}
            disabled={disabled}
            size="small"
          >
            Browse
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setDocumentPath('');
              setDocumentFilename('');
              onChange('');
            }}
            disabled={disabled}
            size="small"
            sx={{ ml: 1 }}
          >
            Clear
          </Button>
        </Box>
      </Box>

      {/* Update Button */}
      <Box mb={2}>
        <Button
          variant="contained"
          startIcon={<UpdateIcon />}
          onClick={handleUpdatePath}
          disabled={disabled || !documentPath || !documentFilename}
          size="small"
        >
          Update Full Path
        </Button>
      </Box>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept="application/pdf"
      />

      {/* Full Path Display */}
      {value && (
        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <AttachFileIcon color="primary" fontSize="small" />
              <Typography variant="body2" color="text.primary" sx={{ wordBreak: 'break-all' }}>
                <strong>Full Path:</strong>{' '}
                <Typography 
                  component="span" 
                  color="primary" 
                  sx={{ 
                    cursor: 'pointer', 
                    textDecoration: 'underline',
                    fontFamily: 'monospace'
                  }}
                  onClick={handleOpenFile}
                  title="Click to open PDF in default viewer"
                >
                  {value}
                </Typography>
              </Typography>
            </Box>
            <Tooltip title="Open PDF in default viewer">
              <IconButton
                size="small"
                onClick={handleOpenFile}
                color="primary"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        <strong>Instructions:</strong><br/>
        1. Enter the directory path where your PDF files are stored<br/>
        2. Either type the filename or click "Browse" to select a file<br/>
        3. Click "Update Full Path" to combine the path and filename<br/>
        4. Click the file path or the open icon to view the PDF
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default FileBrowser;