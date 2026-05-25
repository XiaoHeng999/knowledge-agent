'use client';

import { useState, useCallback, lazy, Suspense } from 'react';
import { LayoutProvider } from '@/components/layout/layout-context';
import { Titlebar } from '@/components/layout/titlebar';
import { Sidebar } from '@/components/layout/sidebar';
import { Statusbar } from '@/components/layout/statusbar';
import { DetailPanel } from '@/components/layout/detail-panel';
import { ErrorBoundary } from '@/components/error/error-boundary';
import { ToastProvider } from '@/components/ui/toast';
import { LaunchLoader } from '@/components/ui/launch-loader';
import { useRouteFocus } from '@/lib/hooks/use-route-focus';

// Lazy-load heavy/optional components — not needed for initial paint
const OnboardingOverlay = lazy(() =>
  import('@/components/onboarding/onboarding-overlay').then((m) => ({ default: m.OnboardingOverlay }))
);
const CommandPalette = lazy(() =>
  import('@/components/cmd-palette/cmd-palette').then((m) => ({ default: m.CommandPalette }))
);
const UpdateNotification = lazy(() =>
  import('@/components/update/update-notification').then((m) => ({ default: m.UpdateNotification }))
);

function AppShell({ children }: { children: React.ReactNode }) {
  useRouteFocus();

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Titlebar />
      <div className="app-layout__body">
        <Sidebar />
        <main id="main-content" className="app-layout__main" tabIndex={-1}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
        <DetailPanel />
      </div>
      <Statusbar />
      <Suspense fallback={null}>
        <OnboardingOverlay />
        <CommandPalette />
        <UpdateNotification />
      </Suspense>
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  if (!ready) {
    return (
      <ToastProvider>
        <LayoutProvider>
          <div className="app-layout">
            <Titlebar />
            <div className="app-layout__body">
              <main className="app-layout__main">
                <LaunchLoader onReady={handleReady} />
              </main>
            </div>
          </div>
        </LayoutProvider>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <LayoutProvider>
        <AppShell>{children}</AppShell>
      </LayoutProvider>
    </ToastProvider>
  );
}
