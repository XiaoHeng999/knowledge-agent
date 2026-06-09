import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron before importing logger
vi.mock("electron", () => ({
  app: { getPath: vi.fn(() => "/tmp/test-userData") },
}));

import { createLogger, logger } from "@server/services/logger";

// ---------------------------------------------------------------------------
// createLogger — factory for module-scoped loggers
// ---------------------------------------------------------------------------

describe("createLogger", () => {
  beforeEach(() => {
    vi.spyOn(logger, "debug").mockImplementation(() => {});
    vi.spyOn(logger, "info").mockImplementation(() => {});
    vi.spyOn(logger, "warn").mockImplementation(() => {});
    vi.spyOn(logger, "error").mockImplementation(() => {});
  });

  it("returns a logger with debug, info, warn, error methods", () => {
    const log = createLogger("test-module");

    expect(log.debug).toBeTypeOf("function");
    expect(log.info).toBeTypeOf("function");
    expect(log.warn).toBeTypeOf("function");
    expect(log.error).toBeTypeOf("function");
  });

  it("delegates to logger singleton with the bound module name", () => {
    const log = createLogger("worker");

    log.info("ready");
    expect(logger.info).toHaveBeenCalledWith("worker", "ready", undefined);

    log.warn("slow query", { ms: 200 });
    expect(logger.warn).toHaveBeenCalledWith("worker", "slow query", { ms: 200 });

    const err = new Error("boom");
    log.error("crashed", err);
    expect(logger.error).toHaveBeenCalledWith("worker", "crashed", err, undefined);
  });
});

// ---------------------------------------------------------------------------
// logger singleton — backward compatibility
// ---------------------------------------------------------------------------

describe("logger singleton", () => {
  it("still works with per-call module parameter after createLogger addition", () => {
    const infoSpy = vi.spyOn(logger, "info");
    const errorSpy = vi.spyOn(logger, "error");

    logger.info("main", "app started");
    expect(infoSpy).toHaveBeenCalledWith("main", "app started");

    logger.error("main", "oops", undefined, { code: 500 });
    expect(errorSpy).toHaveBeenCalledWith("main", "oops", undefined, { code: 500 });
  });
});
