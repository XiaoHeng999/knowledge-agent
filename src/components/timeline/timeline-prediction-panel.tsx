'use client';

import { PredictionCard, CreatePredictionForm } from '@/components/timeline/timeline-event-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { TimelinePrediction } from '@/lib/ipc/channels';

interface TimelinePredictionPanelProps {
  predictions: TimelinePrediction[];
  showCreateForm: boolean;
  onCreateSubmit: (params: { content: string; confidence: number; predictedDate?: string; reasoning?: string }) => void;
  onCreateCancel: () => void;
  onVerify: (id: string, status: 'confirmed' | 'refuted' | 'expired', actualOutcome?: string) => void;
  onDelete: (id: string) => void;
  onGenerate: () => void;
}

export function TimelinePredictionPanel({
  predictions,
  showCreateForm,
  onCreateSubmit,
  onCreateCancel,
  onVerify,
  onDelete,
  onGenerate,
}: TimelinePredictionPanelProps) {
  return (
    <>
      {showCreateForm && (
        <CreatePredictionForm onSubmit={onCreateSubmit} onCancel={onCreateCancel} />
      )}

      {predictions.length === 0 ? (
        <EmptyState
          emoji="🔮"
          title="No predictions yet"
          description="Create predictions manually or use AI to generate them from domain knowledge."
          action={{ label: 'Generate AI predictions', onClick: onGenerate }}
        />
      ) : (
        <div className="timeline-page__predictions">
          {predictions.map((pred) => (
            <PredictionCard
              key={pred.id}
              prediction={pred}
              onVerify={onVerify}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}
