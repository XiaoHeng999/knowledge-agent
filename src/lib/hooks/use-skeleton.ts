'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_FLASH_THRESHOLD = 100;
const DEFAULT_TIMEOUT_THRESHOLD = 10_000;

interface UseLoadingStateOptions {
  flashThreshold?: number;
  timeoutThreshold?: number;
}

interface LoadingState {
  /** Whether to show the skeleton (true after flash threshold, false if timed out) */
  showSkeleton: boolean;
  /** Whether loading has exceeded the timeout threshold */
  isTimedOut: boolean;
  /** Elapsed seconds since loading started */
  elapsedSeconds: number;
  /** Reset all timers (call on retry) */
  reset: () => void;
}

export function useLoadingState(
  isLoading: boolean,
  options?: UseLoadingStateOptions,
): LoadingState {
  const flashThreshold = options?.flashThreshold ?? DEFAULT_FLASH_THRESHOLD;
  const timeoutThreshold = options?.timeoutThreshold ?? DEFAULT_TIMEOUT_THRESHOLD;

  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const loadingStartRef = useRef<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    flashTimerRef.current = null;
    timeoutTimerRef.current = null;
    elapsedTimerRef.current = null;
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setShowSkeleton(false);
    setIsTimedOut(false);
    setElapsedSeconds(0);
    loadingStartRef.current = null;
  }, [clearTimers]);

  useEffect(() => {
    if (!isLoading) {
      clearTimers();
      setShowSkeleton(false);
      setIsTimedOut(false);
      setElapsedSeconds(0);
      loadingStartRef.current = null;
      return;
    }

    loadingStartRef.current = Date.now();

    flashTimerRef.current = setTimeout(() => {
      setShowSkeleton(true);
    }, flashThreshold);

    timeoutTimerRef.current = setTimeout(() => {
      setIsTimedOut(true);
    }, timeoutThreshold);

    elapsedTimerRef.current = setInterval(() => {
      if (loadingStartRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - loadingStartRef.current) / 1000));
      }
    }, 1000);

    return clearTimers;
  }, [isLoading, flashThreshold, timeoutThreshold, clearTimers]);

  return {
    showSkeleton: showSkeleton && !isTimedOut,
    isTimedOut,
    elapsedSeconds,
    reset,
  };
}
