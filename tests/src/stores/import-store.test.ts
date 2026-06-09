import { describe, it, expect, beforeEach, vi } from "vitest";
import { useImportStore } from "@/stores/import-store";

function mockWindowApi() {
  const fns = {
    importUrl: vi.fn(),
    importFile: vi.fn(),
    getStatus: vi.fn(),
    list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    retry: vi.fn(),
    cancel: vi.fn(),
    pollRss: vi.fn(),
  };

  // @ts-expect-error -- test mock
  window.api = { import: fns };
  return fns;
}

const initialState = {
  loading: false,
  error: null as string | null,
  activeImport: null as unknown,
  history: [] as unknown[],
  historyTotal: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  useImportStore.setState(initialState);
});

describe("importUrl", () => {
  it("starts URL import and sets activeImport", async () => {
    const api = mockWindowApi();
    const result = { id: "imp1", status: "processing" };
    api.importUrl.mockResolvedValue(result);

    await useImportStore.getState().importUrl("https://example.com");

    expect(api.importUrl).toHaveBeenCalledWith({ url: "https://example.com", domainId: undefined });
    expect(useImportStore.getState().activeImport).toEqual(result);
  });

  it("sets error on failure", async () => {
    const api = mockWindowApi();
    api.importUrl.mockRejectedValue(new Error("import failed"));

    await useImportStore.getState().importUrl("bad");

    expect(useImportStore.getState().error).toBe("import failed");
  });
});

describe("fetchHistory", () => {
  it("loads import history", async () => {
    const api = mockWindowApi();
    const imports = [{ id: "imp1" }];
    api.list.mockResolvedValue({ items: imports, total: 1 });

    await useImportStore.getState().fetchHistory("d1");

    expect(useImportStore.getState().history).toEqual(imports);
    expect(useImportStore.getState().historyTotal).toBe(1);
  });
});

describe("cancelImport", () => {
  it("cancels and clears activeImport", async () => {
    const api = mockWindowApi();
    useImportStore.setState({ activeImport: { id: "imp1" } });
    api.cancel.mockResolvedValue(undefined);

    await useImportStore.getState().cancelImport("imp1");

    expect(api.cancel).toHaveBeenCalledWith({ id: "imp1" });
    expect(useImportStore.getState().activeImport).toBeNull();
  });
});

describe("clearError", () => {
  it("clears error state", () => {
    useImportStore.setState({ error: "x" });
    useImportStore.getState().clearError();
    expect(useImportStore.getState().error).toBeNull();
  });
});
