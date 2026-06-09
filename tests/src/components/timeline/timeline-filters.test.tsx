import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineFilters } from '@/components/timeline/timeline-filters';
import type { PredictionStatus } from '@/lib/ipc/channels';

describe('TimelineFilters', () => {
  const baseProps = {
    dateRange: 'all' as const,
    onDateRangeChange: vi.fn(),
    statusFilter: 'all' as PredictionStatus | 'all',
    onStatusFilterChange: vi.fn(),
    activeTab: 'timeline' as const,
    loading: false,
    selectedDomainId: 'domain-1',
    showCreateForm: false,
    onToggleCreateForm: vi.fn(),
    onAnalyzeTrends: vi.fn(),
    onGeneratePredictions: vi.fn(),
  };

  it('renders date range select', () => {
    render(<TimelineFilters {...baseProps} />);
    expect(screen.getByDisplayValue('All time')).toBeInTheDocument();
  });

  it('shows status filter only on predictions tab', () => {
    const { rerender } = render(<TimelineFilters {...baseProps} activeTab="predictions" />);
    expect(screen.getByDisplayValue('All')).toBeInTheDocument();

    rerender(<TimelineFilters {...baseProps} activeTab="timeline" />);
    expect(screen.queryByDisplayValue('All')).not.toBeInTheDocument();
  });

  it('shows create/generate buttons on predictions tab', () => {
    render(<TimelineFilters {...baseProps} activeTab="predictions" />);
    expect(screen.getByText('+ New Prediction')).toBeInTheDocument();
    expect(screen.getByText('AI Predictions')).toBeInTheDocument();
  });

  it('shows analyze button on trends tab', () => {
    render(<TimelineFilters {...baseProps} activeTab="trends" />);
    expect(screen.getByText('Analyze Trends')).toBeInTheDocument();
  });

  it('calls onToggleCreateForm when New Prediction clicked', () => {
    const onToggle = vi.fn();
    render(<TimelineFilters {...baseProps} activeTab="predictions" onToggleCreateForm={onToggle} />);
    fireEvent.click(screen.getByText('+ New Prediction'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('toggles button label when showCreateForm is true', () => {
    render(<TimelineFilters {...baseProps} activeTab="predictions" showCreateForm={true} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('disables buttons when no domain selected', () => {
    render(<TimelineFilters {...baseProps} activeTab="predictions" selectedDomainId="" />);
    expect(screen.getByText('+ New Prediction')).toBeDisabled();
    expect(screen.getByText('AI Predictions')).toBeDisabled();
  });
});
