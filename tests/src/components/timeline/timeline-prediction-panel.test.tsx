import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelinePredictionPanel } from '@/components/timeline/timeline-prediction-panel';
import type { TimelinePrediction } from '@/lib/ipc/channels';

function makePrediction(overrides: Partial<TimelinePrediction> = {}): TimelinePrediction {
  return {
    id: 'pred-1',
    domainId: 'domain-1',
    content: 'AI will surpass human performance',
    confidence: 0.8,
    predictedDate: '2027-01-01T00:00:00Z',
    status: 'pending',
    actualOutcome: null,
    sourceNodeIds: [],
    reasoning: 'Based on trends',
    verifiedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('TimelinePredictionPanel', () => {
  const baseProps = {
    onVerify: vi.fn(),
    onDelete: vi.fn(),
    onGenerate: vi.fn(),
  };

  it('renders prediction cards when predictions exist', () => {
    const preds = [makePrediction({ id: 'p1', content: 'Pred One' }), makePrediction({ id: 'p2', content: 'Pred Two' })];
    render(<TimelinePredictionPanel predictions={preds} {...baseProps} />);
    expect(screen.getByText('Pred One')).toBeInTheDocument();
    expect(screen.getByText('Pred Two')).toBeInTheDocument();
  });

  it('shows empty state when no predictions', () => {
    render(<TimelinePredictionPanel predictions={[]} {...baseProps} />);
    expect(screen.getByText('No predictions yet')).toBeInTheDocument();
  });

  it('renders create form when showCreateForm is true', () => {
    render(
      <TimelinePredictionPanel
        predictions={[]}
        showCreateForm={true}
        onCreateSubmit={vi.fn()}
        onCreateCancel={vi.fn()}
        {...baseProps}
      />,
    );
    expect(screen.getByPlaceholderText('Prediction statement...')).toBeInTheDocument();
  });

  it('does not render create form when showCreateForm is false', () => {
    render(
      <TimelinePredictionPanel
        predictions={[]}
        showCreateForm={false}
        onCreateSubmit={vi.fn()}
        onCreateCancel={vi.fn()}
        {...baseProps}
      />,
    );
    expect(screen.queryByPlaceholderText('Prediction statement...')).not.toBeInTheDocument();
  });
});
