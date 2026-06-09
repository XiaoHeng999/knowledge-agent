'use client';

import type { PredictionStatus } from '@/lib/ipc/channels';

export type DateRange = 'all' | 'month' | 'quarter' | 'year';

const STATUS_FILTERS: Array<{ value: PredictionStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'refuted', label: 'Refuted' },
  { value: 'expired', label: 'Expired' },
];

interface TimelineFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  statusFilter: PredictionStatus | 'all';
  onStatusFilterChange: (status: PredictionStatus | 'all') => void;
  activeTab: 'timeline' | 'predictions' | 'trends';
  loading: boolean;
  selectedDomainId: string;
  showCreateForm: boolean;
  onToggleCreateForm: () => void;
  onAnalyzeTrends: () => void;
  onGeneratePredictions: () => void;
}

export function TimelineFilters({
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  activeTab,
  loading,
  selectedDomainId,
  showCreateForm,
  onToggleCreateForm,
  onAnalyzeTrends,
  onGeneratePredictions,
}: TimelineFiltersProps) {
  return (
    <div className="timeline-page__filters">
      <select
        className="timeline-page__filter-select"
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value as DateRange)}
      >
        <option value="all">All time</option>
        <option value="month">Last month</option>
        <option value="quarter">Last quarter</option>
        <option value="year">Last year</option>
      </select>

      {activeTab === 'predictions' && (
        <select
          className="timeline-page__filter-select"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as PredictionStatus | 'all')}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      )}

      {activeTab === 'predictions' && (
        <>
          <button
            className="timeline-page__action-btn"
            disabled={!selectedDomainId || loading}
            onClick={onToggleCreateForm}
          >
            {showCreateForm ? 'Cancel' : '+ New Prediction'}
          </button>
          <button
            className="timeline-page__action-btn"
            disabled={!selectedDomainId || loading}
            onClick={onGeneratePredictions}
          >
            {loading ? 'Generating...' : 'AI Predictions'}
          </button>
        </>
      )}

      {activeTab === 'trends' && (
        <button
          className="timeline-page__action-btn"
          disabled={!selectedDomainId || loading}
          onClick={onAnalyzeTrends}
        >
          {loading ? 'Analyzing...' : 'Analyze Trends'}
        </button>
      )}
    </div>
  );
}
