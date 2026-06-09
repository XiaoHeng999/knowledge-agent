import { describe, it, expect, beforeEach } from "vitest";
import { resolveBudgetStatus } from "@server/services/research-cost-tracker";

// ---------------------------------------------------------------------------
// resolveBudgetStatus — post-completion budget check
// ---------------------------------------------------------------------------

describe("resolveBudgetStatus", () => {
  it("returns completed when cost is within budget", () => {
    const status = resolveBudgetStatus(0.05, 0.10);
    expect(status).toBe("completed");
  });

  it("returns completed when cost equals budget exactly", () => {
    const status = resolveBudgetStatus(0.10, 0.10);
    expect(status).toBe("completed");
  });

  it("returns over_budget when cost exceeds budget", () => {
    const status = resolveBudgetStatus(0.11, 0.10);
    expect(status).toBe("over_budget");
  });
});
