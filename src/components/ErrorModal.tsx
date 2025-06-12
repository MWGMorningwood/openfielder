import React from 'react';
import { X, AlertTriangle, AlertCircle, Info, Wifi, Lock, User } from 'lucide-react';
import type { AppError, ErrorType } from '../types/errorTypes';
import { useError } from '../contexts/ErrorContext';
import './ErrorModal.css';

interface ErrorModalProps {
  error: AppError;
}

function ErrorModal({ error }: ErrorModalProps) {
  const { clearError } = useError();

  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case 'geocoding':
        return <AlertTriangle size={24} />;
      case 'api':
        return <AlertCircle size={24} />;
      case 'authentication':
        return <User size={24} />;
      case 'permission':
        return <Lock size={24} />;
      case 'network':
        return <Wifi size={24} />;
      case 'validation':
        return <Info size={24} />;
      default:
        return <AlertCircle size={24} />;
    }
  };

  const getErrorColor = (type: ErrorType) => {
    switch (type) {
      case 'authentication':
      case 'permission':
        return 'error-critical';
      case 'validation':
        return 'error-warning';
      case 'network':
        return 'error-info';
      default:
        return 'error-standard';
    }
  };

  const handleClose = () => {
    clearError(error.id);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className="error-modal-backdrop" onClick={handleBackdropClick}>
      <div className={`error-modal ${getErrorColor(error.type)}`}>
        <div className="error-modal-header">
          <div className="error-modal-icon">
            {getErrorIcon(error.type)}
          </div>
          <div className="error-modal-title">
            <h3>{error.title}</h3>
            <span className="error-modal-type">{error.type.toUpperCase()}</span>
          </div>
          <button 
            className="error-modal-close"
            onClick={handleClose}
            aria-label="Close error"
          >
            <X size={20} />
          </button>
        </div>

        <div className="error-modal-body">
          <p className="error-modal-message">{error.message}</p>
          
          {error.details && (
            <details className="error-modal-details">
              <summary>Technical Details</summary>
              <pre>{error.details}</pre>
            </details>
          )}
        </div>

        {error.actions && error.actions.length > 0 && (
          <div className="error-modal-actions">
            {error.actions.map((action, index) => (
              <button
                key={index}
                className={`error-action-button ${action.variant || 'secondary'}`}
                onClick={() => {
                  action.action();
                  handleClose();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <div className="error-modal-footer">
          <span className="error-modal-timestamp">
            {error.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ErrorModals() {
  const { errors } = useError();

  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      {errors.map(error => (
        <ErrorModal key={error.id} error={error} />
      ))}
    </>
  );
}
