'use client';

import { useEffect, useRef, useState } from 'react';

interface ComprehensionRingProps {
  score: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const SCORE_RANGES = [
  { max: 0.9, label: 'None', color: 'var(--text-tertiary)' },
  { max: 1.9, label: 'Aware', color: 'var(--warning)' },
  { max: 2.9, label: 'Familiar', color: 'var(--info)' },
  { max: 3.9, label: 'Understood', color: 'var(--accent)' },
  { max: 4.5, label: 'Deep', color: 'var(--success)' },
  { max: 5.0, label: 'Expert', color: 'var(--accent)' },
] as const;

function getScoreMeta(score: number) {
  return SCORE_RANGES.find((r) => score <= r.max) ?? SCORE_RANGES[SCORE_RANGES.length - 1];
}

export function ComprehensionRing({
  score,
  max = 5,
  size = 80,
  strokeWidth = 6,
  className = '',
}: ComprehensionRingProps) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<SVGSVGElement>(null);
  const meta = getScoreMeta(score);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(max, score)) / max;
  const offset = circumference * (1 - progress);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const strokeDashoffset = animated || reducedMotion ? offset : circumference;
  const transition = reducedMotion ? 'none' : 'stroke-dashoffset 800ms ease-out';

  return (
    <svg
      ref={ref}
      className={`comprehension-ring ${className}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Comprehension score: ${score.toFixed(1)} out of ${max} — ${meta.label}`}
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
        stroke={meta.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition, transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      />
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        dominantBaseline="central"
        className="comprehension-ring__value"
        fill="var(--text-primary)"
        fontSize={size >= 80 ? 20 : 14}
        fontWeight={600}
      >
        {score.toFixed(1)}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 12}
        textAnchor="middle"
        dominantBaseline="central"
        className="comprehension-ring__label"
        fill="var(--text-tertiary)"
        fontSize={12}
      >
        {meta.label}
      </text>
    </svg>
  );
}
