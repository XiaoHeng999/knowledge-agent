'use client';

import {
  Skeleton,
  SkeletonCircle,
  SkeletonLine,
  SkeletonHeading,
  SkeletonCard,
  SkeletonPill,
  SkeletonMetric,
  SkeletonRow,
  SkeletonSection,
} from '@/components/ui/skeleton';

/* =========================================================================
   1. Dashboard Skeleton
   ========================================================================= */

export function DashboardSkeleton() {
  return (
    <SkeletonSection className="sk-dashboard" gap={16}>
      <SkeletonHeading width="40%" />

      {/* Row 1: Today Overview (60%) + Inbox Summary (40%) */}
      <div className="sk-dashboard__row">
        <div className="sk-dashboard__overview">
          <SkeletonRow gap={8}>
            <SkeletonMetric />
          </SkeletonRow>
          <SkeletonSection gap={6}>
            <SkeletonLine width="90%" />
            <SkeletonLine width="75%" />
            <SkeletonLine width="60%" />
          </SkeletonSection>
        </div>
        <div className="sk-dashboard__inbox-summary">
          <SkeletonRow gap={8}>
            <SkeletonCircle size={20} />
            <SkeletonLine width="60%" />
          </SkeletonRow>
          <SkeletonSection gap={6}>
            <SkeletonCard height={48} />
            <SkeletonCard height={48} />
            <SkeletonCard height={48} />
          </SkeletonSection>
        </div>
      </div>

      {/* Domain Activity */}
      <div className="sk-dashboard__activity">
        <SkeletonLine width="50%" />
        <SkeletonSection gap={8}>
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} gap={8}>
              <SkeletonCircle size={12} />
              <SkeletonLine width="45%" />
              <SkeletonLine width="25%" />
            </SkeletonRow>
          ))}
        </SkeletonSection>
      </div>

      {/* Recent Decisions */}
      <div className="sk-dashboard__decisions">
        <SkeletonLine width="45%" />
        <SkeletonSection gap={6}>
          <SkeletonRow gap={8}>
            <SkeletonLine width="65%" />
            <SkeletonLine width="20%" />
          </SkeletonRow>
          <SkeletonRow gap={8}>
            <SkeletonLine width="55%" />
            <SkeletonLine width="20%" />
          </SkeletonRow>
        </SkeletonSection>
      </div>
    </SkeletonSection>
  );
}

/* =========================================================================
   2. Knowledge List Skeleton
   ========================================================================= */

export function KnowledgeListSkeleton() {
  return (
    <SkeletonSection className="sk-knowledge" gap={12}>
      {/* Header */}
      <SkeletonRow gap={8}>
        <SkeletonHeading width="35%" />
        <SkeletonRow gap={4}>
          <SkeletonPill width={48} />
          <SkeletonPill width={48} />
        </SkeletonRow>
        <div style={{ flex: 1 }} />
        <SkeletonCircle size={28} />
        <SkeletonPill width={72} />
      </SkeletonRow>

      {/* Filters */}
      <SkeletonRow gap={8}>
        <SkeletonPill width={80} />
        <SkeletonPill width={80} />
        <SkeletonPill width={80} />
      </SkeletonRow>

      {/* 4 Knowledge Cards */}
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} height={96}>
          <div className="sk-knowledge__card">
            <SkeletonRow gap={8}>
              <SkeletonHeading width="55%" />
              <div style={{ flex: 1 }} />
              <SkeletonPill width={56} />
            </SkeletonRow>
            <SkeletonRow gap={4}>
              {[0, 1, 2, 3, 4].map((d) => (
                <SkeletonCircle key={d} size={8} />
              ))}
              <SkeletonLine width="15%" />
              <span style={{ color: 'var(--border)' }}>|</span>
              <SkeletonLine width="12%" />
              <span style={{ color: 'var(--border)' }}>|</span>
              <SkeletonLine width="15%" />
            </SkeletonRow>
            <SkeletonLine width="80%" />
          </div>
        </SkeletonCard>
      ))}
    </SkeletonSection>
  );
}

/* =========================================================================
   3. Timeline Skeleton
   ========================================================================= */

