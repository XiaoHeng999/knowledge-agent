'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTimelineStore } from '@/stores/timeline-store';
import { useDomainStore } from '@/stores/domain-store';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TimelineEventCard,
  PredictionCard,
  AccuracyCard,
  TrendAnalysisCard,
  CreatePredictionForm,
} from '@/components/timeline/timeline-event-card';
import type { PredictionStatus } from '@/lib/ipc/channels';

type TabKey = 'timeline' | 'predictions' | 'trends';
type DateRange = 'all' | 'month' | 'quarter' | 'year';

const STATUS_FILTERS: Array<{ value: PredictionStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'refuted', label: 'Refuted' },
  { value: 'expired', label: 'Expired' },
];

export default function TimelinePage() {
  const {
    loading,
    error,
    predictions,
    predictionsTotal,
    events,
    eventsTotal,
    trendAnalysis,
    accuracy,
    fetchPredictions,
    createPrediction,
    verifyPrediction,
    deletePrediction,
    analyzeTrends,
    generatePredictions,
    fetchAccuracy,
    fetchEvents,
    clearError,
  } = useTimelineStore();

  const domains = useDomainStore((s) => s.domains);
  const fetchDomains = useDomainStore((s) => s.fetchDomains);

  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('timeline');
  const [statusFilter, setStatusFilter] = useState<PredictionStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id);
    }
  }, [domains, selectedDomainId]);

  useEffect(() => {
    if (selectedDomainId) {
      fetchEvents(selectedDomainId);
      fetchPredictions(selectedDomainId, statusFilter === 'all' ? undefined : statusFilter);
      fetchAccuracy(selectedDomainId);
    }
  }, [selectedDomainId, fetchEvents, fetchPredictions, fetchAccuracy, statusFilter]);

  const handleDomainChange = useCallback((domainId: string) => {
    setSelectedDomainId(domainId);
    setStatusFilter('all');
    setDateRange('all');
  }, []);

  const handleAnalyzeTrends = useCallback(async () => {
    if (!selectedDomainId) return;
    const period = dateRange === 'all' || dateRange === 'month' ? 'month' : dateRange;
    await analyzeTrends(selectedDomainId, period);
  }, [selectedDomainId, dateRange, analyzeTrends]);

  const handleGeneratePredictions = useCallback(async () => {
    if (!selectedDomainId) return;
    await generatePredictions(selectedDomainId);
  }, [selectedDomainId, generatePredictions]);

  const handleCreatePrediction = useCallback(async (params: { content: string; confidence: number; predictedDate?: string; reasoning?: string }) => {
    if (!selectedDomainId) return;
    await createPrediction({ ...params, domainId: selectedDomainId });
    setShowCreateForm(false);
  }, [selectedDomainId, createPrediction]);

  const handleVerify = useCallback(async (id: string, status: "confirmed" | "refuted" | "expired", actualOutcome?: string) => {
    await verifyPrediction(id, status, actualOutcome);
    if (selectedDomainId) fetchAccuracy(selectedDomainId);
  }, [verifyPrediction, fetchAccuracy, selectedDomainId]);

  const handleDelete = useCallback(async (id: string) => {
    await deletePrediction(id);
  }, [deletePrediction]);

  const currentDomain = domains.find((d) => d.id === selectedDomainId);

  // Filter events by date range
  const filteredEvents = (() => {
    if (dateRange === 'all') return events;
    const now = new Date();
    const days = dateRange === 'month' ? 30 : dateRange === 'quarter' ? 90 : 365;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return events.filter((e) => new Date(e.date) >= cutoff);
  })();

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'timeline', label: `Timeline (${eventsTotal})` },
    { key: 'predictions', label: `Predictions (${predictionsTotal})` },
    { key: 'trends', label: 'Trends' },
  ];

  return (
    <div className="timeline-page">
      <div className="timeline-page__header">
        <div className="timeline-page__header-left">
          {currentDomain && (
            <span className="timeline-page__domain-dot" style={{ backgroundColor: currentDomain.color }} aria-hidden="true" />
          )}
          <h1 className="timeline-page__title">Timeline & Predictions</h1>
        </div>
        <div className="timeline-page__header-right">
          <select
            className="timeline-page__domain-select"
            value={selectedDomainId}
            onChange={(e) => handleDomainChange(e.target.value)}
          >
            <option value="">Select domain</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {accuracy && <AccuracyCard accuracy={accuracy} />}

      {error && (
        <div className="timeline-page__error">
          <span>{error}</span>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      <div className="timeline-page__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`timeline-page__tab ${activeTab === tab.key ? 'timeline-page__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div className="timeline-page__filters">
        <select
          className="timeline-page__filter-select"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
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
            onChange={(e) => setStatusFilter(e.target.value as PredictionStatus | 'all')}
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
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : '+ New Prediction'}
            </button>
            <button
              className="timeline-page__action-btn"
              disabled={!selectedDomainId || loading}
              onClick={handleGeneratePredictions}
            >
              {loading ? 'Generating...' : 'AI Predictions'}
            </button>
          </>
        )}

        {activeTab === 'trends' && (
          <button
            className="timeline-page__action-btn"
            disabled={!selectedDomainId || loading}
            onClick={handleAnalyzeTrends}
          >
            {loading ? 'Analyzing...' : 'Analyze Trends'}
          </button>
        )}
      </div>

      {showCreateForm && (
        <CreatePredictionForm
          onSubmit={handleCreatePrediction}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="timeline-page__content">
        {!selectedDomainId ? (
          <EmptyState
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            }
            title="Select a domain"
            description="Choose a domain to view its timeline, predictions, and trend analyses."
          />
        ) : activeTab === 'timeline' ? (
          loading && filteredEvents.length === 0 ? (
            <div className="timeline-page__skeleton">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} variant="card" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              }
              title="No timeline events"
              description="Timeline events are extracted from knowledge nodes and predictions. Add knowledge or create predictions to populate the timeline."
            />
          ) : (
            <div className="timeline-page__timeline">
              {filteredEvents.map((entry) => (
                <TimelineEventCard key={entry.id} entry={entry} />
              ))}
            </div>
          )
        ) : activeTab === 'predictions' ? (
          loading && predictions.length === 0 ? (
            <div className="timeline-page__skeleton">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} variant="card" />
              ))}
            </div>
          ) : predictions.length === 0 ? (
            <EmptyState
              icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
              title="No predictions yet"
              description="Create predictions manually or use AI to generate them from domain knowledge."
            />
          ) : (
            <div className="timeline-page__predictions">
              {predictions.map((pred) => (
                <PredictionCard
                  key={pred.id}
                  prediction={pred}
                  onVerify={handleVerify}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )
        ) : (
          trendAnalysis ? (
            <TrendAnalysisCard analysis={trendAnalysis} />
          ) : (
            <EmptyState
              icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
              title="No trend analysis"
              description="Click 'Analyze Trends' to generate a trend report from your domain's knowledge base. Requires at least 10 knowledge nodes."
            />
          )
        )}
      </div>

      <style jsx>{`
        .timeline-page {
          padding: 24px;
          height: 100%;
          overflow-y: auto;
        }
        .timeline-page__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .timeline-page__header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .timeline-page__domain-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }
        .timeline-page__title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        .timeline-page__domain-select,
        .timeline-page__filter-select {
          padding: 6px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 13px;
        }
        .timeline-page__tabs {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 12px;
        }
        .timeline-page__tab {
          padding: 8px 16px;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
        }
        .timeline-page__tab--active {
          color: var(--text-primary);
          border-bottom-color: var(--accent);
          font-weight: 500;
        }
        .timeline-page__filters {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .timeline-page__action-btn {
          padding: 6px 14px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 13px;
          transition: background 0.15s;
        }
        .timeline-page__action-btn:hover:not(:disabled) {
          background: var(--accent-bg);
        }
        .timeline-page__action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .timeline-page__error {
          padding: 8px 12px;
          background: #fee2e2;
          color: #dc2626;
          border-radius: 6px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .timeline-page__error button {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 12px;
          text-decoration: underline;
        }
        .timeline-page__skeleton {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .timeline-page__timeline {
          position: relative;
          padding-left: 24px;
        }
        .timeline-page__predictions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .timeline-page__content {
          min-height: 200px;
        }

        /* Event card styles */
        :global(.timeline-event-card) {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
          margin-bottom: 8px;
          position: relative;
          border-left: 3px solid var(--border);
          transition: background 0.15s;
        }
        :global(.timeline-event-card:hover) {
          background: var(--bg-tertiary, var(--bg-secondary));
        }
        :global(.timeline-event-card--prediction) {
          border-left-style: dashed;
          border-left-color: var(--accent);
        }
        :global(.timeline-event-card__dot) {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 6px;
        }
        :global(.timeline-event-card__line) {
          position: absolute;
          left: -1.5px;
          top: 20px;
          bottom: -8px;
          width: 3px;
          opacity: 0.2;
        }
        :global(.timeline-event-card:last-child .timeline-event-card__line) {
          display: none;
        }
        :global(.timeline-event-card__body) {
          flex: 1;
          min-width: 0;
        }
        :global(.timeline-event-card__header) {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        :global(.timeline-event-card__icon) {
          font-size: 14px;
        }
        :global(.timeline-event-card__title) {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        :global(.timeline-event-card__desc) {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 4px 0 0;
          line-height: 1.4;
        }
        :global(.timeline-event-card__meta) {
          display: flex;
          gap: 8px;
          margin-top: 4px;
          font-size: 11px;
          color: var(--text-tertiary, #9ca3af);
        }
        :global(.timeline-event-card__type-badge) {
          padding: 1px 6px;
          background: var(--bg-primary);
          border-radius: 4px;
          text-transform: capitalize;
        }

        /* Prediction badge */
        :global(.timeline-pred-badge) {
          display: inline-block;
          padding: 1px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 500;
        }

        /* Confidence bar */
        :global(.timeline-confidence) {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        :global(.timeline-confidence__bar) {
          width: 48px;
          height: 4px;
          background: var(--bg-primary);
          border-radius: 2px;
          overflow: hidden;
        }
        :global(.timeline-confidence__fill) {
          height: 100%;
          background: var(--accent);
          border-radius: 2px;
          transition: width 0.3s;
        }
        :global(.timeline-confidence__label) {
          font-size: 11px;
          color: var(--text-secondary);
        }

        /* Prediction card */
        :global(.timeline-pred-card) {
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        :global(.timeline-pred-card__header) {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        :global(.timeline-pred-card__content) {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        :global(.timeline-pred-card__reasoning) {
          font-size: 12px;
          color: var(--text-secondary);
          font-style: italic;
          margin-bottom: 4px;
        }
        :global(.timeline-pred-card__footer) {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: var(--text-tertiary, #9ca3af);
          flex-wrap: wrap;
        }
        :global(.timeline-pred-card__actions) {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }
        :global(.timeline-pred-card__btn) {
          padding: 4px 10px;
          border-radius: 4px;
          border: 1px solid var(--border);
          font-size: 12px;
          cursor: pointer;
          transition: background 0.15s;
        }
        :global(.timeline-pred-card__btn--confirm) {
          background: #dcfce7;
          color: #16a34a;
          border-color: #bbf7d0;
        }
        :global(.timeline-pred-card__btn--refute) {
          background: #fee2e2;
          color: #dc2626;
          border-color: #fecaca;
        }
        :global(.timeline-pred-card__btn--delete) {
          background: var(--bg-primary);
          color: var(--text-secondary);
        }

        /* Accuracy card */
        :global(.timeline-accuracy) {
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
          margin-bottom: 16px;
          border: 1px solid var(--border);
        }
        :global(.timeline-accuracy__title) {
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 8px;
        }
        :global(.timeline-accuracy__grid) {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        :global(.timeline-accuracy__stat) {
          text-align: center;
        }
        :global(.timeline-accuracy__value) {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }
        :global(.timeline-accuracy__label) {
          font-size: 11px;
          color: var(--text-secondary);
        }
        :global(.timeline-accuracy__detail) {
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        /* Trend card */
        :global(.timeline-trend-card) {
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        :global(.timeline-trend-card__header) {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        :global(.timeline-trend-card__title) {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        :global(.timeline-trend-card__period) {
          font-size: 12px;
          padding: 2px 8px;
          background: var(--accent-bg);
          color: var(--accent);
          border-radius: 4px;
          text-transform: capitalize;
        }
        :global(.timeline-trend-card__report) {
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-primary);
          margin-bottom: 16px;
          white-space: pre-wrap;
        }
        :global(.timeline-trend-card__section) {
          margin-bottom: 12px;
        }
        :global(.timeline-trend-card__section-title) {
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 4px;
        }
        :global(.timeline-trend-card__list) {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        :global(.timeline-trend-card__list-item) {
          padding: 4px 8px;
          margin-bottom: 2px;
          font-size: 13px;
          border-radius: 4px;
        }
        :global(.timeline-trend-card__list-item--emerging) {
          background: #dcfce7;
          color: #16a34a;
        }
        :global(.timeline-trend-card__list-item--declining) {
          background: #fee2e2;
          color: #dc2626;
        }
        :global(.timeline-trend-card__meta) {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--text-secondary);
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }

        /* Create form */
        :global(.timeline-create-form) {
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border);
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        :global(.timeline-create-form__input) {
          padding: 6px 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 13px;
          resize: vertical;
        }
        :global(.timeline-create-form__row) {
          display: flex;
          gap: 12px;
        }
        :global(.timeline-create-form__field) {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        :global(.timeline-create-form__actions) {
          display: flex;
          gap: 8px;
        }
        :global(.timeline-create-form__btn) {
          padding: 6px 14px;
          border-radius: 6px;
          border: 1px solid var(--border);
          font-size: 13px;
          cursor: pointer;
        }
        :global(.timeline-create-form__btn--submit) {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        :global(.timeline-create-form__btn--cancel) {
          background: var(--bg-primary);
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
