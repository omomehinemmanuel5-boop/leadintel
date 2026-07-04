import { Company } from "@/lib/types";

/**
 * STAGE 2 — Domain resolution
 *
 * Production sources (free):
 *  - Clearbit Logo/Autocomplete API (no key required for basic lookup)
 *  - Google Programmable Search Engine (100 free queries/day with a key —
 *    the one place you may eventually want a free-tier key, but the
 *    heuristic below covers most cases without it)
 *
 * Strategy: try a cheap heuristic first (slugify company name -> common
 * TLD per country), and only fall back to a search API for the misses.
 */

const TLD_BY_COUNTRY: Record<string, string> = {
  AU: "com.au",
  DE: "de",
  US: "com",
  CA: "ca",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(gmbh|inc|ltd|corp|co|pty|limited|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

async function verifyDomainResolves(domain: string): Promise<boolean> {
  return withTimeout(
    (async () => {
      try {
        const dns = await import("dns/promises");
        const records = await dns.resolveMx(domain).catch(() => null);
        if (records && records.length > 0) return true;
        const a = await dns.resolve4(domain).catch(() => null);
        return !!(a && a.length > 0);
      } catch {
        return false;
      }
    })(),
    3000,
    false
  );
}

export async function resolveDomains(companies: Company[]): Promise<{
  companies: Company[];
  log: string[];
}> {
  const results = await Promise.all(
    companies.map(async (company) => {
      if (company.domain) {
        const resolves = await verifyDomainResolves(company.domain);
        return {
          company,
          log: `[${company.name}] using registry-provided domain ${company.domain}${resolves ? " (DNS confirmed)" : " (DNS check failed — may still be valid, some domains block certain lookups)"}`,
        };
      }

      const slug = slugify(company.name);
      const tld = TLD_BY_COUNTRY[company.country] ?? "com";
      const guess = `${slug}.${tld}`;
      const resolves = await verifyDomainResolves(guess);

      if (resolves) {
        return { company: { ...company, domain: guess }, log: `[${company.name}] resolved -> ${guess} (heuristic + DNS confirmed)` };
      }
      // TODO: fall back to a search-based lookup here if you add a key later
      return {
        company: { ...company, domain: undefined },
        log: `[${company.name}] heuristic guess "${guess}" did not resolve — needs manual/search fallback`,
      };
    })
  );

  return { companies: results.map((r) => r.company), log: results.map((r) => r.log) };
}
