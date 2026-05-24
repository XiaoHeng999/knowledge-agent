'use client';

import { useEffect } from 'react';
import { useOnboardingStore, type OnboardingStep } from '@/stores/onboarding-store';
import { WelcomeScreen } from './welcome-screen';
import { ApiKeySetup } from './api-key-setup';
import { CreateFirstDomain } from './create-first-domain';
import { GuidedResearch } from './guided-research';

const STEP_INDICATORS: { step: OnboardingStep; index: number }[] = [
  { step: 'welcome', index: 0 },
  { step: 'api-key', index: 1 },
  { step: 'create-domain', index: 2 },
  { step: 'guided-tour', index: 3 },
];

export function OnboardingOverlay() {
  const { isOpen, completed, currentStep, skip } = useOnboardingStore();

  // Auto-open onboarding if not completed
  useEffect(() => {
    if (!completed && !isOpen) {
      useOnboardingStore.getState().start();
    }
  }, [completed, isOpen]);

  if (!isOpen || completed) return null;

  const activeIndex = STEP_INDICATORS.find((s) => s.step === currentStep)?.index ?? 0;

  return (
    <div className="onboarding-overlay" role="dialog" aria-label="Onboarding">
      <div className="onboarding__card">
        {/* Step indicators */}
        <div className="onboarding__indicators">
          {STEP_INDICATORS.map((s) => (
            <div
              key={s.step}
              className={`onboarding__dot ${s.index === activeIndex ? 'onboarding__dot--active' : ''} ${s.index < activeIndex ? 'onboarding__dot--done' : ''}`}
            />
          ))}
        </div>

        {/* Step content */}
        {currentStep === 'welcome' && <WelcomeScreen />}
        {currentStep === 'api-key' && <ApiKeySetup />}
        {currentStep === 'create-domain' && <CreateFirstDomain />}
        {currentStep === 'guided-tour' && <GuidedResearch />}

        {/* Skip all link */}
        {currentStep !== 'guided-tour' && (
          <button className="onboarding__skip-all" onClick={skip}>
            Skip All
          </button>
        )}
      </div>
    </div>
  );
}
