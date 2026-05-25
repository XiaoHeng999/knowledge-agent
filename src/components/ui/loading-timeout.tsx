'use client';

import { useState, useEffect } from 'react';

interface LoadingTimeoutProps {
  headline: string;
  description: string;
  onRetry: () => void;
  onCancel: () => void;
  elapsedSeconds: number;
}

export function LoadingTimeout({
  headline,
  description,
  onRetry,
  onCancel,
  elapsedSeconds,
}: LoadingTimeoutProps) {
  const [seconds, setSeconds] = useState(elapsedSeconds);

  useEffect(() => {
    setSeconds(elapsedSeconds);
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [elapsedSeconds]);

  return (
    <div className="ui-loading-timeout" role="alert">
      <div className="ui-loading-timeout__icon" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <div className="ui-loading-timeout__headline">{headline}</div>
      <div className="ui-loading-timeout__desc">{description}</div>
      <div className="ui-loading-timeout__actions">
        <button className="ui-loading-timeout__retry" onClick={onRetry} type="button">
          Try Again
        </button>
        <button className="ui-loading-timeout__cancel" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
      <div className="ui-loading-timeout__elapsed">
        Trying for {seconds}s...
      </div>
    </div>
  );
}
