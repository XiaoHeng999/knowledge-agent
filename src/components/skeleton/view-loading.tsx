'use client';

import { useLoadingState } from '@/lib/hooks/use-skeleton';
import { LoadingTimeout } from '@/components/ui/loading-timeout';
import {
  DashboardSkeleton,
  KnowledgeListSkeleton,
  KnowledgeGraphSkeleton,
  TimelineSkeleton,
  ResearchDashboardSkeleton,
  ExpertChatSkeleton,
  InboxSkeleton,
  DomainOverviewSkeleton,
  SettingsSkeleton,
} from '@/components/skeleton/view-skeletons';

type ViewName =
  | 'dashboard'
  | 'knowledge'
  | 'graph'
  | 'timeline'
  | 'research'
  | 'chat'
  | 'inbox'
  | 'domain'
  | 'settings';

const VIEW_THRESHOLDS: Record<ViewName, number> = {
  dashboard: 100,
  knowledge: 100,
  graph: 200,
  timeline: 100,
  research: 100,
  chat: 100,
  inbox: 100,
  domain: 100,
  settings: 50,
};

const VIEW_TIMEOUT_MESSAGES: Record<ViewName, { headline: string; description: string }> = {
  dashboard: {
    headline: 'Dashboard is taking longer than expected',
    description: 'Your overview data might still be loading. This can happen when the database is processing a large import.',
  },
  knowledge: {
    headline: 'Knowledge data is loading slowly',
    description: 'This might be due to a large knowledge base. Try filtering to a specific domain.',
  },
  graph: {
    headline: 'Graph rendering is taking a while',
    description: 'Large graphs with many nodes can take time. Consider switching to list view while waiting.',
  },
  timeline: {
    headline: 'Timeline events are loading slowly',
    description: 'This can happen when processing many time-based events. The data will appear shortly.',
  },
  research: {
    headline: 'Research data is loading slowly',
    description: 'Research results might still be processing. Check the status bar for live progress.',
  },
  chat: {
    headline: 'Chat is slow to respond',
    description: 'The AI model might be experiencing high load. Your message will be sent when ready.',
  },
  inbox: {
    headline: 'Inbox is loading slowly',
    description: 'Your inbox items are still being fetched. They\'ll appear here shortly.',
  },
  domain: {
    headline: 'Domain data is loading slowly',
    description: 'This domain\'s information is taking longer to load than expected.',
  },
  settings: {
    headline: 'Settings are loading slowly',
    description: 'This is unusual — settings load from local storage. Try restarting the app.',
  },
};

const SKELETON_COMPONENTS: Record<ViewName, React.ComponentType> = {
  dashboard: DashboardSkeleton,
  knowledge: KnowledgeListSkeleton,
  graph: KnowledgeGraphSkeleton,
  timeline: TimelineSkeleton,
  research: ResearchDashboardSkeleton,
  chat: ExpertChatSkeleton,
  inbox: InboxSkeleton,
  domain: DomainOverviewSkeleton,
  settings: SettingsSkeleton,
};

interface ViewLoadingStateProps {
  view: ViewName;
  isLoading: boolean;
  onRetry: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export function ViewLoadingState({
  view,
  isLoading,
  onRetry,
  onCancel,
  children,
}: ViewLoadingStateProps) {
  const { showSkeleton, isTimedOut, elapsedSeconds, reset } = useLoadingState(isLoading, {
    flashThreshold: VIEW_THRESHOLDS[view],
  });

  const handleRetry = () => {
    reset();
    onRetry();
  };

  if (isTimedOut) {
    const messages = VIEW_TIMEOUT_MESSAGES[view];
    return (
      <LoadingTimeout
        headline={messages.headline}
        description={messages.description}
        onRetry={handleRetry}
        onCancel={onCancel}
        elapsedSeconds={elapsedSeconds}
      />
    );
  }

  if (showSkeleton) {
    const SkeletonComponent = SKELETON_COMPONENTS[view];
    return <SkeletonComponent />;
  }

  return <div className="anim-fade-in">{children}</div>;
}

export {
  DashboardSkeleton,
  KnowledgeListSkeleton,
  KnowledgeGraphSkeleton,
  TimelineSkeleton,
  ResearchDashboardSkeleton,
  ExpertChatSkeleton,
  InboxSkeleton,
  DomainOverviewSkeleton,
  SettingsSkeleton,
};
