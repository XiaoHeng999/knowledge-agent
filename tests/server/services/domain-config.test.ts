import { describe, it, expect, vi } from "vitest";

// Mock electron before anything that depends on it
vi.mock("electron", () => ({
  app: { getPath: vi.fn(() => "/tmp/test-electron") },
}));

// Mock fs provider (not needed for extractSlugFromConfigPath but imported by module)
vi.mock("@server/fs/provider", () => ({
  getFileSystemProvider: vi.fn(),
  setFileSystemProvider: vi.fn(),
}));

// Mock fs/paths (not needed for extractSlugFromConfigPath but imported by module)
vi.mock("@server/fs/paths", () => ({
  resolveDomainPath: vi.fn(),
  DOMAIN_SUBPATHS: {},
}));

import { extractSlugFromConfigPath } from "@server/services/domain-config";

describe("extractSlugFromConfigPath", () => {
  it("extracts slug from standard domains/ path", () => {
    expect(extractSlugFromConfigPath("domains/my-domain")).toBe("my-domain");
  });

  it("extracts slug from path with config filename", () => {
    expect(extractSlugFromConfigPath("domains/my-domain/config.yaml")).toBe("my-domain");
  });

  it("extracts slug from absolute path", () => {
    expect(extractSlugFromConfigPath("/home/user/data/domains/ai-ml")).toBe("ai-ml");
  });

  it("extracts slug from absolute path with filename", () => {
    expect(extractSlugFromConfigPath("/home/user/data/domains/ai-ml/config.yaml")).toBe("ai-ml");
  });

  it("handles Windows backslashes", () => {
    expect(extractSlugFromConfigPath("C:\\Users\\data\\domains\\web-dev")).toBe("web-dev");
  });

  it("falls back to second-to-last segment when no 'domains' found", () => {
    // e.g. /data/my-domain/config.yaml → parts[-2] = "my-domain"
    expect(extractSlugFromConfigPath("data/my-domain/config.yaml")).toBe("my-domain");
  });

  it("handles bare slug without parent directory", () => {
    expect(extractSlugFromConfigPath("just-a-slug")).toBe("");
  });

  it("handles empty string", () => {
    expect(extractSlugFromConfigPath("")).toBe("");
  });

  it("handles path with trailing slash", () => {
    expect(extractSlugFromConfigPath("domains/my-domain/")).toBe("my-domain");
  });
});
