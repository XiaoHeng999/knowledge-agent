'use client';

interface ComprehensionIndicatorProps {
  level: number;
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function ComprehensionIndicator({
  level,
  max = 5,
  size = 'sm',
  className = '',
}: ComprehensionIndicatorProps) {
  const clampedLevel = Math.max(0, Math.min(max, Math.round(level)));

  return (
    <span
      className={`comprehension-indicator comprehension-indicator--${size} ${className}`}
      role="meter"
      aria-valuenow={clampedLevel}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`Comprehension level: ${clampedLevel} of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`comprehension-indicator__dot ${
            i < clampedLevel ? 'comprehension-indicator__dot--filled' : ''
          }`}
        />
      ))}
    </span>
  );
}
