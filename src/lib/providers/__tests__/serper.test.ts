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
    expect(result).toEqual({ companies: [] });
  });

  it("surfaces the failure reason instead of silently returning empty — regression test for a real bug", async () => {
    // This is the exact failure mode caught in production: Serper's
    // free tier rejects num > 10 with a 400 and a specific message.
    // The original code swallowed this silently (`if (!res.ok) return
    // []`), which meant Germany's Serper supplement failed with zero
    // visibility into why until debugged directly against the live API.
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: "Query pattern not allowed for free accounts.", statusCode: 400 }),
    }) as unknown as typeof fetch;

    const result = await findCompaniesViaSerper("DE");
    expect(result.companies).toEqual([]);
    expect(result.error).toMatch(/400/);
    expect(result.error).toMatch(/not allowed/);
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
    const domains = result.companies.map((c) => c.domain);

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
    expect(result.companies[0].provider).toBe("serper");
    expect(result.companies[0].source).toMatch(/not a registry/);
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
    expect(Object.keys(result.companies[0]).sort()).toEqual(
      ["country", "domain", "id", "name", "provider", "source"].sort()
    );
  });
});
