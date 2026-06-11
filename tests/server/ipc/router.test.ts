import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  dispatch,
  createServiceRegistry,
  route,
  type ChannelRoute,
} from "@server/ipc/router";
import { VC_CHANNELS, SETTINGS_CHANNELS } from "@/lib/ipc/channels";

// Capture handlers registered via registerHandler
const registeredHandlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();

vi.mock("@server/ipc/handler", () => ({
  registerHandler: (channel: string, handler: (...args: unknown[]) => Promise<unknown>) => {
    registeredHandlers.set(channel, handler);
  },
}));

// Import after mock is set up
import { registerRoutes } from "@server/ipc/router";

describe("IPC Router — dispatch", () => {
  it("calls service method with full req when no params extractor", async () => {
    const registry = createServiceRegistry();
    const received: unknown[] = [];
    registry.set("testService", {
      greet(req: unknown) {
        received.push(req);
        return `hello ${(req as { name: string }).name}`;
      },
    });

    const route: ChannelRoute = {
      channel: "test:greet",
      service: "testService",
      method: "greet",
    };

    const result = await dispatch(route, { name: "world" }, registry);

    expect(result).toBe("hello world");
    expect(received).toEqual([{ name: "world" }]);
  });

  it("spreads extracted params when params extractor is provided", async () => {
    const registry = createServiceRegistry();
    const received: unknown[] = [];
    registry.set("mathService", {
      add(a: unknown, b: unknown) {
        received.push(a, b);
        return (a as number) + (b as number);
      },
    });

    const route: ChannelRoute = {
      channel: "math:add",
      service: "mathService",
      method: "add",
      params: (req) => [(req as { x: number }).x, (req as { y: number }).y],
    };

    const result = await dispatch(route, { x: 3, y: 4 }, registry);

    expect(result).toBe(7);
    expect(received).toEqual([3, 4]);
  });

  it("wraps result in object with wrap key when specified", async () => {
    const registry = createServiceRegistry();
    registry.set("itemService", {
      list() {
        return ["a", "b", "c"];
      },
    });

    const route: ChannelRoute = {
      channel: "item:list",
      service: "itemService",
      method: "list",
      wrap: "items",
    };

    const result = await dispatch(route, {}, registry);

    expect(result).toEqual({ items: ["a", "b", "c"] });
  });

  it("returns raw result when no wrap key", async () => {
    const registry = createServiceRegistry();
    registry.set("svc", {
      getValue() {
        return 42;
      },
    });

    const route: ChannelRoute = {
      channel: "svc:getValue",
      service: "svc",
      method: "getValue",
    };

    const result = await dispatch(route, {}, registry);

    expect(result).toBe(42);
  });

  it("throws when service is not found in registry", async () => {
    const registry = createServiceRegistry();
    const route: ChannelRoute = {
      channel: "svc:missing",
      service: "nonexistent",
      method: "doThing",
    };

    await expect(dispatch(route, {}, registry)).rejects.toThrow(
      "Service not found: nonexistent",
    );
  });

  it("throws when method is not found on service", async () => {
    const registry = createServiceRegistry();
    registry.set("svc", {});

    const route: ChannelRoute = {
      channel: "svc:missing",
      service: "svc",
      method: "nope",
    };

    await expect(dispatch(route, {}, registry)).rejects.toThrow(
      "Method not found: nope on service svc",
    );
  });

  it("throws when channel does not match module:action format", async () => {
    const registry = createServiceRegistry();
    registry.set("svc", { run() {} });

    const route: ChannelRoute = {
      channel: "invalid-channel",
      service: "svc",
      method: "run",
    };

    await expect(dispatch(route, {}, registry)).rejects.toThrow(
      'Invalid channel format: "invalid-channel" (expected "module:action")',
    );
  });

  it("transforms result with transform function when specified", async () => {
    const registry = createServiceRegistry();
    registry.set("svc", {
      addApiKey() {
        return { providerId: "openai" };
      },
    });

    const route: ChannelRoute = {
      channel: "svc:addKey",
      service: "svc",
      method: "addApiKey",
      transform: (result) => ({ success: true, providerId: (result as { providerId: string }).providerId }),
    };

    const result = await dispatch(route, {}, registry);

    expect(result).toEqual({ success: true, providerId: "openai" });
  });

  it("prefers transform over wrap when both are specified", async () => {
    const registry = createServiceRegistry();
    registry.set("svc", {
      get() {
        return null;
      },
    });

    const route: ChannelRoute = {
      channel: "svc:get",
      service: "svc",
      method: "get",
      wrap: "data",
      transform: (result) => result ?? { providerId: "", modelId: "" },
    };

    const result = await dispatch(route, {}, registry);

    expect(result).toEqual({ providerId: "", modelId: "" });
  });
});

describe("IPC Router — registerRoutes", () => {
  beforeEach(() => {
    registeredHandlers.clear();
  });

  it("registers each route via registerHandler and dispatches correctly", async () => {
    const registry = createServiceRegistry();
    registry.set("svc", {
      greet(req: unknown) {
        return `hi ${(req as { name: string }).name}`;
      },
      list() {
        return ["a", "b"];
      },
    });

    const routes: ChannelRoute[] = [
      { channel: "svc:greet", service: "svc", method: "greet" },
      { channel: "svc:list", service: "svc", method: "list", wrap: "items" },
    ];

    registerRoutes(routes, registry);

    expect(registeredHandlers.has("svc:greet")).toBe(true);
    expect(registeredHandlers.has("svc:list")).toBe(true);

    // Verify handler for svc:greet dispatches correctly
    const greetHandler = registeredHandlers.get("svc:greet")!;
    const event = {} as never;
    const result = await greetHandler(event, { name: "test" });
    expect(result).toBe("hi test");

    // Verify handler for svc:list wraps correctly
    const listHandler = registeredHandlers.get("svc:list")!;
    const listResult = await listHandler(event, {});
    expect(listResult).toEqual({ items: ["a", "b"] });
  });
});

// ---------------------------------------------------------------------------
// Type-safe route() helper — tracer bullet
// ---------------------------------------------------------------------------

describe("route() helper — type inference", () => {
  it("provides typed params for a real channel (vc:getHistory)", async () => {
    const registry = createServiceRegistry();
    const received: unknown[] = [];
    registry.set("version-control", {
      getHistory(filePath: string, limit?: number) {
        received.push(filePath, limit);
        return [{ hash: "abc", message: "init" }];
      },
    });

    // route() infers C = "vc:getHistory", so req is VcGetHistoryRequest
    // No `as` cast needed — req.filePath and req.limit are typed
    const historyRoute = route({
      channel: VC_CHANNELS.GET_HISTORY,
      service: "version-control",
      method: "getHistory",
      params(req) {
        return [req.filePath, req.limit];
      },
      wrap: "commits",
    });

    const result = await dispatch(historyRoute, { filePath: "a.ts", limit: 5 }, registry);

    expect(received).toEqual(["a.ts", 5]);
    expect(result).toEqual({ commits: [{ hash: "abc", message: "init" }] });
  });

  it("handles void-request channels without params (settings:getTheme)", async () => {
    const registry = createServiceRegistry();
    registry.set("db-settings", {
      get: () => null,
    });

    const themeRoute = route({
      channel: SETTINGS_CHANNELS.GET_THEME,
      service: "db-settings",
      method: "get",
      params() {
        return ["theme"];
      },
      transform: (result) => result ?? "tokyo-night",
    });

    const result = await dispatch(themeRoute, {}, registry);
    expect(result).toBe("tokyo-night");
  });
});
