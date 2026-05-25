'use client';

import { LayoutProvider } from '@/components/layout/layout-context';
import { Titlebar } from '@/components/layout/titlebar';
import { Sidebar } from '@/components/layout/sidebar';
import { Statusbar } from '@/components/layout/statusbar';
import { DetailPanel } from '@/components/layout/detail-panel';
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay';
import { CommandPalette } from '@/components/cmd-palette/cmd-palette';
import { useRouteFocus } from '@/lib/hooks/use-route-focus';

function AppShell({ children }: { children: React.ReactNode }) {
  useRouteFocus();

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Titlebar />
      <div className="app-layout__body">
        <Sidebar />
        <main id="main-content" className="app-layout__main" tabIndex={-1}>{children}</main>
        <DetailPanel />
      </div>
      <Statusbar />
      <OnboardingOverlay />
      <CommandPalette />
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <AppShell>{children}</AppShell>
    </LayoutProvider>
  );
}
