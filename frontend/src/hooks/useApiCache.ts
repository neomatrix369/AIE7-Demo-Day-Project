import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

interface UsApiCacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  maxSize?: number; // Maximum cache size (default: 50 entries)
}

/**
 * Hook for API request deduplication and caching
 * Prevents duplicate requests and caches results for performance
 */
export const useApiCache = <T = any>(options: UsApiCacheOptions = {}) => {
  const { ttl = 5 * 60 * 1000, maxSize = 50 } = options;
  const cache = useRef(new Map<string, CacheEntry<T>>());
  const requestsInFlight = useRef(new Map<string, Promise<T>>());

  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const entries = Array.from(cache.current.entries());
    
    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > ttl) {
        cache.current.delete(key);
      }
    });

    // Remove oldest entries if cache is too large
    if (cache.current.size > maxSize) {
      const sortedEntries = Array.from(cache.current.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = sortedEntries.slice(0, cache.current.size - maxSize);
      toRemove.forEach(([key]) => cache.current.delete(key));
    }
  }, [ttl, maxSize]);

  const cachedRequest = useCallback(async (
    key: string, 
    requestFn: () => Promise<T>
  ): Promise<T> => {
    cleanupCache();

    // Check if result is already cached and fresh
    const cached = cache.current.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    // Check if request is already in flight
    const inFlightRequest = requestsInFlight.current.get(key);
    if (inFlightRequest) {
      return inFlightRequest;
    }

    // Make new request
    const promise = requestFn().then(
      (result) => {
        // Cache the result
        cache.current.set(key, {
          data: result,
          timestamp: Date.now()
        });
        
        // Remove from in-flight requests
        requestsInFlight.current.delete(key);
        
        return result;
      },
      (error) => {
        // Remove from in-flight requests on error
        requestsInFlight.current.delete(key);
        throw error;
      }
    );

    // Track as in-flight request
    requestsInFlight.current.set(key, promise);
    
    return promise;
  }, [ttl, cleanupCache]);

  const invalidateCache = useCallback((keyPrefix?: string) => {
    if (keyPrefix) {
      // Remove entries matching prefix
      const keysToRemove = Array.from(cache.current.keys())
        .filter(key => key.startsWith(keyPrefix));
      keysToRemove.forEach(key => {
        cache.current.delete(key);
        requestsInFlight.current.delete(key);
      });
    } else {
      // Clear all cache
      cache.current.clear();
      requestsInFlight.current.clear();
    }
  }, []);

  const getCacheStats = useCallback(() => ({
    size: cache.current.size,
    inFlight: requestsInFlight.current.size,
    keys: Array.from(cache.current.keys())
  }), []);

  return {
    cachedRequest,
    invalidateCache,
    getCacheStats
  };
};

export default useApiCache;