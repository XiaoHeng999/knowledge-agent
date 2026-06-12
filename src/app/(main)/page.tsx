'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDomainStore } from '@/stores/domain-store';
import { useResearchStore } from '@/stores/research-store';
import { useAppStore } from '@/stores/app-store';
import { useLayout } from '@/components/layout/layout-context';
import { EmptyState } from '@/components/ui/empty-state';
import { ComprehensionRing } from '@/components/knowledge/comprehension-ring';
import { DashboardSkeleton } from '@/components/skeleton/view-skeletons';
import type { DomainInfo, InboxStatsResponse, InboxItem } from '@/lib/ipc/channels';

/* -------------------------------------------------------------------------- */
/*  Data fetching hook                                                        */
/* -------------------------------------------------------------------------- */

interface DashboardData {
  domains: DomainInfo[];
  inboxStats: InboxStatsResponse | null;
  inboxPreview: InboxItem[];
  researchDashboard: {
    todaySummary: string;
    totalCost: number;
    totalRuns: number;
  } | null;
  loading: boolean;
}

function useDashboardData(): DashboardData {
  const domains = useDomainStore((s) => s.domains);
  const fetchDomains = useDomainStore((s) => s.fetchDomains);
  const domainLoading = useDomainStore((s) => s.loading);

  const researchDashboard = useResearchStore((s) => s.dashboard);
  const fetchResearchDashboard = useResearchStore((s) => s.fetchDashboard);

  const [inboxStats, setInboxStats] = useState<InboxStatsResponse | null>(null);
  const [inboxPreview, setInboxPreview] = useState<InboxItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);

  useEffect(() => {
    if (domains.length === 0) {
      fetchDomains();
    }
  }, [domains.length, fetchDomains]);

  useEffect(() => {
    fetchResearchDashboard();
  }, [fetchResearchDashboard]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [stats, list] = await Promise.all([
          window.api.inbox.getStats(),
          window.api.inbox.listItems({ status: 'pending', pageSize: 3 }),
        ]);
        if (mounted) {
          setInboxStats(stats);
          setInboxPreview(list.items);
        }
      } catch (err) {
        console.warn('[Dashboard] Failed to load inbox data:', err);
        useAppStore.getState().setGlobalError('Failed to load dashboard data');
      } finally {
        if (mounted) setInboxLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const researchSummary = useMemo(() => {
    if (!researchDashboard) return null;
    const totalRuns = researchDashboard.recentResearch?.length ?? 0;
    return {
      todaySummary: researchDashboard.todaySummary,
      totalCost: researchDashboard.costTracking?.totalCost ?? 0,
      totalRuns,
    };
  }, [researchDashboard]);

  return {
    domains,
    inboxStats,
    inboxPreview,
    researchDashboard: researchSummary,
    loading: domainLoading || inboxLoading,
  };
}

/* -------------------------------------------------------------------------- */
/*  Stat Card                                                                 */
/* -------------------------------------------------------------------------- */

