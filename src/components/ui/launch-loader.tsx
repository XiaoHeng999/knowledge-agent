'use client';

import { useState, useEffect } from 'react';

interface LaunchLoaderProps {
  onReady: () => void;
}

const STEPS = [
  'Initializing database...',
  'Loading knowledge base...',
  'Preparing agent runtime...',
  'Almost ready...',
];

const STEP_DURATION = 700;
const TOTAL_DURATION = STEP_DURATION * STEPS.length;

export function LaunchLoader({ onReady }: LaunchLoaderProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), STEP_DURATION * (i + 1)));
    });

    timers.push(setTimeout(onReady, TOTAL_DURATION));

    return () => timers.forEach(clearTimeout);
  }, [onReady]);

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
