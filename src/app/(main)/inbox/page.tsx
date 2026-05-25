'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useIpcQuery } from '@/lib/hooks/use-ipc';
import type { InboxListResponse, InboxStatsResponse, DomainListResponse, InboxSuggestDomainsResponse, DomainSuggestion } from '@/lib/ipc/channels';
import { InboxItemCard } from '@/components/inbox/inbox-item';
import { EmptyState } from '@/components/ui/empty-state';
import { ViewLoadingState } from '@/components/skeleton/view-loading';

type FilterStatus = 'pending' | 'processed' | 'rejected';

export default function InboxPage() {
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [page, setPage] = useState(1);

  const { data: stats, refetch: refetchStats } = useIpcQuery<InboxStatsResponse>(
    () => window.api.inbox.getStats(),
    [],
  );

  const { data: domainsData } = useIpcQuery<DomainListResponse>(
    () => window.api.domain.list(),
    [],
  );

  const { data: listData, loading, refetch } = useIpcQuery<InboxListResponse>(
    () => window.api.inbox.listItems({ status: filter, page, pageSize: 20 }),
    [filter, page],
  );

  const refresh = useCallback(() => {
    refetch();
    refetchStats();
  }, [refetch, refetchStats]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAccept = useCallback(
    async (itemId: string, domainId: string) => {
      await window.api.inbox.processItem({ id: itemId, domainId });
      refresh();
    },
    [refresh],
  );

  const handleReject = useCallback(
    async (itemId: string) => {
      await window.api.inbox.rejectItem({ id: itemId });
      refresh();
    },
    [refresh],
  );

  const handleEdit = useCallback((_itemId: string) => {
    // Edit will be a future enhancement — for now, items can be accepted or rejected
  }, []);

  const fetchSuggestions = useCallback(
    async (itemId: string) => {
      try {
        const result = await window.api.inbox.suggestDomains({ itemId });
        return result.suggestions;
      } catch {
        return [];
      }
    },
    [],
  );

  const items = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const domains = domainsData?.domains ?? [];
  const pendingCount = stats?.pending ?? 0;
  const processedCount = stats?.processed ?? 0;
  const rejectedCount = stats?.rejected ?? 0;
  const totalPages = Math.ceil(total / 20);

  // Track suggestions per item (fetched on expand)
  const suggestionsRef = useRef<Record<string, DomainSuggestion[]>>({});
  const [suggestionsVersion, setSuggestionsVersion] = useState(0);

  const handleItemExpand = useCallback(
    async (itemId: string) => {
      if (suggestionsRef.current[itemId]) return;
      const suggestions = await fetchSuggestions(itemId);
      suggestionsRef.current[itemId] = suggestions;
      setSuggestionsVersion((v) => v + 1);
    },
    [fetchSuggestions],
  );

  return (
    <ViewLoadingState
      view="inbox"
      isLoading={loading && items.length === 0}
      onRetry={refresh}
      onCancel={() => setFilter('pending')}
    >
      <div className="inbox-page">
        <div className="inbox-page__header">
          <h1 className="inbox-page__title">Inbox</h1>
          <span className="inbox-page__count">{pendingCount} pending</span>
        </div>

        <div className="inbox-page__filters">
          <button
            className={`inbox-page__filter-btn ${filter === 'pending' ? 'inbox-page__filter-btn--active' : ''}`}
            onClick={() => { setFilter('pending'); setPage(1); }}
          >
            Pending {pendingCount > 0 && <span className="inbox-page__filter-badge">{pendingCount}</span>}
          </button>
          <button
            className={`inbox-page__filter-btn ${filter === 'processed' ? 'inbox-page__filter-btn--active' : ''}`}
            onClick={() => { setFilter('processed'); setPage(1); }}
          >
            Processed {processedCount > 0 && <span className="inbox-page__filter-badge">{processedCount}</span>}
          </button>
          <button
            className={`inbox-page__filter-btn ${filter === 'rejected' ? 'inbox-page__filter-btn--active' : ''}`}
            onClick={() => { setFilter('rejected'); setPage(1); }}
          >
            Rejected {rejectedCount > 0 && <span className="inbox-page__filter-badge">{rejectedCount}</span>}
          </button>
        </div>

        <div className="inbox-page__list">
          {items.length === 0 ? (
          <EmptyState
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z" />
              </svg>
            }
            title={
              filter === 'pending'
                ? 'Inbox is empty'
                : filter === 'processed'
                  ? 'No processed items'
                  : 'No rejected items'
            }
            description={
              filter === 'pending'
                ? 'Import content or use Quick Record to add items to your inbox for processing.'
                : 'Items will appear here after you process or reject them.'
            }
          />
        ) : (
          items.map((item) => (
            <InboxItemCard
              key={item.id}
              item={item}
              domains={domains}
              suggestions={suggestionsRef.current[item.id] ?? []}
              onAccept={handleAccept}
              onReject={handleReject}
              onEdit={handleEdit}
              onClick={() => handleItemExpand(item.id)}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="inbox-page__pagination">
          <button
            className="inbox-page__page-btn"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span className="inbox-page__page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="inbox-page__page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
    </ViewLoadingState>
  );
}
