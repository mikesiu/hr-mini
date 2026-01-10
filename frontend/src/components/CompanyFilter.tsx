import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Business as BusinessIcon } from '@mui/icons-material';
import { useCompanyFilter } from '../contexts/CompanyFilterContext';

interface CompanyFilterProps {
  value?: string | null;
  onChange: (companyId: string | null) => void;
  showAllOption?: boolean;
  label?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

const CompanyFilter: React.FC<CompanyFilterProps> = ({
  value,
  onChange,
  showAllOption = true,
  label = 'Filter by Company',
  disabled = false,
  size = 'medium',
}) => {
  // Use companies from the global context instead of fetching them again
  const { companies, loading } = useCompanyFilter();

  const handleChange = (event: any) => {
    const selectedValue = event.target.value;
    onChange(selectedValue === 'all' ? null : selectedValue);
  };


  const getSelectedCompany = () => {
    if (!value) return null;
    return companies.find(company => company.id === value);
  };

  const selectedCompany = getSelectedCompany();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading companies...</Typography>
      </Box>
    );
  }

  return (
    <FormControl fullWidth size={size} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value || 'all'}
        onChange={handleChange}
        label={label}
        startAdornment={
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
            <BusinessIcon fontSize="small" color="action" />
          </Box>
        }
      >
        {showAllOption && (
          <MenuItem value="all">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                All Companies
              </Typography>
            </Box>
          </MenuItem>
        )}
        {companies.map((company) => (
          <MenuItem key={company.id} value={company.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Chip
                label={company.id}
                size="small"
                color="primary"
                icon={<BusinessIcon />}
              />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {company.legal_name}
                {company.trade_name && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    - {company.trade_name}
                  </Typography>
                )}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
      {selectedCompany && (
        <Box sx={{ mt: 1 }}>
          <Chip
            label={`Selected: ${selectedCompany.legal_name}`}
            color="primary"
            variant="outlined"
            size="small"
            icon={<BusinessIcon />}
          />
        </Box>
      )}
    </FormControl>
  );
};

export default CompanyFilter;
