'use client';

import { useOnboardingStore } from '@/stores/onboarding-store';

const FEATURES = [
  { icon: '🔬', label: 'Auto-research' },
  { icon: '💬', label: 'Expert dialogue' },
  { icon: '🕸️', label: 'Knowledge graph' },
  { icon: '📅', label: 'Timeline & predictions' },
];

export function WelcomeScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);

  return (
    <div className="onboarding__content">
      <div className="onboarding__logo">🐙</div>
      <h1 className="onboarding__app-name">AgentClaw</h1>
      <p className="onboarding__tagline">Comprehension over Retrieval</p>
      <p className="onboarding__description">
        Your AI-powered research companion that doesn&apos;t just store knowledge — it understands it.
      </p>

      <div className="onboarding__features">
        {FEATURES.map((f) => (
          <div key={f.label} className="onboarding__feature">
            <span className="onboarding__feature-icon">{f.icon}</span>
            <span className="onboarding__feature-label">{f.label}</span>
          </div>
        ))}
      </div>

      <button className="onboarding__btn-primary" onClick={nextStep}>
        Get Started
      </button>

      <button className="onboarding__skip-link" onClick={nextStep}>
        Skip
      </button>
    </div>
  );
}
