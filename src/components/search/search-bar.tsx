'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { KnowledgeSearchResult } from '@/lib/ipc/channels';
import { SearchResults } from './search-results';

interface SearchBarProps {
  domainId?: string;
  onResultClick?: (nodeId: string) => void;
  placeholder?: string;
  compact?: boolean;
}

export function SearchBar({
  domainId,
  onResultClick,
  placeholder = 'Search knowledge...',
  compact = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setTotal(0);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      try {
        const response = await window.api.search.search({
          query: searchQuery,
          domainId,
          limit: 10,
        });
        setResults(response.results);
        setTotal(response.total);
        setIsOpen(true);
      } catch (err) {
        console.warn('Search failed:', err);
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [domainId],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => performSearch(value), 200);
    },
    [performSearch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'Enter' && query.trim()) {
        performSearch(query);
      }
    },
    [query, performSearch],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = useCallback(
    (nodeId: string) => {
      setIsOpen(false);
      onResultClick?.(nodeId);
    },
    [onResultClick],
  );

  return (
    <div ref={containerRef} className={`search-bar ${compact ? 'search-bar--compact' : ''}`}>
      <div className="search-bar__input-wrapper">
        <svg className="search-bar__icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
        </svg>
        <input
          type="text"
          className="search-bar__input"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          aria-label="Search knowledge base"
          aria-expanded={isOpen}
          aria-controls="search-results-listbox"
          aria-haspopup="listbox"
          role="combobox"
        />
        {loading && (
          <div className="search-bar__spinner" aria-label="Searching">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="search-bar__spinner-icon">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm.5 1.062a7 7 0 0 1 0 13.876v-1.5a5.5 5.5 0 0 1 0-10.876v-1.5z" />
            </svg>
          </div>
        )}
      </div>

      {isOpen && query.trim() && (
        <div className="search-bar__dropdown" id="search-results-listbox" role="listbox" aria-label="Search results">
          <SearchResults
            results={results}
            total={total}
            query={query}
            onResultClick={handleResultClick}
          />
        </div>
      )}
    </div>
  );
}
