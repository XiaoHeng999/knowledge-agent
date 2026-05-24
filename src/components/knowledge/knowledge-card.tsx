'use client';

import type { KnowledgeNode } from '@/lib/ipc/channels';
import { ComprehensionIndicator } from './comprehension-indicator';

interface KnowledgeCardProps {
  node: KnowledgeNode;
  selected?: boolean;
  domainColor?: string;
  onClick?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  concept: 'Concept',
  technology: 'Technology',
  person: 'Person',
  event: 'Event',
  decision: 'Decision',
  resource: 'Resource',
  question: 'Question',
};

export function KnowledgeCard({ node, selected, domainColor, onClick }: KnowledgeCardProps) {
  const timeAgo = getRelativeTime(node.updatedAt);

  return (
    <button
      className={`knowledge-card ${selected ? 'knowledge-card--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div className="knowledge-card__header">
        {domainColor && (
          <span
            className="knowledge-card__domain-dot"
            style={{ backgroundColor: domainColor }}
            aria-hidden="true"
          />
        )}
        <span className="knowledge-card__title">{node.title}</span>
      </div>

      <div className="knowledge-card__meta">
        <span className="knowledge-card__type-badge">{TYPE_LABELS[node.type] ?? node.type}</span>
        <ComprehensionIndicator level={node.comprehensionLevel} size="sm" />
        {node.sources.length > 0 && (
          <span className="knowledge-card__source-count">{node.sources.length} sources</span>
        )}
      </div>

      <span className="knowledge-card__time">{timeAgo}</span>
    </button>
  );
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}
