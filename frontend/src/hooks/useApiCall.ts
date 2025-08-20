import { useState, useCallback } from 'react';
import { useApiError, ApiError } from './useApiError';

export interface UseApiCallReturn<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: (apiCall: () => Promise<T>, context: { component: string; action: string; userMessage?: string }) => Promise<T | null>;
  clearError: () => void;
  setData: (data: T | null) => void;
}

export const useApiCall = <T>(): UseApiCallReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const { error, clearError, handleApiError } = useApiError();

  const execute = useCallback(async (
    apiCall: () => Promise<T>,
    context: { component: string; action: string; userMessage?: string }
  ): Promise<T | null> => {
    try {
      setLoading(true);
      clearError();
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err: any) {
      handleApiError(err, context);
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError, handleApiError]);

  return {
    data,
    loading,
    error,
    execute,
    clearError,
    setData
  };
};