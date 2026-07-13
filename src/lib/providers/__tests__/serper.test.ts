import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { findCompaniesViaSerper } from "@/lib/providers/serper";

describe("findCompaniesViaSerper", () => {
  const originalEnv = process.env.SERPER_API_KEY;

  beforeEach(() => {
    process.env.SERPER_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.SERPER_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns nothing when SERPER_API_KEY is not set", async () => {
    delete process.env.SERPER_API_KEY;
    const result = await findCompaniesViaSerper("US");
    expect(result).toEqual([]);
  });

  it("excludes LinkedIn, Facebook, and other social platforms from results", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [
          { title: "Acme Corp - Official Site", link: "https://acmecorp.com/about" },
          { title: "Acme Corp | LinkedIn", link: "https://linkedin.com/company/acmecorp" },
          { title: "Acme Corp - Facebook", link: "https://facebook.com/acmecorp" },
          { title: "Widget Co - Home", link: "https://widgetco.com" },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await findCompaniesViaSerper("US");
    const domains = result.map((c) => c.domain);

    expect(domains).toContain("acmecorp.com");
    expect(domains).toContain("widgetco.com");
    expect(domains.some((d) => d?.includes("linkedin.com"))).toBe(false);
    expect(domains.some((d) => d?.includes("facebook.com"))).toBe(false);
  });

  it("tags every discovered company with the serper provider and a non-registry source note", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [{ title: "Acme Corp", link: "https://acmecorp.com" }],
      }),
    }) as unknown as typeof fetch;

    const result = await findCompaniesViaSerper("US");
    expect(result[0].provider).toBe("serper");
    expect(result[0].source).toMatch(/not a registry/);
  });

  it("does not attempt to extract a person's name or email — company data only", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [{ title: "Acme Corp", link: "https://acmecorp.com", snippet: "CEO John Smith leads..." }],
      }),
    }) as unknown as typeof fetch;

    const result = await findCompaniesViaSerper("US");
    // Company objects have no name-of-a-person or email fields at all —
    // this is enforced by the type, but confirm no such data leaks through
    // any unexpected extra properties.
    expect(Object.keys(result[0]).sort()).toEqual(
      ["country", "domain", "id", "name", "provider", "source"].sort()
    );
  });
});