export function TimelineSkeleton() {
  return (
    <SkeletonSection className="sk-timeline" gap={16}>
      {/* Header */}
      <SkeletonRow gap={8}>
        <SkeletonHeading width="30%" />
        <div style={{ flex: 1 }} />
        <SkeletonPill width={72} />
        <SkeletonCircle size={28} />
      </SkeletonRow>

      {/* Month heading */}
      <SkeletonLine width="25%" />

      {/* Event items */}
      <div className="sk-timeline__events">
        {[0, 1, 2].map((i) => (
          <div key={i} className="sk-timeline__event">
            <SkeletonCircle size={10} />
            <SkeletonSection gap={4} style={{ flex: 1 }}>
              <SkeletonRow gap={8}>
                <SkeletonLine width="20%" />
                <SkeletonLine width="55%" />
                <SkeletonPill width={40} />
              </SkeletonRow>
              <SkeletonLine width="35%" />
            </SkeletonSection>
          </div>
        ))}

        {/* Dashed separator for predictions */}
        <div className="sk-timeline__separator" />

        {[3, 4].map((i) => (
          <div key={i} className="sk-timeline__event">
            <SkeletonCircle size={10} />
            <SkeletonSection gap={4} style={{ flex: 1 }}>
              <SkeletonRow gap={8}>
                <SkeletonLine width="20%" />
                <SkeletonLine width="50%" />
                <SkeletonLine width="15%" />
              </SkeletonRow>
              <SkeletonLine width="30%" />
            </SkeletonSection>
          </div>
        ))}
      </div>
    </SkeletonSection>
  );
}

/* =========================================================================
   4. Research Dashboard Skeleton
   ========================================================================= */

export function ResearchDashboardSkeleton() {
  return (
    <SkeletonSection className="sk-research" gap={16}>
      {/* Header */}
      <SkeletonRow gap={8}>
        <SkeletonHeading width="35%" />
        <div style={{ flex: 1 }} />
        <SkeletonPill width={96} />
      </SkeletonRow>

      {/* Today's Research */}
      <div className="sk-research__section">
        <SkeletonLine width="40%" />
        <SkeletonSection gap={8}>
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} gap={8}>
              <SkeletonCircle size={20} />
              <SkeletonLine width="45%" />
              <SkeletonLine width="15%" />
              <span style={{ color: 'var(--border)' }}>|</span>
              <SkeletonLine width="10%" />
              <span style={{ color: 'var(--border)' }}>|</span>
              <SkeletonLine width="8%" />
            </SkeletonRow>
          ))}
        </SkeletonSection>
      </div>

      {/* Latest Findings */}
      <div className="sk-research__section">
        <SkeletonLine width="35%" />
        {[0, 1].map((i) => (
          <div key={i} className="sk-research__finding-group">
            <SkeletonRow gap={8}>
              <SkeletonCircle size={10} />
              <SkeletonLine width="40%" />
            </SkeletonRow>
            <SkeletonSection gap={4} style={{ paddingLeft: 18 }}>
              <SkeletonLine width="85%" />
              <SkeletonLine width="75%" />
              {i === 0 && <SkeletonLine width="50%" />}
              <SkeletonLine width="30%" />
            </SkeletonSection>
          </div>
        ))}
      </div>

      {/* Cost Summary */}
      <div className="sk-research__section">
        <SkeletonLine width="30%" />
        <SkeletonRow gap={16}>
          <SkeletonMetric />
          <SkeletonMetric />
          <SkeletonMetric />
        </SkeletonRow>
        <SkeletonLine width="45%" />
      </div>
    </SkeletonSection>
  );
}

/* =========================================================================
   5. Expert Chat Skeleton
   ========================================================================= */

export function ExpertChatSkeleton() {
  return (
    <SkeletonSection className="sk-chat" gap={12}>
      {/* Header */}
      <SkeletonRow gap={8}>
        <SkeletonHeading width="35%" />
        <div style={{ flex: 1 }} />
        <SkeletonPill width={100} />
      </SkeletonRow>

      {/* Message area */}
      <div className="sk-chat__messages">
        {/* AI message */}
        <div className="sk-chat__msg sk-chat__msg--ai">
          <SkeletonRow gap={8}>
            <SkeletonCircle size={28} />
            <SkeletonSection gap={4} style={{ flex: 1 }}>
              <SkeletonLine width="80%" />
              <SkeletonLine width="60%" />
            </SkeletonSection>
          </SkeletonRow>
        </div>

        {/* User message */}
        <div className="sk-chat__msg sk-chat__msg--user">
          <SkeletonSection gap={4} style={{ alignItems: 'flex-end' }}>
            <SkeletonLine width="75%" />
            <SkeletonLine width="55%" />
          </SkeletonSection>
        </div>

        {/* AI message */}
        <div className="sk-chat__msg sk-chat__msg--ai">
          <SkeletonRow gap={8}>
            <SkeletonCircle size={28} />
            <SkeletonSection gap={4} style={{ flex: 1 }}>
              <SkeletonLine width="80%" />
              <SkeletonLine width="65%" />
              <SkeletonLine width="50%" />
            </SkeletonSection>
          </SkeletonRow>
        </div>
      </div>

      {/* Input area */}
      <div className="sk-chat__input">
        <Skeleton height={44} width="100%" radius={8} />
        <SkeletonCircle size={32} />
      </div>
    </SkeletonSection>
  );
}

