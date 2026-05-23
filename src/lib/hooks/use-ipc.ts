'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// useIpcQuery — read-only IPC calls that auto-fetch on mount
// ---------------------------------------------------------------------------

export interface UseIpcQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Encapsulates an IPC read call as a React hook.
 * Auto-fetches on mount and when `deps` change.
 * Pass `null` as `queryFn` to skip fetching (e.g. waiting for a required ID).
 *
 * @example
 * const { data, loading, error } = useIpcQuery(
 *   () => window.api.domain.list(),
 *   [],
 * );
 */
export function useIpcQuery<T>(
  queryFn: (() => Promise<T>) | null,
  deps: React.DependencyList = [],
): UseIpcQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(queryFn !== null);
  const [error, setError] = useState<string | null>(null);

  const fnRef = useRef(queryFn);
  fnRef.current = queryFn;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    const fn = fnRef.current;
    if (!fn) return;

    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!queryFn) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    execute();
    // `deps` intentionally controls refetch cadence; `queryFn` is tracked via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: execute };
}

// ---------------------------------------------------------------------------
// useIpcMutation — write IPC calls that execute on demand
// ---------------------------------------------------------------------------

export interface UseIpcMutationResult<TArgs extends unknown[], TResult> {
  /** Fire-and-forget: errors are captured to `error` state, not re-thrown. */
  mutate: (...args: TArgs) => Promise<TResult>;
  /** Returns the promise so callers can await / catch errors themselves. */
  mutateAsync: (...args: TArgs) => Promise<TResult>;
  loading: boolean;
  error: string | null;
  data: TResult | null;
  reset: () => void;
}

/**
 * Encapsulates an IPC write call as a React hook.
 * Does NOT auto-execute — call `mutate(...)` or `mutateAsync(...)` to trigger.
 *
 * @example
 * const createDomain = useIpcMutation(
 *   (req: DomainCreateRequest) => window.api.domain.create(req),
 * );
 * await createDomain.mutateAsync({ name: 'AI', ... });
 */
export function useIpcMutation<TArgs extends unknown[], TResult>(
  mutationFn: (...args: TArgs) => Promise<TResult>,
): UseIpcMutationResult<TArgs, TResult> {
  const [data, setData] = useState<TResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fnRef = useRef(mutationFn);
  fnRef.current = mutationFn;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutateAsync = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fnRef.current(...args);
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
        }
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
        throw err;
      }
    },
    [],
  );

  const mutate = useCallback(
    (...args: TArgs): Promise<TResult> =>
      mutateAsync(...args).catch(() => null as unknown as TResult),
    [mutateAsync],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, mutateAsync, loading, error, data, reset };
}
