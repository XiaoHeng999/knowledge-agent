'use client';

import { useCallback, type ReactNode } from 'react';

interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  className = '',
  disabled = false,
}: SegmentedControlProps<T>) {
  const handleChange = useCallback(
    (val: T) => {
      if (!disabled) onChange(val);
    },
    [disabled, onChange],
  );

  return (
    <div
      className={`ui-segmented ${className}`}
      role="radiogroup"
      aria-disabled={disabled}
    >
      {segments.map((seg) => {
        const isActive = seg.value === value;
        return (
          <button
            key={seg.value}
            className={`ui-segmented__btn ${
              isActive ? 'ui-segmented__btn--active' : ''
            }`}
            role="radio"
            aria-checked={isActive}
            onClick={() => handleChange(seg.value)}
            disabled={disabled || seg.disabled}
            type="button"
          >
            {seg.icon && (
              <span className="ui-segmented__icon" aria-hidden="true">
                {seg.icon}
              </span>
            )}
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
