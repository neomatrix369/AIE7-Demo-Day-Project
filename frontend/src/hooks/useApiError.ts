import { useState, useCallback } from 'react';
import { logError } from '../utils/logger';

export interface ApiError {
  message: string;
  status?: number;
  type?: string;
}

export interface UseApiErrorReturn {
  error: ApiError | null;
  setError: (error: ApiError | null) => void;
  clearError: () => void;
  handleApiError: (error: any, context: { component: string; action: string; userMessage?: string }) => void;
}

export const useApiError = (): UseApiErrorReturn => {
  const [error, setError] = useState<ApiError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiError = useCallback((error: any, context: { component: string; action: string; userMessage?: string }) => {
    const userMessage = context.userMessage || 'An unexpected error occurred';
    const apiError: ApiError = {
      message: userMessage,
      status: error?.response?.status,
      type: error?.code || error?.name || 'Unknown'
    };

    setError(apiError);

    logError(`${context.action} failed: ${userMessage}`, {
      component: context.component,
      action: context.action,
      data: {
        error_type: error?.code || error?.name || 'Unknown',
        error_message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText
      }
    });
  }, []);

  return {
    error,
    setError,
    clearError,
    handleApiError
  };
};