'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useKnowledgeStore } from '@/stores/knowledge-store';
import { useDomainStore } from '@/stores/domain-store';
import { useLayout } from '@/components/layout/layout-context';
import { KnowledgeCard } from '@/components/knowledge/knowledge-card';
import { KnowledgeDetail } from '@/components/knowledge/knowledge-detail';
import { KnowledgeForm } from '@/components/knowledge/knowledge-form';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'concept', label: 'Concept' },
  { value: 'technology', label: 'Technology' },
  { value: 'person', label: 'Person' },
  { value: 'event', label: 'Event' },
  { value: 'decision', label: 'Decision' },
  { value: 'resource', label: 'Resource' },
  { value: 'question', label: 'Question' },
];

export default function DomainKnowledgePage() {
  const searchParams = useSearchParams();
  const domainId = searchParams.get('id') ?? '';

  const { openPanel, closePanel } = useLayout();

  const nodes = useKnowledgeStore((s) => s.nodes);
  const total = useKnowledgeStore((s) => s.total);
  const loading = useKnowledgeStore((s) => s.loading);
  const selectedNodeId = useKnowledgeStore((s) => s.selectedNodeId);
  const filters = useKnowledgeStore((s) => s.filters);
  const fetchNodes = useKnowledgeStore((s) => s.fetchNodes);
  const createNode = useKnowledgeStore((s) => s.createNode);
  const deleteNode = useKnowledgeStore((s) => s.deleteNode);
  const selectNode = useKnowledgeStore((s) => s.selectNode);
  const setFilters = useKnowledgeStore((s) => s.setFilters);

  const domains = useDomainStore((s) => s.domains);
  const fetchDomains = useDomainStore((s) => s.fetchDomains);

  const [showForm, setShowForm] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const currentDomain = domains.find((d) => d.id === domainId);

  useEffect(() => {
    if (domains.length === 0) fetchDomains();
  }, [domains.length, fetchDomains]);

  useEffect(() => {
    if (domainId) {
      fetchNodes(domainId, { page: 1 });
    }
  }, [domainId, fetchNodes]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteNode(id);
      closePanel();
    },
    [deleteNode, closePanel],
  );

  const handleCardClick = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      const state = useKnowledgeStore.getState();
      const node = state.nodes.find((n) => n.id === nodeId);
      if (node) {
        openPanel('knowledge-detail', 320, (
          <KnowledgeDetail
            node={node}
            edges={state.edges}
            onEdit={() => setShowForm(true)}
            onDelete={() => handleDelete(node.id)}
            onNodeClick={(nid) => handleCardClick(nid)}
          />
        ));
      }
    },
    [selectNode, openPanel, handleDelete],
  );

  const handleCreate = useCallback(
    async (data: { domainId: string; title: string; type: string; content: string; sources?: string[] }) => {
      const node = await createNode(data);
      setShowForm(false);
      selectNode(node.id);
      openPanel('knowledge-detail', 320, (
        <KnowledgeDetail
          node={node}
          edges={[]}
          onEdit={() => setShowForm(true)}
          onDelete={() => handleDelete(node.id)}
          onNodeClick={(nid) => handleCardClick(nid)}
        />
      ));
    },
    [createNode, selectNode, openPanel, handleDelete, handleCardClick],
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      setFilters({ search: value || undefined, page: 1 });
      fetchNodes(domainId, { search: value || undefined, page: 1 });
    },
    [domainId, fetchNodes, setFilters],
  );

  const handleTypeFilter = useCallback(
    (value: string) => {
      setFilters({ type: value || undefined, page: 1 });
      fetchNodes(domainId, { type: value || undefined, page: 1 });
    },
    [domainId, fetchNodes, setFilters],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setFilters({ page });
      fetchNodes(domainId, { page });
    },
    [domainId, fetchNodes, setFilters],
  );

  const totalPages = Math.ceil(total / filters.pageSize);

  if (!domainId) {
    return (
      <div className="knowledge-page">
        <EmptyState
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          title="Select a domain"
          description="Choose a domain from the sidebar to view its knowledge base."
        />
      </div>
    );
  }

  return (
    <div className="knowledge-page">
      <div className="knowledge-page__header">
        <div className="knowledge-page__header-left">
          {currentDomain && (
            <span
              className="knowledge-page__domain-dot"
              style={{ backgroundColor: currentDomain.color }}
              aria-hidden="true"
            />
          )}
          <h1 className="knowledge-page__title">
            {currentDomain?.name ?? 'Domain'} Knowledge
          </h1>
          <span className="knowledge-page__count">{total} items</span>
        </div>
        <button
          className="knowledge-page__create-btn"
          onClick={() => setShowForm(true)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Add Knowledge
        </button>
      </div>

      <div className="knowledge-page__toolbar">
        <div className="knowledge-page__search">
          <svg className="knowledge-page__search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
          </svg>
          <input
            className="knowledge-page__search-input"
            type="text"
            placeholder="Search knowledge..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="knowledge-page__type-filter"
          value={filters.type ?? ''}
          onChange={(e) => handleTypeFilter(e.target.value)}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="knowledge-page__form-container">
          <KnowledgeForm
            domainId={domainId}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="knowledge-page__list">
        {loading && nodes.length === 0 ? (
          <div className="knowledge-page__skeleton">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} variant="card" />
            ))}
          </div>
        ) : nodes.length === 0 ? (
          <EmptyState
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            title="No knowledge yet"
            description="Start building your knowledge base by adding your first knowledge node."
            action={{
              label: 'Add Knowledge',
              onClick: () => setShowForm(true),
              icon: (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ),
            }}
          />
        ) : (
          nodes.map((node) => (
            <KnowledgeCard
              key={node.id}
              node={node}
              selected={node.id === selectedNodeId}
              domainColor={currentDomain?.color}
              onClick={() => handleCardClick(node.id)}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="knowledge-page__pagination">
          <button
            className="knowledge-page__page-btn"
            disabled={filters.page <= 1}
            onClick={() => handlePageChange(filters.page - 1)}
          >
            Previous
          </button>
          <span className="knowledge-page__page-info">
            Page {filters.page} of {totalPages}
          </span>
          <button
            className="knowledge-page__page-btn"
            disabled={filters.page >= totalPages}
            onClick={() => handlePageChange(filters.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
