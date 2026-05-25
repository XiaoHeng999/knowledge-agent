'use client';

import { useState, useEffect, useCallback } from 'react';

interface LaunchLoaderProps {
  onReady: () => void;
}

const STEPS = [
  'Initializing database...',
  'Loading knowledge base...',
  'Preparing agent runtime...',
  'Almost ready...',
];

/** Maximum time before forcing ready (fallback) */
const MAX_WAIT = 5000;
/** Per-step minimum display time for visual smoothness */
const STEP_DURATION = 500;

export function LaunchLoader({ onReady }: LaunchLoaderProps) {
  const [step, setStep] = useState(0);
  const [readyCalled, setReadyCalled] = useState(false);

  const safeReady = useCallback(() => {
    if (!readyCalled) {
      setReadyCalled(true);
      onReady();
    }
  }, [onReady, readyCalled]);

  // Advance visual steps at fixed intervals
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), STEP_DURATION * (i + 1)));
    });

    // Safety net: force ready after MAX_WAIT
    timers.push(setTimeout(safeReady, MAX_WAIT));

    return () => timers.forEach(clearTimeout);
  }, [safeReady]);

  // Detect actual readiness — check if the Electron API is available
  useEffect(() => {
    let cancelled = false;

    async function checkReady() {
      // If running in browser without Electron, ready immediately
      if (typeof window === 'undefined' || !window.api) {
        // Give visual steps at least one cycle
        setTimeout(() => {
          if (!cancelled) safeReady();
        }, STEP_DURATION);
        return;
      }

      // Poll until the API responds or timeout
      const deadline = Date.now() + MAX_WAIT;
      while (Date.now() < deadline) {
        try {
          const result = await window.api.app.ping();
          if (result?.message && !cancelled) {
            // Let the visual step catch up (minimum 1 step visible)
            const elapsed = Date.now() - performance.timeOrigin;
            const minWait = STEP_DURATION;
            const remaining = Math.max(0, minWait - elapsed);
            setTimeout(() => {
              if (!cancelled) safeReady();
            }, remaining);
            return;
          }
        } catch {
          // API not ready yet
        }
        // Wait 200ms before retrying
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    checkReady();
    return () => { cancelled = true; };
  }, [safeReady]);

  const progress = Math.min((step / STEPS.length) * 100, 100);

  return (
    <div className="ui-launch-loader">
      <div className="ui-launch-loader__spinner" />
      <div className="ui-launch-loader__text">
        {step < STEPS.length ? STEPS[step] : 'Ready!'}
      </div>
      <div className="ui-launch-loader__bar">
        <div
          className="ui-launch-loader__bar-fill"
          style={{ width: `${progress}%`, transition: 'width 0.4s ease-out' }}
        />
      </div>
    </div>
  );
}
