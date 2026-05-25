'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDomainStore } from '@/stores/domain-store';
import { useAppStore } from '@/stores/app-store';
import { CreateDomainDialog } from './create-domain-dialog';
import type { DomainInfo } from '@/lib/ipc/channels';

interface DomainListProps {
  collapsed?: boolean;
  onDomainSelect?: (domain: DomainInfo) => void;
}

export function DomainList({ collapsed, onDomainSelect }: DomainListProps) {
  const domains = useDomainStore((s) => s.domains);
  const currentDomainId = useDomainStore((s) => s.currentDomainId);
  const loading = useDomainStore((s) => s.loading);
  const fetchDomains = useDomainStore((s) => s.fetchDomains);
  const setCurrentDomain = useDomainStore((s) => s.setCurrentDomain);
  const setAppCurrentDomain = useAppStore((s) => s.setCurrentDomain);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleSelect = useCallback(
    (domain: DomainInfo) => {
      setCurrentDomain(domain.id);
      setAppCurrentDomain(domain.id);
      onDomainSelect?.(domain);
    },
    [setCurrentDomain, setAppCurrentDomain, onDomainSelect],
  );

  const handleCreated = useCallback(
    (domain: DomainInfo) => {
      handleSelect(domain);
    },
    [handleSelect],
  );

  if (loading && domains.length === 0) {
    return (
      <div className="domain-list domain-list--loading">
        {collapsed ? (
          <div className="domain-list__collapsed-skeleton" />
        ) : (
          <div className="domain-list__skeleton">
            {[1, 2, 3].map((i) => (
              <div key={i} className="domain-list__skeleton-item" />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (collapsed) {
    return (
      <>
        <div className="domain-list domain-list--collapsed">
          {domains.map((domain) => (
            <button
              key={domain.id}
              className={`domain-list__collapsed-item ${currentDomainId === domain.id ? 'domain-list__collapsed-item--active' : ''}`}
              onClick={() => handleSelect(domain)}
              title={domain.name}
              aria-label={domain.name}
            >
              <span
                className="domain-list__dot"
                style={{ backgroundColor: domain.color }}
              />
            </button>
          ))}
          <button
            className="domain-list__collapsed-item domain-list__collapsed-item--add"
            onClick={() => setDialogOpen(true)}
            title="New Domain"
            aria-label="Create new domain"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <CreateDomainDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={handleCreated} />
      </>
    );
  }

  return (
    <>
      <div className="domain-list" role="tree" aria-label="Domains">
        {domains.length === 0 ? (
          <div className="domain-list__empty">
            <p className="domain-list__empty-text">No domains yet</p>
            <button
              className="domain-list__empty-btn"
              onClick={() => setDialogOpen(true)}
            >
              Create your first domain
            </button>
          </div>
        ) : (
          domains.map((domain) => (
            <button
              key={domain.id}
              className={`domain-list__item ${currentDomainId === domain.id ? 'domain-list__item--active' : ''}`}
              onClick={() => handleSelect(domain)}
              aria-current={currentDomainId === domain.id ? 'page' : undefined}
              role="treeitem"
              aria-selected={currentDomainId === domain.id}
            >
              <span
                className="domain-list__dot"
                style={{ backgroundColor: domain.color }}
                aria-hidden="true"
              />
              <span className="domain-list__name">{domain.name}</span>
              {domain.knowledgeCount > 0 && (
                <span className="domain-list__count" aria-label={`${domain.knowledgeCount} knowledge nodes`}>{domain.knowledgeCount}</span>
              )}
            </button>
          ))
        )}
        <button
          className="domain-list__add"
          onClick={() => setDialogOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>New Domain</span>
        </button>
      </div>

      <CreateDomainDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={handleCreated} />
    </>
  );
}
