'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTimelineStore } from '@/stores/timeline-store';
import { useDomainStore } from '@/stores/domain-store';
import { EmptyState } from '@/components/ui/empty-state';
import { ViewLoadingState } from '@/components/skeleton/view-loading';
import {
  AccuracyCard,
} from '@/components/timeline/timeline-event-card';
import { TimelineFilters } from '@/components/timeline/timeline-filters';
import { TimelineEventList } from '@/components/timeline/timeline-event-list';
import { TimelinePredictionPanel } from '@/components/timeline/timeline-prediction-panel';
import { TimelineTrendAnalysis } from '@/components/timeline/timeline-trend-analysis';
import type { PredictionStatus } from '@/lib/ipc/channels';
import type { DateRange } from '@/components/timeline/timeline-filters';
import '@/components/timeline/timeline-styles.css';

type TabKey = 'timeline' | 'predictions' | 'trends';

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
    <ViewLoadingState
      view="timeline"
      isLoading={loading && filteredEvents.length === 0 && predictions.length === 0}
      onRetry={() => { if (selectedDomainId) { fetchEvents(selectedDomainId); fetchPredictions(selectedDomainId); } }}
      onCancel={() => {}}
    >
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

      <TimelineFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        activeTab={activeTab}
        loading={loading}
        selectedDomainId={selectedDomainId}
        showCreateForm={showCreateForm}
        onToggleCreateForm={() => setShowCreateForm(!showCreateForm)}
        onAnalyzeTrends={handleAnalyzeTrends}
        onGeneratePredictions={handleGeneratePredictions}
      />

      {activeTab === 'predictions' && (
        <TimelinePredictionPanel
          predictions={predictions}
          showCreateForm={showCreateForm}
          onCreateSubmit={handleCreatePrediction}
          onCreateCancel={() => setShowCreateForm(false)}
          onVerify={handleVerify}
          onDelete={handleDelete}
          onGenerate={handleGeneratePredictions}
        />
      )}

      <div className="timeline-page__content">
        {!selectedDomainId ? (
          <EmptyState
            emoji="📅"
            title="Select a domain"
            description="Choose a domain to view its timeline, predictions, and trend analyses."
          />
        ) : activeTab === 'timeline' ? (
          <TimelineEventList
            events={filteredEvents}
            onTriggerResearch={() => {
              if (selectedDomainId && typeof window !== 'undefined' && window.api) {
                window.api.research.trigger({ domainId: selectedDomainId }).catch(() => {});
              }
            }}
          />
        ) : activeTab === 'predictions' ? null : (
          <TimelineTrendAnalysis analysis={trendAnalysis} onAnalyze={handleAnalyzeTrends} />
        )}
      </div>

    </div>
    </ViewLoadingState>
  );
}
