'use client';

import { useCallback, type ChangeEvent } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LayoutMode = 'force' | 'layered' | 'circular';

export interface GraphFilters {
  domainId?: string;
  type?: string;
  minComprehension?: number;
}

interface GraphControlPanelProps {
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
  nodeTypes: string[];
  domainIds?: string[];
  nodeCount: number;
  edgeCount: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAYOUT_OPTIONS: { value: LayoutMode; label: string }[] = [
  { value: 'force', label: 'Force' },
  { value: 'layered', label: 'Layered' },
  { value: 'circular', label: 'Circular' },
];

const COMPREHENSION_OPTIONS = [
  { value: 0, label: 'All levels' },
  { value: 1, label: '1+ Aware' },
  { value: 2, label: '2+ Familiar' },
  { value: 3, label: '3+ Understood' },
  { value: 4, label: '4+ Deep' },
  { value: 5, label: '5 Expert' },
];

const TYPE_LABELS: Record<string, string> = {
  concept: 'Concept',
  technology: 'Technology',
  person: 'Person',
  event: 'Event',
  decision: 'Decision',
  resource: 'Resource',
  question: 'Question',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GraphControlPanel({
  layout,
  onLayoutChange,
  filters,
  onFiltersChange,
  nodeTypes,
  domainIds,
  nodeCount,
  edgeCount,
  className = '',
}: GraphControlPanelProps) {
  const handleTypeFilter = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      onFiltersChange({ ...filters, type: e.target.value || undefined });
    },
    [filters, onFiltersChange],
  );

  const handleComprehensionFilter = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const val = parseInt(e.target.value, 10);
      onFiltersChange({ ...filters, minComprehension: val > 0 ? val : undefined });
    },
    [filters, onFiltersChange],
  );

  const handleDomainFilter = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      onFiltersChange({ ...filters, domainId: e.target.value || undefined });
    },
    [filters, onFiltersChange],
  );

  return (
    <div className={`graph-controls ${className}`}>
      <div className="graph-controls__stats">
        <span className="graph-controls__stat">{nodeCount} nodes</span>
        <span className="graph-controls__divider">·</span>
        <span className="graph-controls__stat">{edgeCount} edges</span>
      </div>

      <div className="graph-controls__section">
        <label className="graph-controls__label">Layout</label>
        <div className="graph-controls__layout-btns">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`graph-controls__layout-btn ${
                layout === opt.value ? 'graph-controls__layout-btn--active' : ''
              }`}
              onClick={() => onLayoutChange(opt.value)}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="graph-controls__section">
        <label className="graph-controls__label">Type</label>
        <select
          className="graph-controls__select"
          value={filters.type ?? ''}
          onChange={handleTypeFilter}
        >
          <option value="">All types</option>
          {nodeTypes.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </div>

      <div className="graph-controls__section">
        <label className="graph-controls__label">Comprehension</label>
        <select
          className="graph-controls__select"
          value={filters.minComprehension ?? 0}
          onChange={handleComprehensionFilter}
        >
          {COMPREHENSION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {domainIds && domainIds.length > 1 && (
        <div className="graph-controls__section">
          <label className="graph-controls__label">Domain</label>
          <select
            className="graph-controls__select"
            value={filters.domainId ?? ''}
            onChange={handleDomainFilter}
          >
            <option value="">All domains</option>
            {domainIds.map((id) => (
              <option key={id} value={id}>
                {id.slice(0, 8)}...
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
