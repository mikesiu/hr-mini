import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { ReportFilter, ReportFilters as FilterValues } from '../../types/reports';
import { useCompanyFilter } from '../../contexts/CompanyFilterContext';
import { reportsAPI } from '../../api/client';
import { 
  validateFilters, 
  isFilterApplicable,
  FilterValidationResult 
} from '../../utils/filterValidation';
import {
  validateSortGroupFields,
  getAvailableSortFields,
  getAvailableGroupFields,
  getFieldDisplayName,
  getFieldDescription,
  SortGroupValidationResult
} from '../../utils/sortGroupValidation';

interface ReportFiltersProps {
  reportType: string;
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  loading?: boolean;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  reportType,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  loading = false,
}) => {
  // Use companies from the global context instead of fetching them again
  const { selectedCompanyId, companies } = useCompanyFilter();
  
  const [filterOptions, setFilterOptions] = useState<{ common_filters: ReportFilter[]; specific_filters: ReportFilter[] } | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    common: true,
    specific: false,
    sortGroup: false,
  });
  const [validationResult, setValidationResult] = useState<FilterValidationResult | null>(null);
  const [sortGroupValidation, setSortGroupValidation] = useState<SortGroupValidationResult | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Load filter options when report type changes
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await reportsAPI.getFilters(reportType);
        if (response.data.success) {
          setFilterOptions(response.data.data);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    if (reportType) {
      loadFilterOptions();
      
      // Validate existing filters for the new report type
      const validation = validateFilters(filters, reportType);
      setValidationResult(validation);
      
      // Validate sort/group fields for the new report type
      const sortGroupValidation = validateSortGroupFields(
        filters.sort_by,
        filters.group_by,
        filters.group_by_secondary,
        reportType
      );
      setSortGroupValidation(sortGroupValidation);
      
      setShowValidationErrors(!validation.isValid || !sortGroupValidation.isValid);
    }
  }, [reportType, filters]);

  // Set company filter from global context
  useEffect(() => {
    if (selectedCompanyId && selectedCompanyId !== filters.company_id) {
      onFiltersChange({ ...filters, company_id: selectedCompanyId });
    }
  }, [selectedCompanyId, filters, onFiltersChange]);

  const handleFilterChange = (name: string, value: any) => {
    const newFilters = { ...filters, [name]: value };
    onFiltersChange(newFilters);
    
    // Validate filters in real-time
    const validation = validateFilters(newFilters, reportType);
    setValidationResult(validation);
    
    // Validate sort/group fields if they changed
    if (['sort_by', 'group_by', 'group_by_secondary'].includes(name)) {
      const sortGroupValidation = validateSortGroupFields(
        newFilters.sort_by,
        newFilters.group_by,
        newFilters.group_by_secondary,
        reportType
      );
      setSortGroupValidation(sortGroupValidation);
    }
    
    // Show validation errors if there are any
    if (!validation.isValid || (sortGroupValidation && !sortGroupValidation.isValid)) {
      setShowValidationErrors(true);
    }
  };

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderFilterField = (filter: ReportFilter) => {
    const value = filters[filter.name as keyof FilterValues];
    const isApplicable = isFilterApplicable(filter.name, reportType);
    const hasWarning = validationResult?.warnings.some(w => w.includes(filter.label)) || false;

    // Don't render filters that are not applicable to this report type
    if (!isApplicable) {
      return null;
    }

    const fieldProps = {
      fullWidth: true,
      size: 'small' as const,
      error: hasWarning,
      helperText: hasWarning ? validationResult?.warnings.find(w => w.includes(filter.label)) : undefined,
    };

    switch (filter.type) {
      case 'text':
        return (
          <TextField
            {...fieldProps}
            label={filter.label}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
            placeholder={filter.description}
          />
        );

      case 'select':
        if (filter.name === 'company_id') {
          return (
            <FormControl fullWidth size="small" error={hasWarning}>
              <InputLabel>{filter.label}</InputLabel>
              <Select
                value={value || ''}
                onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                label={filter.label}
              >
                <MenuItem value="">
                  <em>All Companies</em>
                </MenuItem>
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.legal_name}
                    {company.trade_name && ` (${company.trade_name})`}
                  </MenuItem>
                ))}
              </Select>
              {hasWarning && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {validationResult?.warnings.find(w => w.includes(filter.label))}
                </Typography>
              )}
            </FormControl>
          );
        }

        return (
          <FormControl fullWidth size="small" error={hasWarning}>
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => handleFilterChange(filter.name, e.target.value)}
              label={filter.label}
            >
              {filter.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {hasWarning && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                {validationResult?.warnings.find(w => w.includes(filter.label))}
              </Typography>
            )}
          </FormControl>
        );

      case 'date':
        return (
          <TextField
            {...fieldProps}
            type="date"
            label={filter.label}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        );

      case 'number':
        return (
          <TextField
            {...fieldProps}
            type="number"
            label={filter.label}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.name, parseFloat(e.target.value) || undefined)}
            placeholder={filter.description}
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleFilterChange(filter.name, e.target.checked)}
              />
            }
            label={filter.label}
          />
        );

      default:
        return null;
    }
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== '' && value !== null
    ).length;
  };

  const handleApplyFilters = () => {
    // Validate filters before applying
    const validation = validateFilters(filters, reportType);
    setValidationResult(validation);
    
    // Validate sort/group fields
    const sortGroupValidation = validateSortGroupFields(
      filters.sort_by,
      filters.group_by,
      filters.group_by_secondary,
      reportType
    );
    setSortGroupValidation(sortGroupValidation);
    
    if (!validation.isValid || !sortGroupValidation.isValid) {
      setShowValidationErrors(true);
      return;
    }
    
    setShowValidationErrors(false);
    onApplyFilters();
  };

  const handleClearFilters = () => {
    onClearFilters();
    setValidationResult(null);
    setSortGroupValidation(null);
    setShowValidationErrors(false);
  };

  if (!filterOptions) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading filter options...</Typography>
      </Box>
    );
  }


  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <FilterIcon sx={{ mr: 1 }} />
        <Typography variant="h6">
          Report Filters
        </Typography>
        {getActiveFiltersCount() > 0 && (
          <Chip
            label={`${getActiveFiltersCount()} active`}
            size="small"
            color="primary"
            sx={{ ml: 2 }}
          />
        )}
        {validationResult && !validationResult.isValid && (
          <Chip
            label={`${validationResult.errors.length} error${validationResult.errors.length !== 1 ? 's' : ''}`}
            size="small"
            color="error"
            sx={{ ml: 1 }}
          />
        )}
        {validationResult && validationResult.warnings.length > 0 && (
          <Chip
            label={`${validationResult.warnings.length} warning${validationResult.warnings.length !== 1 ? 's' : ''}`}
            size="small"
            color="warning"
            sx={{ ml: 1 }}
          />
        )}
      </Box>

      {/* Validation Errors */}
      {showValidationErrors && validationResult && !validationResult.isValid && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="error" gutterBottom>
            Filter Validation Errors:
          </Typography>
          {validationResult.errors.map((error, index) => (
            <Typography key={index} variant="body2" color="error" sx={{ ml: 1 }}>
              • {error}
            </Typography>
          ))}
        </Box>
      )}

      {/* Validation Warnings */}
      {((validationResult?.warnings?.length || 0) > 0 || (sortGroupValidation?.warnings?.length || 0) > 0) && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="warning.dark" gutterBottom>
            Filter Warnings:
          </Typography>
          {validationResult?.warnings?.map((warning, index) => (
            <Typography key={`filter-${index}`} variant="body2" color="warning.dark" sx={{ ml: 1 }}>
              • {warning}
            </Typography>
          ))}
          {sortGroupValidation?.warnings?.map((warning, index) => (
            <Typography key={`sortgroup-${index}`} variant="body2" color="warning.dark" sx={{ ml: 1 }}>
              • {warning}
            </Typography>
          ))}
        </Box>
      )}

      {/* Common Filters */}
      {filterOptions.common_filters.length > 0 && (
        <Accordion 
          expanded={expandedSections.common}
          onChange={() => handleSectionToggle('common')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              Common Filters
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {filterOptions.common_filters.map((filter) => (
                <Grid item xs={12} sm={6} md={4} key={filter.name}>
                  {renderFilterField(filter)}
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Specific Filters */}
      {filterOptions.specific_filters.length > 0 && (
        <Accordion 
          expanded={expandedSections.specific}
          onChange={() => handleSectionToggle('specific')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              Specific Filters
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {filterOptions.specific_filters.map((filter) => (
                <Grid item xs={12} sm={6} md={4} key={filter.name}>
                  {renderFilterField(filter)}
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Sort and Group By Controls */}
      <Accordion 
        expanded={expandedSections.sortGroup}
        onChange={() => handleSectionToggle('sortGroup')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            Sort & Group Options
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* Sort Controls */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={sortGroupValidation?.errors.some(e => e.includes('Sort field')) || false}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.sort_by || ''}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="">No Sorting</MenuItem>
                  {getAvailableSortFields(reportType).map(field => (
                    <MenuItem key={field} value={field} title={getFieldDescription(field)}>
                      {getFieldDisplayName(field)}
                    </MenuItem>
                  ))}
                </Select>
                {sortGroupValidation?.errors.some(e => e.includes('Sort field')) && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {sortGroupValidation.errors.find(e => e.includes('Sort field'))}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Sort Direction</InputLabel>
                <Select
                  value={filters.sort_direction || 'asc'}
                  onChange={(e) => handleFilterChange('sort_direction', e.target.value)}
                  label="Sort Direction"
                >
                  <MenuItem value="asc">Ascending (A-Z)</MenuItem>
                  <MenuItem value="desc">Descending (Z-A)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Group By Controls */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={sortGroupValidation?.errors.some(e => e.includes('Group field')) || false}>
                <InputLabel>Group By</InputLabel>
                <Select
                  value={filters.group_by || ''}
                  onChange={(e) => handleFilterChange('group_by', e.target.value)}
                  label="Group By"
                >
                  <MenuItem value="">No Grouping</MenuItem>
                  {getAvailableGroupFields(reportType).map(field => (
                    <MenuItem key={field} value={field} title={`Group by ${getFieldDisplayName(field).toLowerCase()}`}>
                      {getFieldDisplayName(field)}
                    </MenuItem>
                  ))}
                </Select>
                {sortGroupValidation?.errors.some(e => e.includes('Group field')) && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {sortGroupValidation.errors.find(e => e.includes('Group field'))}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={sortGroupValidation?.errors.some(e => e.includes('Secondary group field')) || false}>
                <InputLabel>Secondary Group By</InputLabel>
                <Select
                  value={filters.group_by_secondary || ''}
                  onChange={(e) => handleFilterChange('group_by_secondary', e.target.value)}
                  label="Secondary Group By"
                  disabled={!filters.group_by}
                >
                  <MenuItem value="">No Secondary Grouping</MenuItem>
                  {getAvailableGroupFields(reportType)
                    .filter(field => field !== filters.group_by) // Don't allow same field as primary group
                    .map(field => (
                      <MenuItem key={field} value={field} title={`Secondary group by ${getFieldDisplayName(field).toLowerCase()}`}>
                        {getFieldDisplayName(field)}
                      </MenuItem>
                    ))}
                </Select>
                {sortGroupValidation?.errors.some(e => e.includes('Secondary group field')) && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {sortGroupValidation.errors.find(e => e.includes('Secondary group field'))}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Tooltip title="Clear all filters">
          <IconButton onClick={handleClearFilters} color="secondary">
            <ClearIcon />
          </IconButton>
        </Tooltip>
        
        <Button
          variant="outlined"
          onClick={handleClearFilters}
          startIcon={<ClearIcon />}
        >
          Clear
        </Button>
        
        <Button
          variant="contained"
          onClick={handleApplyFilters}
          startIcon={<SearchIcon />}
          disabled={loading || (validationResult ? !validationResult.isValid : false) || (sortGroupValidation ? !sortGroupValidation.isValid : false)}
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </Box>
    </Box>
  );
};
