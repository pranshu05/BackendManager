import { useState, useEffect, useCallback, useRef } from 'react';

// Simple in-memory cache
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for fetching data with automatic caching
 * 
 * @example
 * const { data, loading, error, refetch } = useFetch('/api/projects');
 */
export function useFetch(url, options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);

    const {
        cache = true,
        onSuccess = null,
        onError = null
    } = options;

    const fetchData = useCallback(async (forceRefresh = false) => {
        if (!url) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Check cache first
            if (cache && !forceRefresh) {
                const cached = apiCache.get(url);
                if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                    if (mountedRef.current) {
                        setData(cached.data);
                        setLoading(false);
                    }
                    return cached.data;
                }
            }

            // Fetch from API
            const response = await fetch(url, {
                credentials: 'include',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Cache the result
            if (cache) {
                apiCache.set(url, {
                    data: result,
                    timestamp: Date.now()
                });
            }

            if (mountedRef.current) {
                setData(result);
                setLoading(false);
                if (onSuccess) onSuccess(result);
            }

            return result;

        } catch (err) {
            if (mountedRef.current) {
                setError(err.message);
                setLoading(false);
                if (onError) onError(err);
            }
        }
    }, [url, cache, onSuccess, onError]);

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, [fetchData]);

    const refetch = useCallback(() => {
        return fetchData(true);
    }, [fetchData]);

    return { data, loading, error, refetch };
}

/**
 * Hook for fetching projects with automatic caching
 */
export function useProjects() {
    return useFetch('/api/projects', { cache: true });
}

/**
 * Hook for fetching specific project details
 */
export function useProject(projectId) {
    return useFetch(
        projectId ? `/api/projects/${projectId}` : null,
        { cache: true }
    );
}

/**
 * Hook for fetching project tables with caching
 */
export function useProjectTables(projectId) {
    return useFetch(
        projectId ? `/api/projects/${projectId}/tables` : null,
        { cache: true }
    );
}

/**
 * Hook for fetching table data with pagination support
 */
export function useTableData(projectId, tableName, limit = 5) {
    const [isExpanded, setIsExpanded] = useState(false);
    const actualLimit = isExpanded ? null : limit;

    const { data, loading, error, refetch } = useFetch(
        projectId && tableName 
            ? `/api/projects/${projectId}/tables?table=${tableName}${actualLimit ? `&limit=${actualLimit}` : ''}`
            : null,
        { cache: false } // Don't cache table data as it changes frequently
    );

    const loadMore = useCallback(() => {
        setIsExpanded(true);
    }, []);

    const hasMore = data && !isExpanded && data.rows?.length === limit;

    return { 
        data, 
        loading, 
        error, 
        refetch, 
        loadMore, 
        hasMore,
        isExpanded 
    };
}

/**
 * Hook for mutations (POST, PUT, DELETE) with cache invalidation
 */
export function useMutation(url, method = 'POST') {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(async (body, options = {}) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Invalidate related caches
            if (options.invalidateCache) {
                for (const cacheKey of options.invalidateCache) {
                    apiCache.delete(cacheKey);
                }
            }

            setLoading(false);
            return result;

        } catch (err) {
            setError(err.message);
            setLoading(false);
            throw err;
        }
    }, [url, method]);

    return { mutate, loading, error };
}

/**
 * Clear specific cache entry
 */
export function invalidateCache(url) {
    apiCache.delete(url);
}

/**
 * Clear all cache
 */
export function clearAllCache() {
    apiCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats() {
    return {
        size: apiCache.size,
        keys: Array.from(apiCache.keys())
    };
}