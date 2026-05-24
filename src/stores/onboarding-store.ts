import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedStorage } from './base';

export type OnboardingStep = 'welcome' | 'api-key' | 'create-domain' | 'guided-tour';

interface OnboardingState {
  /** Whether onboarding has been completed (won't show again) */
  completed: boolean;
  /** Whether the guided tour has been completed */
  tourCompleted: boolean;
  /** Current active step */
  currentStep: OnboardingStep;
  /** Whether the onboarding overlay is visible */
  isOpen: boolean;
  /** Whether the user has a valid API key configured */
  hasApiKey: boolean;
}

interface OnboardingActions {
  /** Start the onboarding flow from step 1 */
  start: () => void;
  /** Go to a specific step */
  goToStep: (step: OnboardingStep) => void;
  /** Go to the next step in sequence */
  nextStep: () => void;
  /** Go back to the previous step */
  prevStep: () => void;
  /** Skip onboarding entirely */
  skip: () => void;
  /** Mark onboarding as completed */
  complete: () => void;
  /** Mark tour as completed */
  completeTour: () => void;
  /** Dismiss the overlay without completing */
  close: () => void;
  /** Set API key status */
  setHasApiKey: (has: boolean) => void;
}

const STEP_ORDER: OnboardingStep[] = ['welcome', 'api-key', 'create-domain', 'guided-tour'];

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set, get) => ({
      completed: false,
      tourCompleted: false,
      currentStep: 'welcome',
      isOpen: false,
      hasApiKey: false,

      start: () => set({ isOpen: true, currentStep: 'welcome', completed: false }),

      goToStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const { currentStep } = get();
        const idx = STEP_ORDER.indexOf(currentStep);
        if (idx < STEP_ORDER.length - 1) {
          set({ currentStep: STEP_ORDER[idx + 1] });
        } else {
          get().complete();
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        const idx = STEP_ORDER.indexOf(currentStep);
        if (idx > 0) {
          set({ currentStep: STEP_ORDER[idx - 1] });
        }
      },

      skip: () => set({ isOpen: false, completed: true }),

      complete: () => set({ completed: true, isOpen: false }),

      completeTour: () => set({ tourCompleted: true }),

      close: () => set({ isOpen: false }),

      setHasApiKey: (has) => set({ hasApiKey: has }),
    }),
    {
      name: 'onboarding-store',
      storage: persistedStorage,
      partialize: (state) => ({
        completed: state.completed,
        tourCompleted: state.tourCompleted,
        hasApiKey: state.hasApiKey,
      }),
    },
  ),
);