/* =========================================================================
   6. Inbox Skeleton
   ========================================================================= */

export function InboxSkeleton() {
  return (
    <SkeletonSection className="sk-inbox" gap={12}>
      {/* Header */}
      <SkeletonRow gap={8}>
        <SkeletonHeading width="25%" />
        <SkeletonLine width="15%" />
        <div style={{ flex: 1 }} />
        <SkeletonPill width={72} />
        <SkeletonPill width={56} />
      </SkeletonRow>

      {/* Filter tabs */}
      <SkeletonRow gap={8}>
        <SkeletonPill width={80} />
        <SkeletonPill width={80} />
        <SkeletonPill width={80} />
      </SkeletonRow>

      {/* 5 Inbox items */}
      {[0, 1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} height={120}>
          <div className="sk-inbox__item">
            <SkeletonRow gap={8}>
              <SkeletonCircle size={20} />
              <SkeletonHeading width="65%" />
            </SkeletonRow>
            <SkeletonSection gap={4}>
              <SkeletonLine width="90%" />
              <SkeletonLine width="70%" />
            </SkeletonSection>
            <SkeletonLine width="25%" />
            <SkeletonRow gap={8}>
              <SkeletonPill width={72} />
              <SkeletonPill width={72} />
              <SkeletonPill width={56} />
            </SkeletonRow>
          </div>
        </SkeletonCard>
      ))}
    </SkeletonSection>
  );
}

/* =========================================================================
   7. Domain Overview Skeleton
   ========================================================================= */

export function DomainOverviewSkeleton() {
  return (
    <SkeletonSection className="sk-domain" gap={12}>
      {/* Domain header */}
      <SkeletonRow gap={8}>
        <SkeletonCircle size={16} />
        <SkeletonHeading width="40%" />
        <div style={{ flex: 1 }} />
        <SkeletonPill width={56} />
        <SkeletonPill width={64} />
      </SkeletonRow>

      {/* Info section */}
      <SkeletonSection gap={6}>
        <SkeletonLine width="90%" />
        <SkeletonRow gap={12}>
          <SkeletonLine width="25%" />
          <SkeletonLine width="30%" />
        </SkeletonRow>
        <SkeletonRow gap={12}>
          <SkeletonLine width="20%" />
          <SkeletonLine width="35%" />
        </SkeletonRow>
      </SkeletonSection>

      {/* Tab bar */}
      <SkeletonRow gap={6}>
        {[72, 72, 56, 56, 72].map((w, i) => (
          <SkeletonPill key={i} width={w} />
        ))}
      </SkeletonRow>

      {/* Content area delegates to knowledge list skeleton pattern */}
      <KnowledgeListSkeleton />
    </SkeletonSection>
  );
}

/* =========================================================================
   8. Knowledge Graph Skeleton
   ========================================================================= */

