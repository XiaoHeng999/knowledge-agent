'use client';

interface SkeletonShapeProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  radius?: string | number;
}

function toStyleValue(v: string | number | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

export function Skeleton({ className = '', width, height, radius }: SkeletonShapeProps) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = toStyleValue(width);
  if (height !== undefined) style.height = toStyleValue(height);
  if (radius !== undefined) style.borderRadius = toStyleValue(radius);

  return (
    <div
      className={`ui-skeleton ${className}`}
      style={style}
      role="status"
      aria-label="Loading content"
    />
  );
}

export function SkeletonCircle({ size = 32 }: { size?: number }) {
  return (
    <Skeleton
      width={size}
      height={size}
      radius="50%"
    />
  );
}

export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <Skeleton height={12} width={width} radius={4} />;
}

export function SkeletonHeading({ width = '60%' }: { width?: string }) {
  return <Skeleton height={20} width={width} radius={4} />;
}

export function SkeletonCard({ height = 80, children }: { height?: number; children?: React.ReactNode }) {
  return (
    <div className="ui-skeleton" style={{ height, width: '100%', borderRadius: 6 }} role="status" aria-label="Loading content">
      {children}
    </div>
  );
}

export function SkeletonPill({ width = 64 }: { width?: number }) {
  return <Skeleton height={24} width={width} radius={12} />;
}

export function SkeletonMetric() {
  return <Skeleton height={40} width={80} radius={4} />;
}

/* Multi-line skeleton for text blocks */
export function SkeletonLines({ count = 3, gap = 8 }: { count?: number; gap?: number }) {
  return (
    <div className="ui-skeleton-group" style={{ gap }} role="status" aria-label="Loading content">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonLine key={i} width={i === count - 1 ? '70%' : '100%'} />
      ))}
    </div>
  );
}

/* Row helper — horizontal flex */
export function SkeletonRow({ children, gap = 8, className = '', style }: { children: React.ReactNode; gap?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`ui-skeleton-row ${className}`} style={{ gap, ...style }}>
      {children}
    </div>
  );
}

/* Section helper — vertical flex with spacing */
export function SkeletonSection({ children, gap = 12, className = '', style }: { children: React.ReactNode; gap?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`ui-skeleton-section ${className}`} style={{ gap, ...style }}>
      {children}
    </div>
  );
}
