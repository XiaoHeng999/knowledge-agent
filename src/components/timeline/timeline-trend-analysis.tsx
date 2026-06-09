'use client';

import { TrendAnalysisCard } from '@/components/timeline/timeline-event-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { TrendAnalysisResult } from '@/lib/ipc/channels';

interface TimelineTrendAnalysisProps {
  analysis: TrendAnalysisResult | null;
  onAnalyze: () => void;
}

export function TimelineTrendAnalysis({ analysis, onAnalyze }: TimelineTrendAnalysisProps) {
  if (!analysis) {
    return (
      <EmptyState
        emoji="📈"
        title="No trend analysis"
        description="Click 'Analyze Trends' to generate a trend report from your domain's knowledge base."
        action={{ label: 'Analyze trends', onClick: onAnalyze }}
      />
    );
  }

  return <TrendAnalysisCard analysis={analysis} />;
}
