'use client';

import type { DomainSummaryResult } from '@/lib/ipc/channels';

interface DomainSummaryPanelProps {
  summary: DomainSummaryResult;
}

export function DomainSummaryPanel({ summary }: DomainSummaryPanelProps) {
  return (
    <div className="domain-summary-panel">
      <div className="domain-summary-panel__header">
        <h2>{summary.domainName} — Domain Summary</h2>
        <span className="domain-summary-panel__date">
          Generated {new Date(summary.generatedAt).toLocaleString()}
        </span>
      </div>

      <div className="domain-summary-panel__memory">
        <span className="domain-summary-panel__memory-item domain-summary-panel__memory-item--hot">
          Hot: {summary.hotLayerCount}
        </span>
        <span className="domain-summary-panel__memory-item domain-summary-panel__memory-item--warm">
          Warm: {summary.warmLayerCount}
        </span>
        <span className="domain-summary-panel__memory-item domain-summary-panel__memory-item--cold">
          Cold: {summary.coldLayerCount}
        </span>
      </div>

      <section className="domain-summary-panel__section">
        <h3>Executive Summary</h3>
        <p>{summary.executiveSummary}</p>
      </section>

      {summary.keyFindings.length > 0 && (
        <section className="domain-summary-panel__section">
          <h3>Key Findings</h3>
          <ul>
            {summary.keyFindings.map((finding, i) => (
              <li key={i}>{finding}</li>
            ))}
          </ul>
        </section>
      )}

      {summary.activePredictions.length > 0 && (
        <section className="domain-summary-panel__section">
          <h3>Active Predictions</h3>
          <ul>
            {summary.activePredictions.map((pred, i) => (
              <li key={i}>{pred}</li>
            ))}
          </ul>
        </section>
      )}

      {summary.decisionLog.length > 0 && (
        <section className="domain-summary-panel__section">
          <h3>Decision Log</h3>
          <ul>
            {summary.decisionLog.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
        </section>
      )}

      {summary.recommendedActions.length > 0 && (
        <section className="domain-summary-panel__section">
          <h3>Recommended Actions</h3>
          <ul>
            {summary.recommendedActions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
