import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppError, ErrorContextType } from '../types/errorTypes';
import { v4 as uuidv4 } from 'uuid';

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [errors, setErrors] = useState<AppError[]>([]);

  const showError = (error: Omit<AppError, 'id' | 'timestamp'>) => {
    const newError: AppError = {
      ...error,
      id: uuidv4(),
      timestamp: new Date()
    };
    
    setErrors(prev => [...prev, newError]);
    
    // Auto-clear error after 10 seconds for non-critical errors
    if (error.type !== 'authentication' && error.type !== 'permission') {
      setTimeout(() => {
        clearError(newError.id);
      }, 10000);
    }
  };

  const clearError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  const clearAllErrors = () => {
    setErrors([]);
  };

  return (
    <ErrorContext.Provider value={{ errors, showError, clearError, clearAllErrors }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}
