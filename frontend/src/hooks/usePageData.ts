import { useState, useEffect, useCallback } from 'react';
import { logSuccess, logError, logInfo } from '../utils/logger';

interface PageDataOptions<T> {
  component: string;
  loadAction: string;
  successAction: string;
  errorAction: string;
  userErrorMessage: string;
  successMessage?: (data: T) => string;
  successData?: (data: T) => any;
}

interface UsePageDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function usePageData<T>(
  dataLoader: () => Promise<T>,
  options: PageDataOptions<T>
): UsePageDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      logInfo(`Loading ${options.component.toLowerCase()} data`, {
        component: options.component,
        action: options.loadAction
      });

      const result = await dataLoader();
      setData(result);

      const successMsg = options.successMessage 
        ? options.successMessage(result)
        : `${options.component} data loaded successfully`;

      logSuccess(successMsg, {
        component: options.component,
        action: options.successAction,
        data: options.successData ? options.successData(result) : undefined
      });

    } catch (err: any) {
      setError(options.userErrorMessage);
      
      logError(`${options.component} loading failed: ${options.userErrorMessage}`, {
        component: options.component,
        action: options.errorAction,
        data: {
          error_type: err?.code || err?.name || 'Unknown',
          error_message: err?.message,
          status: err?.response?.status
        }
      });
    } finally {
      setLoading(false);
    }
  }, [dataLoader]); // eslint-disable-line react-hooks/exhaustive-deps -- Remove options dependency to prevent infinite re-renders

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reload = useCallback(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, reload };
}

export default usePageData;