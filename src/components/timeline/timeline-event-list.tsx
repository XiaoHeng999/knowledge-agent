'use client';

import { TimelineEventCard } from '@/components/timeline/timeline-event-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { TimelineEntry } from '@/lib/ipc/channels';

interface TimelineEventListProps {
  events: TimelineEntry[];
  onTriggerResearch?: () => void;
}

export function TimelineEventList({ events, onTriggerResearch }: TimelineEventListProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        emoji="📅"
        title="No events on the timeline"
        description="As your knowledge base grows, key events and predictions will appear here."
        action={{
          label: 'Run research to discover events',
          onClick: onTriggerResearch ?? (() => {}),
        }}
        secondaryAction={{
          label: 'Timeline updates automatically →',
          onClick: () => {},
        }}
      />
    );
  }

  return (
    <div className="timeline-page__timeline">
      {events.map((entry) => (
        <TimelineEventCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
