'use client';

import { useState, useEffect, useCallback } from 'react';
import { useResearchStore } from '@/stores/research-store';
import { useDomainStore } from '@/stores/domain-store';
import { EmptyState } from '@/components/ui/empty-state';
import { ViewLoadingState } from '@/components/skeleton/view-loading';
import { Progress } from '@/components/ui/progress';

export default function ResearchPage() {
  const {
    loading,
    error,
    dashboard,
    activeRun,
    fetchDashboard,
    triggerResearch,
    cancelRun,
    refreshStatus,
  } = useResearchStore();

  const domains = useDomainStore((s) => s.domains);
  const fetchDomains = useDomainStore((s) => s.fetchDomains);
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');

  useEffect(() => {
    fetchDashboard();
    fetchDomains();
  }, [fetchDashboard, fetchDomains]);

  // Auto-select first domain
  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id);
    }
  }, [domains, selectedDomainId]);

  // Poll active run status
  useEffect(() => {
    if (!activeRun || activeRun.status !== 'running') return;
    const timer = setInterval(() => {
      refreshStatus(activeRun.id);
    }, 3000);
    return () => clearInterval(timer);
  }, [activeRun, refreshStatus]);

  const handleTrigger = useCallback(async () => {
    if (!selectedDomainId) return;
    const status = await triggerResearch(selectedDomainId);
    if (status) {
      // Refresh dashboard after a short delay
      setTimeout(() => fetchDashboard(), 2000);
    }
  }, [selectedDomainId, triggerResearch, fetchDashboard]);

  const handleCancel = useCallback(async () => {
    if (!activeRun) return;
    await cancelRun(activeRun.id);
    fetchDashboard();
  }, [activeRun, cancelRun, fetchDashboard]);

  const recentResearch = dashboard?.recentResearch ?? [];
  const costTracking = dashboard?.costTracking;

  return (
    <ViewLoadingState
      view="research"
      isLoading={loading && recentResearch.length === 0}
      onRetry={fetchDashboard}
      onCancel={() => {}}
    >
    <div className="research-page">
      <div className="research-page__header">
        <h1 className="research-page__title">Research Dashboard</h1>
        <span className="research-page__summary">{dashboard?.todaySummary ?? ''}</span>
      </div>

      {/* Trigger section */}
      <div className="research-page__trigger">
        <div className="research-page__trigger-row">
          <select
            className="research-page__domain-select"
            value={selectedDomainId}
            onChange={(e) => setSelectedDomainId(e.target.value)}
            disabled={activeRun?.status === 'running'}
          >
            {domains.length === 0 && <option value="">No domains</option>}
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            className="research-page__trigger-btn"
            onClick={handleTrigger}
            disabled={!selectedDomainId || activeRun?.status === 'running'}
          >
            {activeRun?.status === 'running' ? 'Running...' : 'Run Research Now'}
          </button>
          {activeRun?.status === 'running' && (
            <button className="research-page__cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
          )}
        </div>

        {/* Active run progress */}
        {activeRun?.status === 'running' && (
          <div className="research-page__active">
            <div className="research-page__active-label">
              Research in progress for domain...
            </div>
            <Progress variant="linear" />
          </div>
        )}
      </div>

      {error && <div className="research-page__error">{error}</div>}

      {/* Cost tracking */}
      {costTracking && (costTracking.totalCost > 0 || Object.keys(costTracking.modelDistribution).length > 0) && (
        <div className="research-page__cost">
          <h2 className="research-page__section-title">Cost Tracking</h2>
          <div className="research-page__cost-grid">
            <div className="research-page__cost-card">
              <span className="research-page__cost-label">Total Cost</span>
              <span className="research-page__cost-value">${costTracking.totalCost.toFixed(4)}</span>
            </div>
            {Object.entries(costTracking.modelDistribution).map(([model, cost]) => (
              <div key={model} className="research-page__cost-card">
                <span className="research-page__cost-label">{model}</span>
                <span className="research-page__cost-value">${cost.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Research history timeline */}
      <div className="research-page__history">
        <h2 className="research-page__section-title">Recent Research</h2>

        {recentResearch.length === 0 ? (
          <EmptyState
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            }
            title="No research runs yet"
            description="Trigger a research run manually or wait for scheduled runs to appear here."
            action={{
              label: 'Run Research Now',
              onClick: handleTrigger,
            }}
          />
        ) : (
          <div className="research-page__timeline">
            {recentResearch.map((run) => (
              <div key={run.id} className="research-page__timeline-item">
                <div className={`research-page__timeline-dot research-page__timeline-dot--${run.status}`} />
                <div className="research-page__timeline-content">
                  <div className="research-page__timeline-header">
                    <span className="research-page__timeline-domain">{run.domainId}</span>
                    <span className={`research-page__timeline-status research-page__timeline-status--${run.status}`}>
                      {run.status}
                    </span>
                  </div>
                  <div className="research-page__timeline-meta">
                    <span>{new Date(run.startedAt).toLocaleString()}</span>
                    {run.completedAt && (
                      <span> — {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </ViewLoadingState>
  );
}
