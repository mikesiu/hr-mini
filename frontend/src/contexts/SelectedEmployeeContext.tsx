import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  phone?: string;
  status: string;
}

interface SelectedEmployeeContextType {
  selectedEmployee: Employee | null;
  setSelectedEmployee: (employee: Employee | null) => void;
  clearSelection: () => void;
}

const SelectedEmployeeContext = createContext<SelectedEmployeeContextType | undefined>(undefined);

export const useSelectedEmployee = () => {
  const context = useContext(SelectedEmployeeContext);
  if (context === undefined) {
    throw new Error('useSelectedEmployee must be used within a SelectedEmployeeProvider');
  }
  return context;
};

interface SelectedEmployeeProviderProps {
  children: ReactNode;
}

export const SelectedEmployeeProvider: React.FC<SelectedEmployeeProviderProps> = ({ children }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const clearSelection = () => {
    setSelectedEmployee(null);
  };

  const value = {
    selectedEmployee,
    setSelectedEmployee,
    clearSelection,
  };

  return (
    <SelectedEmployeeContext.Provider value={value}>
      {children}
    </SelectedEmployeeContext.Provider>
  );
};
