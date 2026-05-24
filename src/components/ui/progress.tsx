'use client';

interface LinearProgressProps {
  variant?: 'linear';
  value?: number;
  max?: number;
  indeterminate?: boolean;
  height?: number;
  showLabel?: boolean;
  className?: string;
}

interface CircularProgressProps {
  variant: 'circular';
  value?: number;
  max?: number;
  indeterminate?: boolean;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

type ProgressProps = LinearProgressProps | CircularProgressProps;

export function Progress(props: ProgressProps) {
  const variant = props.variant ?? 'linear';

  if (variant === 'circular') {
    return <CircularProgress {...(props as CircularProgressProps)} />;
  }
  return <LinearProgress {...(props as LinearProgressProps)} />;
}

function LinearProgress({
  value = 0,
  max = 100,
  indeterminate = false,
  height = 4,
  showLabel = false,
  className = '',
}: LinearProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={`ui-progress ui-progress--linear ${className}`}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={showLabel ? `${Math.round(pct)}%` : undefined}
    >
      <div
        className="ui-progress__track"
        style={{ height: `${height}px` }}
      >
        <div
          className={`ui-progress__fill ${
            indeterminate ? 'ui-progress__fill--indeterminate' : ''
          }`}
          style={indeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="ui-progress__label">{Math.round(pct)}%</span>
      )}
    </div>
  );
}

function CircularProgress({
  value = 0,
  max = 100,
  indeterminate = false,
  size = 32,
  strokeWidth = 3,
  showLabel = false,
  className = '',
}: CircularProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={`ui-progress ui-progress--circular ${className}`}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={indeterminate ? 'ui-progress__spin' : ''}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showLabel && (
        <span className="ui-progress__label ui-progress__label--center">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

Progress.displayName = 'Progress';
