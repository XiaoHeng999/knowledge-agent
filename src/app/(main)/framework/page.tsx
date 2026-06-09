'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFrameworkStore } from '@/stores/framework-store';
import { useDomainStore } from '@/stores/domain-store';
import { useLayout } from '@/components/layout/layout-context';
import { FrameworkResultCard } from '@/components/framework/framework-result-card';
import { DecisionRecordCard } from '@/components/framework/decision-record-card';
import { DomainSummaryPanel } from '@/components/framework/domain-summary-panel';
import { MemoryLayerBar } from '@/components/framework/memory-layer-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { ViewLoadingState } from '@/components/skeleton/view-loading';

type TabKey = 'analysis' | 'decisions' | 'summary';

export default function FrameworkPage() {
  const {
    loading,
    error,
    frameworks,
    analysisResults,
    resultsTotal,
    decisions,
    decisionsTotal,
    summary,
    memoryStats,
    fetchFrameworks,
    fetchResults,
    executeAnalysis,
    fetchDecisions,
    generateSummary,
    fetchMemoryStats,
    clearError,
  } = useFrameworkStore();

  const domains = useDomainStore((s) => s.domains);
  const fetchDomains = useDomainStore((s) => s.fetchDomains);
  const { openPanel } = useLayout();

  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('analysis');

  useEffect(() => {
    fetchFrameworks();
    fetchDomains();
  }, [fetchFrameworks, fetchDomains]);

  // Re-fetch frameworks when selected domain changes (to include/exclude custom)
  useEffect(() => {
    if (selectedDomainId) {
      fetchFrameworks(selectedDomainId);
    }
  }, [selectedDomainId, fetchFrameworks]);

  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id);
    }
  }, [domains, selectedDomainId]);

  useEffect(() => {
    if (selectedDomainId) {
      fetchResults(selectedDomainId);
      fetchDecisions(selectedDomainId);
      fetchMemoryStats(selectedDomainId);
    }
  }, [selectedDomainId, fetchResults, fetchDecisions, fetchMemoryStats]);

  const handleExecute = useCallback(async () => {
    if (!selectedDomainId || !selectedFramework) return;
    await executeAnalysis(selectedDomainId, selectedFramework);
  }, [selectedDomainId, selectedFramework, executeAnalysis]);

  const handleGenerateSummary = useCallback(async () => {
    if (!selectedDomainId) return;
    await generateSummary(selectedDomainId);
  }, [selectedDomainId, generateSummary]);

  const handleResultClick = useCallback(
    (result: typeof analysisResults[number]) => {
      openPanel('framework-result', 400, (
        <FrameworkResultCard
          result={result}
          expanded
        />
      ));
    },
    [openPanel],
  );

  const handleDecisionClick = useCallback(
    (decision: typeof decisions[number]) => {
      openPanel('decision-detail', 400, (
        <DecisionRecordCard
          decision={decision}
          expanded
          onStatusChange={(id, status) => {
            useFrameworkStore.getState().updateDecision(id, status);
          }}
        />
      ));
    },
    [openPanel],
  );

  const currentDomain = domains.find((d) => d.id === selectedDomainId);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'analysis', label: `Analysis (${resultsTotal})` },
    { key: 'decisions', label: `Decisions (${decisionsTotal})` },
    { key: 'summary', label: 'Summary' },
  ];

  return (
    <ViewLoadingState
      view="research"
      isLoading={loading && analysisResults.length === 0 && decisions.length === 0}
      onRetry={() => { if (selectedDomainId) { fetchResults(selectedDomainId); fetchDecisions(selectedDomainId); } }}
      onCancel={() => {}}
    >
    <div className="framework-page">
      <div className="framework-page__header">
        <div className="framework-page__header-left">
          {currentDomain && (
            <span
              className="framework-page__domain-dot"
              style={{ backgroundColor: currentDomain.color }}
              aria-hidden="true"
            />
          )}
          <h1 className="framework-page__title">Framework Analysis</h1>
        </div>
        <div className="framework-page__header-right">
          <select
            className="framework-page__domain-select"
            value={selectedDomainId}
            onChange={(e) => setSelectedDomainId(e.target.value)}
          >
            <option value="">Select domain</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {memoryStats && (
        <MemoryLayerBar stats={memoryStats} />
      )}

      {error && (
        <div className="framework-page__error">
          <span>{error}</span>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      <div className="framework-page__execute-bar">
        <select
          className="framework-page__framework-select"
          value={selectedFramework}
          onChange={(e) => setSelectedFramework(e.target.value)}
        >
          <option value="">Select framework...</option>
          {frameworks.map((f) => (
            <option key={f.type} value={f.type}>{f.name}</option>
          ))}
        </select>
        <button
          className="framework-page__execute-btn"
          disabled={!selectedDomainId || !selectedFramework || loading}
          onClick={handleExecute}
        >
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
        <button
          className="framework-page__summary-btn"
          disabled={!selectedDomainId || loading}
          onClick={handleGenerateSummary}
        >
          Generate Summary
        </button>
      </div>

      <div className="framework-page__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`framework-page__tab ${activeTab === tab.key ? 'framework-page__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="framework-page__content">
        {!selectedDomainId ? (
          <EmptyState
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
              </svg>
            }
            title="Select a domain"
            description="Choose a domain from the dropdown to run framework analyses."
          />
        ) : activeTab === 'analysis' ? (
          analysisResults.length === 0 ? (
            <EmptyState
              icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
                </svg>
              }
              title="No analyses yet"
              description="Select a framework above and run your first analysis to see results here."
            />
          ) : (
            analysisResults.map((result) => (
              <FrameworkResultCard
                key={result.id}
                result={result}
                onClick={() => handleResultClick(result)}
              />
            ))
          )
        ) : activeTab === 'decisions' ? (
          decisions.length === 0 ? (
            <EmptyState
              icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              title="No decisions recorded"
              description="Decision records (ADRs) will appear here as they are created from framework analyses or manually."
            />
          ) : (
            decisions.map((decision) => (
              <DecisionRecordCard
                key={decision.id}
                decision={decision}
                onClick={() => handleDecisionClick(decision)}
              />
            ))
          )
        ) : (
          summary ? (
            <DomainSummaryPanel summary={summary} />
          ) : (
            <EmptyState
              icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              }
              title="No summary generated"
              description="Click 'Generate Summary' to create a comprehensive domain summary."
            />
          )
        )}
      </div>
    </div>
    </ViewLoadingState>
  );
}
