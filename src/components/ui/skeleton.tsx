'use client';

type SkeletonVariant = 'line' | 'card' | 'circle' | 'rect';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

export function Skeleton({
  variant = 'line',
  width,
  height,
  lines,
  className = '',
}: SkeletonProps) {
  if (variant === 'line' && lines && lines > 1) {
    return (
      <div className={`ui-skeleton-group ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="ui-skeleton ui-skeleton--line"
            style={{
              width: i === lines! - 1 ? '70%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  const style: React.CSSProperties = {};
  if (width !== undefined) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height !== undefined) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  return (
    <div
      className={`ui-skeleton ui-skeleton--${variant} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
