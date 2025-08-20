import React from 'react';
import { ApiError } from '../../hooks/useApiError';

interface ErrorDisplayProps {
  error: ApiError | null;
  title?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  context?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = React.memo(({
  error,
  title = 'Error',
  showRetry = true,
  onRetry = () => window.location.reload(),
  context
}) => {
  if (!error) return null;

  return (
    <div className="card">
      <h2>{title}</h2>
      <div style={{ color: '#dc3545', padding: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          {error.message}
        </div>
        {error.status && (
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            Status: {error.status} {error.type && `(${error.type})`}
          </div>
        )}
        <div style={{ fontSize: '14px', color: '#666' }}>
          {context || 'Please check your connection and try again.'}
        </div>
        {showRetry && (
          <button 
            className="button button-secondary" 
            onClick={onRetry}
            style={{ marginTop: '15px' }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
});

ErrorDisplay.displayName = 'ErrorDisplay';

export default ErrorDisplay;