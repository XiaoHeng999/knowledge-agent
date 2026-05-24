'use client';

import { useState } from 'react';
import type { InboxItem, DomainInfo, DomainSuggestion } from '@/lib/ipc/channels';

interface InboxItemCardProps {
  item: InboxItem;
  domains: DomainInfo[];
  suggestions?: DomainSuggestion[];
  selected?: boolean;
  onClick?: () => void;
  onAccept?: (itemId: string, domainId: string) => Promise<void>;
  onReject?: (itemId: string) => Promise<void>;
  onEdit?: (itemId: string) => void;
}

const SOURCE_ICONS: Record<string, { label: string; color: string }> = {
  url: { label: 'URL', color: '#3b82f6' },
  pdf: { label: 'PDF', color: '#ef4444' },
  note: { label: 'Note', color: '#8b5cf6' },
  rss: { label: 'RSS', color: '#f59e0b' },
  import: { label: 'Import', color: '#10b981' },
};

export function InboxItemCard({
  item,
  domains,
  suggestions = [],
  selected,
  onClick,
  onAccept,
  onReject,
  onEdit,
}: InboxItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string>(
    suggestions[0]?.domainId ?? '',
  );
  const [processing, setProcessing] = useState(false);

  const sourceInfo = SOURCE_ICONS[item.source] ?? { label: item.source, color: '#6b7280' };
  const timeAgo = getRelativeTime(item.createdAt);
  const isPending = item.status === 'pending';

  const handleAccept = async () => {
    if (!selectedDomainId || !onAccept) return;
    setProcessing(true);
    try {
      await onAccept(item.id, selectedDomainId);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setProcessing(true);
    try {
      await onReject(item.id);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className={`inbox-item ${selected ? 'inbox-item--selected' : ''}`}
      role="article"
      aria-label={`Inbox item: ${item.title}`}
    >
      <button
        className="inbox-item__header"
        onClick={() => {
          setExpanded(!expanded);
          onClick?.();
        }}
        aria-expanded={expanded}
      >
        <span
          className="inbox-item__source-badge"
          style={{ backgroundColor: sourceInfo.color }}
          aria-label={`Source type: ${sourceInfo.label}`}
        >
          {sourceInfo.label}
        </span>
        <span className="inbox-item__title">{item.title}</span>
        <span className="inbox-item__time">{timeAgo}</span>
      </button>

      {expanded && (
        <div className="inbox-item__body">
          <div className="inbox-item__content">
            {item.summary ? (
              <div className="inbox-item__summary">{item.summary}</div>
            ) : (
              <div className="inbox-item__raw">
                {item.content.slice(0, 300)}
                {item.content.length > 300 ? '...' : ''}
              </div>
            )}
          </div>

          {isPending && (
            <div className="inbox-item__actions">
              {suggestions.length > 0 && (
                <div className="inbox-item__suggestions">
                  <span className="inbox-item__suggestions-label">Suggested domains:</span>
                  <div className="inbox-item__suggestion-chips">
                    {suggestions.map((s) => (
                      <button
                        key={s.domainId}
                        className={`inbox-item__suggestion-chip ${selectedDomainId === s.domainId ? 'inbox-item__suggestion-chip--selected' : ''}`}
                        onClick={() => setSelectedDomainId(s.domainId)}
                        aria-label={`${s.domainName} — ${s.confidence}% match`}
                      >
                        <span
                          className="inbox-item__suggestion-dot"
                          style={{ backgroundColor: s.domainColor }}
                        />
                        {s.domainName}
                        <span className="inbox-item__suggestion-confidence">{s.confidence}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="inbox-item__domain-select">
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  className="inbox-item__select"
                  aria-label="Select target domain"
                >
                  <option value="">Select domain...</option>
                  {suggestions.length > 0 && (
                    <optgroup label="Suggested">
                      {suggestions.map((s) => (
                        <option key={s.domainId} value={s.domainId}>
                          {s.domainName} ({s.confidence}%)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="inbox-item__buttons">
                <button
                  className="inbox-item__btn inbox-item__btn--accept"
                  disabled={!selectedDomainId || processing}
                  onClick={handleAccept}
                  aria-label="Accept into domain"
                >
                  {processing ? 'Processing...' : 'Accept'}
                </button>
                <button
                  className="inbox-item__btn inbox-item__btn--edit"
                  disabled={processing}
                  onClick={() => onEdit?.(item.id)}
                  aria-label="Edit item"
                >
                  Edit
                </button>
                <button
                  className="inbox-item__btn inbox-item__btn--reject"
                  disabled={processing}
                  onClick={handleReject}
                  aria-label="Reject item"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {!isPending && (
            <div className="inbox-item__status">
              {item.status === 'processed' && (
                <span className="inbox-item__status-tag inbox-item__status-tag--processed">
                  Processed
                </span>
              )}
              {item.status === 'rejected' && (
                <span className="inbox-item__status-tag inbox-item__status-tag--rejected">
                  Rejected
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
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