export function KnowledgeGraphSkeleton() {
  return (
    <SkeletonSection className="sk-graph" gap={12}>
      {/* Header */}
      <SkeletonRow gap={8}>
        <SkeletonHeading width="30%" />
        <SkeletonRow gap={4}>
          <SkeletonPill width={48} />
          <SkeletonPill width={48} />
        </SkeletonRow>
        <SkeletonCircle size={28} />
        <SkeletonPill width={72} />
      </SkeletonRow>

      {/* Graph nodes area */}
      <div className="sk-graph__canvas">
        {/* Central node */}
        <div className="sk-graph__node sk-graph__node--center">
          <Skeleton height={48} width={48} radius={6} />
          <SkeletonRow gap={2} style={{ justifyContent: 'center', marginTop: 4 }}>
            {[0, 1, 2, 3, 4].map((d) => (
              <SkeletonCircle key={d} size={4} />
            ))}
          </SkeletonRow>
        </div>

        {/* Connected nodes */}
        <div className="sk-graph__node sk-graph__node--left">
          <Skeleton height={40} width={40} radius={6} />
          <SkeletonRow gap={2} style={{ justifyContent: 'center', marginTop: 4 }}>
            {[0, 1, 2, 3].map((d) => (
              <SkeletonCircle key={d} size={4} />
            ))}
          </SkeletonRow>
        </div>

        <div className="sk-graph__node sk-graph__node--right">
          <Skeleton height={56} width={56} radius={6} />
          <SkeletonRow gap={2} style={{ justifyContent: 'center', marginTop: 4 }}>
            {[0, 1, 2, 3].map((d) => (
              <SkeletonCircle key={d} size={4} />
            ))}
          </SkeletonRow>
        </div>

        <div className="sk-graph__node sk-graph__node--bottom-left">
          <Skeleton height={36} width={36} radius={6} />
          <SkeletonRow gap={2} style={{ justifyContent: 'center', marginTop: 4 }}>
            {[0, 1, 2].map((d) => (
              <SkeletonCircle key={d} size={4} />
            ))}
          </SkeletonRow>
        </div>

        <div className="sk-graph__node sk-graph__node--bottom-right">
          <Skeleton height={44} width={44} radius={6} />
          <SkeletonRow gap={2} style={{ justifyContent: 'center', marginTop: 4 }}>
            {[0, 1, 2, 3, 4].map((d) => (
              <SkeletonCircle key={d} size={4} />
            ))}
          </SkeletonRow>
        </div>

        {/* Connection lines drawn with CSS */}
        <div className="sk-graph__connections" />
      </div>

      {/* Legend bar */}
      <SkeletonRow gap={12}>
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonRow key={i} gap={4}>
            <SkeletonCircle size={8} />
            <SkeletonLine width="40px" />
          </SkeletonRow>
        ))}
      </SkeletonRow>

      {/* Control bar */}
      <SkeletonRow gap={8}>
        <SkeletonCircle size={28} />
        <SkeletonCircle size={28} />
        <SkeletonCircle size={28} />
        <SkeletonPill width={72} />
        <SkeletonPill width={72} />
        <SkeletonPill width={72} />
      </SkeletonRow>
    </SkeletonSection>
  );
}

/* =========================================================================
   9. Settings Skeleton
   ========================================================================= */

export function SettingsSkeleton() {
  return (
    <SkeletonSection className="sk-settings" gap={16}>
      {/* Header */}
      <SkeletonHeading width="25%" />

      {/* Tab bar */}
      <SkeletonRow gap={8}>
        {[72, 72, 64, 56].map((w, i) => (
          <SkeletonPill key={i} width={w} />
        ))}
      </SkeletonRow>

      {/* Section 1: Input fields */}
      <div className="sk-settings__section">
        <SkeletonHeading width="40%" />
        <SkeletonLine width="80%" />
        <SkeletonRow gap={8}>
          <Skeleton height={36} width="100%" radius={4} />
          <SkeletonPill width={56} />
        </SkeletonRow>
        <SkeletonLine width="70%" />
        <SkeletonRow gap={8}>
          <Skeleton height={36} width="100%" radius={4} />
          <SkeletonPill width={56} />
        </SkeletonRow>
      </div>

      {/* Section 2: List items */}
      <div className="sk-settings__section">
        <SkeletonHeading width="35%" />
        <SkeletonLine width="75%" />
        <SkeletonSection gap={8}>
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} gap={8}>
              <SkeletonCircle size={16} />
              <SkeletonLine width="55%" />
              <SkeletonPill width={48} />
              <SkeletonPill width={48} />
              <SkeletonPill width={48} />
            </SkeletonRow>
          ))}
        </SkeletonSection>
      </div>

      {/* Section 3: Toggles */}
      <div className="sk-settings__section">
        <SkeletonHeading width="30%" />
        <SkeletonLine width="65%" />
        {[0, 1, 2].map((i) => (
          <SkeletonRow key={i} gap={8}>
            <SkeletonCircle size={14} />
            <SkeletonLine width="45%" />
          </SkeletonRow>
        ))}
      </div>

      {/* Section 4: Info row */}
      <div className="sk-settings__section">
        <SkeletonHeading width="25%" />
        <SkeletonRow gap={8}>
          <SkeletonLine width="60%" />
          <SkeletonCircle size={20} />
        </SkeletonRow>
      </div>
    </SkeletonSection>
  );
}
