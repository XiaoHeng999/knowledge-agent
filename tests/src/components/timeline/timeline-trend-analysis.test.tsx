import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineTrendAnalysis } from '@/components/timeline/timeline-trend-analysis';
import type { TrendAnalysisResult } from '@/lib/ipc/channels';

function makeAnalysis(overrides: Partial<TrendAnalysisResult> = {}): TrendAnalysisResult {
  return {
    domainId: 'domain-1',
    period: 'month',
    report: 'AI adoption is accelerating',
    emergingTopics: ['LLM agents', 'RAG'],
    decliningTopics: ['Manual testing'],
    knowledgeVelocity: 12,
    predictionSuggestions: [],
    analyzedAt: '2026-06-01T00:00:00Z',
    costUsd: 0.005,
    ...overrides,
  };
}

describe('TimelineTrendAnalysis', () => {
  it('renders trend analysis card when analysis exists', () => {
    const analysis = makeAnalysis();
    render(<TimelineTrendAnalysis analysis={analysis} onAnalyze={vi.fn()} />);
    expect(screen.getByText('AI adoption is accelerating')).toBeInTheDocument();
    expect(screen.getByText('LLM agents')).toBeInTheDocument();
    expect(screen.getByText('Manual testing')).toBeInTheDocument();
  });

  it('shows empty state when no analysis', () => {
    render(<TimelineTrendAnalysis analysis={null} onAnalyze={vi.fn()} />);
    expect(screen.getByText('No trend analysis')).toBeInTheDocument();
  });

  it('shows analyze button in empty state', () => {
    const onAnalyze = vi.fn();
    render(<TimelineTrendAnalysis analysis={null} onAnalyze={onAnalyze} />);
    expect(screen.getByText('Analyze trends')).toBeInTheDocument();
  });
});
