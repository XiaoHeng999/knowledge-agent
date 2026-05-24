'use client';

import { useOnboardingStore } from '@/stores/onboarding-store';

const TOUR_HIGHLIGHTS = [
  { icon: '🗂️', label: 'Domain sidebar' },
  { icon: '🔬', label: 'Research triggers' },
  { icon: '📥', label: 'Inbox & knowledge base' },
  { icon: '💬', label: 'Expert chat' },
  { icon: '⌘K', label: 'Command palette' },
];

export function GuidedResearch() {
  const { complete, skip, completeTour } = useOnboardingStore();

  const handleTakeTour = () => {
    completeTour();
    // In production, this would launch spotlight overlays on the main UI.
    // For now, we mark tour complete and dismiss onboarding.
    complete();
  };

  const handleSkipTour = () => {
    complete();
  };

  return (
    <div className="onboarding__content">
      <div className="onboarding__celebration">🎉</div>
      <h2 className="onboarding__step-title">You&apos;re All Set!</h2>
      <p className="onboarding__step-desc">Your first domain is ready.</p>

      <p className="onboarding__tour-question">
        Would you like a quick tour of the interface?
      </p>

      <div className="onboarding__tour-highlights">
        <p className="onboarding__tour-label">The tour covers:</p>
        <ul className="onboarding__tour-list">
          {TOUR_HIGHLIGHTS.map((h) => (
            <li key={h.label} className="onboarding__tour-item">
              <span className="onboarding__tour-icon">{h.icon}</span>
              <span>{h.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="onboarding__nav">
        <button className="onboarding__btn-ghost" onClick={handleSkipTour}>
          Skip Tour
        </button>
        <button className="onboarding__btn-primary" onClick={handleTakeTour}>
          Take Tour →
        </button>
      </div>
    </div>
  );
}