function StatCard({
  value,
  label,
  accent,
  subtext,
}: {
  value: string | number;
  label: string;
  accent?: string;
  subtext?: string;
}) {
  return (
    <div className="dashboard-stat">
      <span className="dashboard-stat__value" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
      <span className="dashboard-stat__label">{label}</span>
      {subtext && <span className="dashboard-stat__subtext">{subtext}</span>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section Eyebrow                                                           */
/* -------------------------------------------------------------------------- */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <h3 className="dashboard-eyebrow">{children}</h3>;
}

/* -------------------------------------------------------------------------- */
/*  Domain Card (with comprehension ring)                                     */
/* -------------------------------------------------------------------------- */

function DomainCard({ domain }: { domain: DomainInfo }) {
  const router = useRouter();

  const score = domain.knowledgeCount > 0
    ? Math.min(5, Math.max(0, domain.knowledgeCount / 10))
    : 0;

  return (
    <button
      className="dashboard-domain-card"
      style={{ '--domain-color': domain.color } as React.CSSProperties}
      onClick={() => router.push(`/domain?id=${domain.id}`)}
    >
      <div className="dashboard-domain-card__header" />
      <div className="dashboard-domain-card__body">
        <div className="dashboard-domain-card__top">
          <div className="dashboard-domain-card__info">
            <span
              className="dashboard-domain-card__dot"
              style={{ background: domain.color }}
            />
            <span className="dashboard-domain-card__name">{domain.name}</span>
          </div>
          <ComprehensionRing score={score} size={64} strokeWidth={5} />
        </div>
        <div className="dashboard-domain-card__meta">
          <span>{domain.knowledgeCount} nodes</span>
          <span>
            {domain.updatedAt
              ? new Date(domain.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : 'No activity'}
          </span>
        </div>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inbox Preview Card                                                        */
/* -------------------------------------------------------------------------- */

function InboxPreviewCard({
  inboxStats,
  inboxPreview,
  onNavigate,
}: {
  inboxStats: InboxStatsResponse | null;
  inboxPreview: InboxItem[];
  onNavigate: () => void;
}) {
  const pending = inboxStats?.pending ?? 0;

  return (
    <div className="dashboard-inbox">
      <div className="dashboard-inbox__header">
        <SectionEyebrow>Inbox</SectionEyebrow>
        {pending > 0 && <span className="dashboard-inbox__badge">{pending}</span>}
      </div>

      {pending === 0 ? (
        <p className="dashboard-inbox__empty">All caught up</p>
      ) : (
        <ul className="dashboard-inbox__list">
          {inboxPreview.map((item) => (
            <li key={item.id} className="dashboard-inbox__item">
              <p className="dashboard-inbox__summary">{item.summary ?? item.title}</p>
              <span className="dashboard-inbox__source">{item.source}</span>
            </li>
          ))}
        </ul>
      )}

      {pending > 0 && (
        <button className="dashboard-inbox__action" onClick={onNavigate}>
          Review all
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Activity Row                                                              */
/* -------------------------------------------------------------------------- */

function ActivityItem({
  text,
  time,
  type,
}: {
  text: string;
  time: string;
  type: 'research' | 'import' | 'knowledge';
}) {
  return (
    <div className="dashboard-activity__item">
      <span className={`dashboard-activity__dot dashboard-activity__dot--${type}`} />
      <span className="dashboard-activity__text">{text}</span>
      <span className="dashboard-activity__time">{time}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Dashboard Page                                                       */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  const router = useRouter();
  const { viewportBreakpoint } = useLayout();
  const data = useDashboardData();

  const handleNavigateInbox = () => router.push('/inbox');
  const handleCreateDomain = () => router.push('/settings/domains');

  // First-launch: no domains
  if (!data.loading && data.domains.length === 0) {
    return (
      <div className="main-content__placeholder">
        <EmptyState
          emoji="🚀"
          title="Welcome to AgentClaw"
          description="Comprehension over retrieval. Create your first domain to start building an intelligent knowledge base."
          action={{ label: 'Create your first domain', onClick: handleCreateDomain }}
        />
      </div>
    );
  }

  if (data.loading) {
    return <DashboardSkeleton />;
  }

  const pending = data.inboxStats?.pending ?? 0;
  const totalRuns = data.researchDashboard?.totalRuns ?? 0;
  const totalCost = data.researchDashboard?.totalCost ?? 0;
  const totalKnowledge = data.domains.reduce((sum, d) => sum + d.knowledgeCount, 0);

  const isStacked = viewportBreakpoint === 'compact';

  return (
    <div className="dashboard">
      {/* ---- Row 1: Today's Overview (60%) + Inbox (40%) ---- */}
      <div className={`dashboard__row1 ${isStacked ? 'dashboard__row1--stacked' : ''}`}>
        {/* Today's Overview */}
        <div className="dashboard-overview">
          <SectionEyebrow>Today&apos;s Overview</SectionEyebrow>
          <div className="dashboard-overview__stats">
            <StatCard value={pending} label="New items" />
            <StatCard
              value={`$${totalCost.toFixed(2)}`}
              label="Cost"
              accent={totalCost > 1 ? 'var(--warning)' : undefined}
            />
            <StatCard value={totalRuns} label="Runs" />
            <StatCard value={totalKnowledge} label="Knowledge" />
          </div>
          {data.researchDashboard?.todaySummary && (
            <p className="dashboard-overview__summary">
              {data.researchDashboard.todaySummary}
            </p>
          )}
        </div>

        {/* Inbox Preview */}
        <div className="dashboard-inbox-container">
          <InboxPreviewCard
            inboxStats={data.inboxStats}
            inboxPreview={data.inboxPreview}
            onNavigate={handleNavigateInbox}
          />
        </div>
      </div>

      {/* ---- Row 2: Domain Cards ---- */}
      {data.domains.length > 0 && (
        <section className="dashboard__domains">
          <SectionEyebrow>Your Domains</SectionEyebrow>
          <div className="dashboard-domain-grid">
            {data.domains.map((d) => (
              <DomainCard key={d.id} domain={d} />
            ))}
          </div>
        </section>
      )}

      {/* ---- Row 3: Activity Feed ---- */}
      {data.researchDashboard && data.researchDashboard.totalRuns > 0 && (
        <section className="dashboard__activity">
          <SectionEyebrow>Recent Activity</SectionEyebrow>
          <div className="dashboard-activity">
            <ActivityItem
              text="Research completed for your domains"
              time="Just now"
              type="research"
            />
            {totalKnowledge > 0 && (
              <ActivityItem
                text={`${totalKnowledge} knowledge nodes indexed`}
                time="Today"
                type="knowledge"
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
