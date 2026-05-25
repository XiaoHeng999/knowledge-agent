'use client';

import { LayoutProvider } from '@/components/layout/layout-context';
import { Titlebar } from '@/components/layout/titlebar';
import { Sidebar } from '@/components/layout/sidebar';
import { Statusbar } from '@/components/layout/statusbar';
import { DetailPanel } from '@/components/layout/detail-panel';
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay';
import { CommandPalette } from '@/components/cmd-palette/cmd-palette';

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Titlebar />
      <div className="app-layout__body">
        <Sidebar />
        <main className="app-layout__main">{children}</main>
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
