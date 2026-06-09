import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineEventList } from '@/components/timeline/timeline-event-list';
import type { TimelineEntry } from '@/lib/ipc/channels';

function makeEntry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    id: 'evt-1',
    domainId: 'domain-1',
    type: 'event',
    title: 'Test Event',
    description: 'A test event',
    date: '2026-06-01T00:00:00Z',
    importance: 'medium',
    sourceNodeId: null,
    metadata: {},
    ...overrides,
  };
}

describe('TimelineEventList', () => {
  it('renders event cards when events exist', () => {
    const events = [makeEntry({ id: 'e1', title: 'Event One' }), makeEntry({ id: 'e2', title: 'Event Two' })];
    render(<TimelineEventList events={events} />);
    expect(screen.getByText('Event One')).toBeInTheDocument();
    expect(screen.getByText('Event Two')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    render(<TimelineEventList events={[]} />);
    expect(screen.getByText('No events on the timeline')).toBeInTheDocument();
  });
});
