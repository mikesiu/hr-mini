import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { companyAPI } from '../api/client';
import { useAuth } from './AuthContext';

interface Company {
  id: string;
  legal_name: string;
  trade_name?: string;
}

interface CompanyFilterContextType {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (companyId: string | null) => void;
  companies: Company[];
  loading: boolean;
  selectedCompany: Company | null;
  clearFilter: () => void;
}

const CompanyFilterContext = createContext<CompanyFilterContextType | undefined>(undefined);

interface CompanyFilterProviderProps {
  children: ReactNode;
}

export const CompanyFilterProvider: React.FC<CompanyFilterProviderProps> = ({ children }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchCompanies = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        console.log('CompanyFilterContext: Waiting for auth to load...');
        return;
      }
      
      // Check if user is authenticated
      if (!user) {
        console.warn('CompanyFilterContext: No authenticated user, skipping company fetch');
        setLoading(false);
        setCompanies([]);
        return;
      }
      
      // Check if token exists before making request
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('CompanyFilterContext: No access token found in localStorage, skipping company fetch');
        setLoading(false);
        setCompanies([]);
        return;
      }
      
      try {
        setLoading(true);
        console.log('CompanyFilterContext: Fetching companies with token:', {
          hasToken: !!token,
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 20) + '...'
        });
        
        const response = await companyAPI.list();
        console.log('CompanyFilterContext: Raw API response:', {
          status: response.status,
          data: response.data,
          hasSuccess: !!response.data?.success,
          hasData: !!response.data?.data,
          dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 0
        });
        
        // Handle both possible response structures
        let companyList: Company[] = [];
        
        if (response.data?.success && Array.isArray(response.data.data)) {
          // Standard structure: { success: true, data: [...] }
          companyList = response.data.data;
        } else if (Array.isArray(response.data)) {
          // Direct array response (unlikely but possible)
          companyList = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          // Nested data structure
          companyList = response.data.data;
        }
        
        // Filter to only include companies with required fields
        companyList = companyList.filter(c => c && c.id && c.legal_name);
        
        console.log('CompanyFilterContext: Setting companies:', companyList.length, 'companies', companyList);
        setCompanies(companyList);
        
        if (companyList.length === 0 && response.status === 200) {
          console.warn('CompanyFilterContext: Received 200 OK but no companies found in response:', response.data);
        }
      } catch (error: any) {
        console.error('CompanyFilterContext: Error fetching companies:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          fullError: error
        });
        
        // Handle 403 Forbidden - may be permission issue or expired token
        if (error.response?.status === 403) {
          console.warn('Access forbidden (403) when fetching companies. This may indicate a permission issue.');
          setCompanies([]);
        } else if (error.response?.status === 401) {
          // 401 should be handled by axios interceptor, but just in case
          console.warn('Unauthorized (401) when fetching companies.');
          setCompanies([]);
        } else if (error.code === 'ECONNRESET' || error.message?.includes('ConnectionResetError')) {
          console.warn('Connection lost while fetching companies. Retrying in 3 seconds...');
          // Retry after 3 seconds
          setTimeout(() => {
            fetchCompanies();
          }, 3000);
        } else {
          setCompanies([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [user, authLoading]);

  const selectedCompany = companies.find(company => company.id === selectedCompanyId) || null;

  const clearFilter = () => {
    setSelectedCompanyId(null);
  };

  const value: CompanyFilterContextType = {
    selectedCompanyId,
    setSelectedCompanyId,
    companies,
    loading,
    selectedCompany,
    clearFilter,
  };

  return (
    <CompanyFilterContext.Provider value={value}>
      {children}
    </CompanyFilterContext.Provider>
  );
};

export const useCompanyFilter = (): CompanyFilterContextType => {
  const context = useContext(CompanyFilterContext);
  if (context === undefined) {
    throw new Error('useCompanyFilter must be used within a CompanyFilterProvider');
  }
  return context;
};
