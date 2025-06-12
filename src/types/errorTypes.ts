// Error types for the OpenFielder application

export interface AppError {
  id: string;
  title: string;
  message: string;
  details?: string;
  timestamp: Date;
  type: ErrorType;
  actions?: ErrorAction[];
}

export type ErrorType = 
  | 'geocoding'
  | 'api'
  | 'authentication'
  | 'validation'
  | 'network'
  | 'permission'
  | 'unknown';

export interface ErrorAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface ErrorContextType {
  errors: AppError[];
  showError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
}
