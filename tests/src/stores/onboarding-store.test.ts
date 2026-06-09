import { describe, it, expect, beforeEach } from "vitest";
import { useOnboardingStore } from "@/stores/onboarding-store";

const initialState = {
  completed: false,
  skipped: false,
  tourCompleted: false,
  currentStep: "welcome",
  isOpen: false,
  hasApiKey: false,
};

beforeEach(() => {
  useOnboardingStore.setState(initialState);
});

describe("start", () => {
  it("opens overlay and resets to welcome step", () => {
    useOnboardingStore.setState({ completed: true, isOpen: false, currentStep: "api-key" });
    useOnboardingStore.getState().start();

    expect(useOnboardingStore.getState().isOpen).toBe(true);
    expect(useOnboardingStore.getState().currentStep).toBe("welcome");
    expect(useOnboardingStore.getState().completed).toBe(false);
    expect(useOnboardingStore.getState().skipped).toBe(false);
  });
});

describe("nextStep", () => {
  it("advances to next step", () => {
    useOnboardingStore.setState({ currentStep: "welcome", isOpen: true });
    useOnboardingStore.getState().nextStep();
    expect(useOnboardingStore.getState().currentStep).toBe("api-key");
  });

  it("completes onboarding at last step", () => {
    useOnboardingStore.setState({ currentStep: "guided-tour", isOpen: true });
    useOnboardingStore.getState().nextStep();

    expect(useOnboardingStore.getState().completed).toBe(true);
    expect(useOnboardingStore.getState().isOpen).toBe(false);
  });
});

describe("prevStep", () => {
  it("goes back one step", () => {
    useOnboardingStore.setState({ currentStep: "api-key" });
    useOnboardingStore.getState().prevStep();
    expect(useOnboardingStore.getState().currentStep).toBe("welcome");
  });

  it("does nothing at first step", () => {
    useOnboardingStore.setState({ currentStep: "welcome" });
    useOnboardingStore.getState().prevStep();
    expect(useOnboardingStore.getState().currentStep).toBe("welcome");
  });
});

describe("skip", () => {
  it("sets skipped and closes overlay", () => {
    useOnboardingStore.setState({ isOpen: true });
    useOnboardingStore.getState().skip();

    expect(useOnboardingStore.getState().skipped).toBe(true);
    expect(useOnboardingStore.getState().isOpen).toBe(false);
  });
});

describe("complete", () => {
  it("marks completed and closes", () => {
    useOnboardingStore.getState().complete();
    expect(useOnboardingStore.getState().completed).toBe(true);
    expect(useOnboardingStore.getState().skipped).toBe(false);
    expect(useOnboardingStore.getState().isOpen).toBe(false);
  });
});

describe("goToStep", () => {
  it("jumps to specified step", () => {
    useOnboardingStore.getState().goToStep("create-domain");
    expect(useOnboardingStore.getState().currentStep).toBe("create-domain");
  });
});

describe("close", () => {
  it("closes overlay without completing", () => {
    useOnboardingStore.setState({ isOpen: true, completed: false });
    useOnboardingStore.getState().close();
    expect(useOnboardingStore.getState().isOpen).toBe(false);
    expect(useOnboardingStore.getState().completed).toBe(false);
  });
});

describe("setHasApiKey", () => {
  it("sets the hasApiKey flag", () => {
    useOnboardingStore.getState().setHasApiKey(true);
    expect(useOnboardingStore.getState().hasApiKey).toBe(true);
  });
});

describe("completeTour", () => {
  it("sets tourCompleted flag", () => {
    useOnboardingStore.getState().completeTour();
    expect(useOnboardingStore.getState().tourCompleted).toBe(true);
  });
});
