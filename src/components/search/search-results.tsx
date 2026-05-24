'use client';

import type { KnowledgeSearchResult } from '@/lib/ipc/channels';

interface SearchResultsProps {
  results: KnowledgeSearchResult[];
  total: number;
  query: string;
  onResultClick: (nodeId: string) => void;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="search-results__highlight">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function MatchTypeBadge({ type }: { type: KnowledgeSearchResult['matchType'] }) {
  const labels = { vector: 'Semantic', fulltext: 'Text', hybrid: 'Hybrid' };
  const classNames = {
    vector: 'search-results__badge search-results__badge--vector',
    fulltext: 'search-results__badge search-results__badge--fulltext',
    hybrid: 'search-results__badge search-results__badge--hybrid',
  };

  return <span className={classNames[type]}>{labels[type]}</span>;
}

export function SearchResults({ results, total, query, onResultClick }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="search-results__empty">
        <p>No results found for &ldquo;{query}&rdquo;</p>
      </div>
    );
  }

  return (
    <div className="search-results">
      {total > results.length && (
        <div className="search-results__header">
          Showing {results.length} of {total} results
        </div>
      )}
      <ul className="search-results__list" role="listbox">
        {results.map((result) => (
          <li
            key={result.node.id}
            className="search-results__item"
            role="option"
            aria-selected={false}
            onClick={() => onResultClick(result.node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onResultClick(result.node.id);
              }
            }}
            tabIndex={0}
          >
            <div className="search-results__item-header">
              <span className="search-results__item-title">
                {highlightText(result.node.title, query)}
              </span>
              <MatchTypeBadge type={result.matchType} />
            </div>
            {result.node.content && (
              <p className="search-results__item-content">
                {highlightText(truncate(result.node.content, 120), query)}
              </p>
            )}
            <div className="search-results__item-meta">
              <span className="search-results__item-type">{result.node.type}</span>
              <span className="search-results__item-score">
                Score: {result.score.toFixed(3)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}
