import { useMemo, useCallback } from 'react';
import { useCompanyFilter as useCompanyFilterContext } from '../contexts/CompanyFilterContext';

/**
 * Custom hook to easily use company filtering across pages
 */
export const useCompanyFilter = () => {
  const context = useCompanyFilterContext();
  
  // Memoize helper functions to prevent unnecessary re-renders
  const getCompanyName = useCallback(() => {
    return context.selectedCompany?.legal_name || context.selectedCompanyId || 'Unknown Company';
  }, [context.selectedCompany?.legal_name, context.selectedCompanyId]);
  
  const getApiParams = useCallback((additionalParams: Record<string, any> = {}) => {
    return {
      ...additionalParams,
      ...(context.selectedCompanyId && { company_id: context.selectedCompanyId })
    };
  }, [context.selectedCompanyId]);
  
  const isFilterActive = useMemo(() => !!context.selectedCompanyId, [context.selectedCompanyId]);
  
  return {
    ...context,
    // Helper function to get API params with company filter
    getApiParams,
    // Helper function to check if company filter is active
    isFilterActive,
    // Helper function to get company name
    getCompanyName
  };
};
