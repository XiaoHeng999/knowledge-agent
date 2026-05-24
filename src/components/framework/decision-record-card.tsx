'use client';

import type { DecisionRecordResult } from '@/lib/ipc/channels';

interface DecisionRecordCardProps {
  decision: DecisionRecordResult;
  expanded?: boolean;
  onClick?: () => void;
  onStatusChange?: (id: string, status: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  proposed: '#f9bd2b',
  accepted: '#22c55e',
  deprecated: '#a9b1d6',
  superseded: '#ff6b6b',
};

export function DecisionRecordCard({ decision, expanded, onClick, onStatusChange }: DecisionRecordCardProps) {
  const adrNumber = `ADR-${String(decision.decisionNumber).padStart(3, '0')}`;

  return (
    <div
      className={`decision-record-card ${expanded ? 'decision-record-card--expanded' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="decision-record-card__header">
        <span className="decision-record-card__number">{adrNumber}</span>
        <span className="decision-record-card__title">{decision.title}</span>
        <span
          className="decision-record-card__status"
          style={{ color: STATUS_COLORS[decision.status] ?? '#a9b1d6' }}
        >
          {decision.status}
        </span>
      </div>

      {!expanded && (
        <p className="decision-record-card__context">{decision.context.slice(0, 150)}{decision.context.length > 150 ? '...' : ''}</p>
      )}

      {expanded && (
        <div className="decision-record-card__body">
          <section>
            <h4>Context</h4>
            <p>{decision.context}</p>
          </section>
          <section>
            <h4>Decision</h4>
            <p>{decision.decisionText}</p>
          </section>
          {decision.rationale && (
            <section>
              <h4>Rationale</h4>
              <p>{decision.rationale}</p>
            </section>
          )}
          {decision.expectedOutcome && (
            <section>
              <h4>Expected Outcome</h4>
              <p>{decision.expectedOutcome}</p>
            </section>
          )}

          {onStatusChange && decision.status === 'proposed' && (
            <div className="decision-record-card__actions">
              <button
                className="decision-record-card__accept"
                onClick={(e) => { e.stopPropagation(); onStatusChange(decision.id, 'accepted'); }}
              >
                Accept
              </button>
              <button
                className="decision-record-card__deprecate"
                onClick={(e) => { e.stopPropagation(); onStatusChange(decision.id, 'deprecated'); }}
              >
                Deprecate
              </button>
            </div>
          )}
        </div>
      )}

      <div className="decision-record-card__meta">
        <span className="decision-record-card__date">
          {new Date(decision.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
