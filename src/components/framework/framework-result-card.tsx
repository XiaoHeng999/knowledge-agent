'use client';

import type { FrameworkAnalysisResult } from '@/lib/ipc/channels';

interface FrameworkResultCardProps {
  result: FrameworkAnalysisResult;
  expanded?: boolean;
  onClick?: () => void;
}

const FRAMEWORK_LABELS: Record<string, string> = {
  trl: 'TRL',
  competitive_landscape: 'Competitive Landscape',
  hype_cycle: 'Hype Cycle',
  custom: 'Custom',
};

export function FrameworkResultCard({ result, expanded, onClick }: FrameworkResultCardProps) {
  let parsedData: { raw?: string; parsed?: { summary?: string; score?: number; tags?: string[] } } = {};
  try {
    parsedData = JSON.parse(result.analysisData);
  } catch { /* use raw */ }

  const label = FRAMEWORK_LABELS[result.frameworkType] ?? result.frameworkType;
  const summary = parsedData.parsed?.summary ?? '';
  const score = parsedData.parsed?.score;

  return (
    <div
      className={`framework-result-card ${expanded ? 'framework-result-card--expanded' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="framework-result-card__header">
        <span className="framework-result-card__badge">{label}</span>
        <span className="framework-result-card__title">{result.title}</span>
        {score !== undefined && (
          <span className="framework-result-card__score">Score: {score}</span>
        )}
      </div>

      {!expanded && summary && (
        <p className="framework-result-card__summary">{summary.slice(0, 200)}{summary.length > 200 ? '...' : ''}</p>
      )}

      <div className="framework-result-card__meta">
        <span className="framework-result-card__date">
          {new Date(result.createdAt).toLocaleDateString()}
        </span>
        {result.costUsd > 0 && (
          <span className="framework-result-card__cost">${result.costUsd.toFixed(4)}</span>
        )}
        <span className="framework-result-card__nodes">
          {result.sourceNodeIds.length} source nodes
        </span>
      </div>

      {expanded && parsedData.raw && (
        <div className="framework-result-card__content">
          <pre className="framework-result-card__raw">{parsedData.raw}</pre>
        </div>
      )}
    </div>
  );
}
