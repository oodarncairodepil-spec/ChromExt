import { useEffect, useMemo, useRef, useState } from 'react';

interface SearchOptions {
  min?: number;
  delay?: number;
  maxWait?: number;
}

interface SearchResult<T> {
  data: T[] | null;
  loading: boolean;
  error: unknown;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
}

function useDebouncedSearch<T>(
  query: string,
  searchFunction: (query: string) => Promise<T[]>,
  opts: SearchOptions = { min: 3, delay: 300, maxWait: 800 }
): SearchResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const cache = useMemo(() => new Map<string, T[]>(), []);
  const ctrlRef = useRef<AbortController | null>(null);
  const timers = useRef<{ t?: number; m?: number }>({});
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    const { min = 3, delay = 300, maxWait = 800 } = opts;
    const trimmedQuery = query.trim();
    
    // Don't search while composing (IME safety)
    if (isComposing) return;
    
    // Clear results if query is too short
    if (trimmedQuery.length < min) {
      setData(null);
      setLoading(false);
      setError(null);
      // Clear any pending timers
      window.clearTimeout(timers.current.t);
      window.clearTimeout(timers.current.m);
      timers.current.m = undefined;
      return;
    }

    // Clear existing timer
    window.clearTimeout(timers.current.t);
    
    // Set max wait timer if not already set
    if (!timers.current.m) {
      timers.current.m = window.setTimeout(run, maxWait);
    }
    
    // Set debounce timer
    timers.current.t = window.setTimeout(run, delay);

    async function run() {
      window.clearTimeout(timers.current.t);
      window.clearTimeout(timers.current.m);
      timers.current.m = undefined;

      // Check cache first
      if (cache.has(trimmedQuery)) {
        setData(cache.get(trimmedQuery) || null);
        setLoading(false);
        setError(null);
        return;
      }

      // Cancel any in-flight request
      ctrlRef.current?.abort();
      ctrlRef.current = new AbortController();

      setLoading(true);
      setError(null);
      
      try {
        const results = await searchFunction(trimmedQuery);
        cache.set(trimmedQuery, results);
        setData(results);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setError(e);
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    }

    return () => {
      window.clearTimeout(timers.current.t);
      window.clearTimeout(timers.current.m);
    };
  }, [query, opts, cache, searchFunction, isComposing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ctrlRef.current?.abort();
      window.clearTimeout(timers.current.t);
      window.clearTimeout(timers.current.m);
    };
  }, []);

  return {
    data,
    loading,
    error,
    // Expose composition handlers for IME safety
    onCompositionStart: () => setIsComposing(true),
    onCompositionEnd: () => setIsComposing(false)
  };
}

export default useDebouncedSearch;