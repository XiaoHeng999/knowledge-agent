'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDomainStore } from '@/stores/domain-store';
import { EmptyState } from '@/components/ui/empty-state';

export default function Home() {
  const router = useRouter();
  const domains = useDomainStore((s) => s.domains);
  const fetchDomains = useDomainStore((s) => s.fetchDomains);

  useEffect(() => {
    if (domains.length === 0) {
      fetchDomains();
    }
  }, [domains.length, fetchDomains]);

  const handleCreateDomain = () => {
    router.push('/settings/domains');
  };

  if (domains.length === 0) {
    return (
      <div className="main-content__placeholder">
        <EmptyState
          emoji="🚀"
          title="Welcome to AgentClaw"
          description="Comprehension over retrieval. Create your first domain to start building an intelligent knowledge base."
          action={{
            label: 'Create your first domain',
            onClick: handleCreateDomain,
          }}
        />
      </div>
    );
  }

  return (
    <div className="main-content__placeholder">
      <EmptyState
        emoji="🏠"
        title="Select a domain to get started"
        description="Choose a domain from the sidebar to explore its knowledge, timeline, and research."
      />
    </div>
  );
}
