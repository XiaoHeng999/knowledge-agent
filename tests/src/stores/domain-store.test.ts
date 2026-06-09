import { describe, it, expect, beforeEach, vi } from "vitest";
import { useDomainStore } from "@/stores/domain-store";

function mockWindowApi() {
  const list = vi.fn().mockResolvedValue({ domains: [] });
  const create = vi.fn();
  const update = vi.fn();
  const del = vi.fn();

  // @ts-expect-error -- test mock
  window.api = { domain: { list, create, update, delete: del } };
  return { list, create, update, del };
}

beforeEach(() => {
  vi.clearAllMocks();
  useDomainStore.setState({ domains: [], loading: false, error: null });
});

describe("fetchDomains", () => {
  it("loads domains from API", async () => {
    const api = mockWindowApi();
    const domains = [{ id: "d1", name: "Test" }];
    api.list.mockResolvedValue({ domains });

    await useDomainStore.getState().fetchDomains();

    expect(useDomainStore.getState().domains).toEqual(domains);
    expect(useDomainStore.getState().loading).toBe(false);
  });

  it("sets error on failure", async () => {
    const api = mockWindowApi();
    api.list.mockRejectedValue(new Error("fail"));

    await useDomainStore.getState().fetchDomains();

    expect(useDomainStore.getState().error).toBe("fail");
  });
});

describe("createDomain", () => {
  it("creates and appends domain", async () => {
    const api = mockWindowApi();
    const newDomain = { id: "d2", name: "New" };
    api.create.mockResolvedValue(newDomain);

    const result = await useDomainStore.getState().createDomain({ name: "New" });

    expect(result).toEqual(newDomain);
    expect(useDomainStore.getState().domains).toContainEqual(newDomain);
  });
});

describe("updateDomain", () => {
  it("updates domain in list", async () => {
    const api = mockWindowApi();
    useDomainStore.setState({ domains: [{ id: "d1", name: "Old" }] });
    const updated = { id: "d1", name: "Updated" };
    api.update.mockResolvedValue(updated);

    await useDomainStore.getState().updateDomain({ id: "d1", name: "Updated" });

    expect(useDomainStore.getState().domains[0].name).toBe("Updated");
  });
});

describe("deleteDomain", () => {
  it("removes domain from list", async () => {
    const api = mockWindowApi();
    useDomainStore.setState({ domains: [{ id: "d1", name: "A" }, { id: "d2", name: "B" }] });
    api.del.mockResolvedValue(undefined);

    await useDomainStore.getState().deleteDomain("d1");

    expect(useDomainStore.getState().domains).toHaveLength(1);
    expect(useDomainStore.getState().domains[0].id).toBe("d2");
  });
});
