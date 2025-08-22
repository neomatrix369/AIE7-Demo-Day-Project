import React from 'react';
import NavigationHeader from '../NavigationHeader';

interface PageWrapperProps {
  currentPage: string;
  loading?: boolean;
  error?: string | null;
  loadingMessage?: string;
  errorTitle?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

const PageWrapper: React.FC<PageWrapperProps> = ({
  currentPage,
  loading = false,
  error = null,
  loadingMessage = 'Loading...',
  errorTitle = 'Error Loading Data',
  onRetry,
  children
}) => {
  if (loading) {
    return (
      <div>
        <NavigationHeader currentPage={currentPage} />
        <div className="card">
          <h2>{loadingMessage}</h2>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '18px', color: '#666' }}>Please wait...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <NavigationHeader currentPage={currentPage} />
        <div className="card">
          <h2>{errorTitle}</h2>
          <div style={{ color: '#dc3545', padding: '20px', marginBottom: '20px' }}>
            {error}
          </div>
          {onRetry && (
            <button 
              className="button button-secondary" 
              onClick={onRetry}
              style={{ marginTop: '10px' }}
            >
              🔄 Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavigationHeader currentPage={currentPage} />
      {children}
    </div>
  );
};

export default PageWrapper;