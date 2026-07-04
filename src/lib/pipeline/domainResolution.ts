import { Company } from "@/lib/types";
import { hasGoogle } from "@/lib/providers/config";
import { findDomainViaGoogle } from "@/lib/providers/google";

/**
 * STAGE 2 — Domain resolution
 *
 * Chain: registry-provided domain (already correct, just confirm it
 * resolves) -> heuristic guess + DNS confirm -> Google Custom Search
 * fallback if GOOGLE_API_KEY/GOOGLE_CSE_ID are set -> give up and flag
 * for manual review.
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

      if (hasGoogle()) {
        const googleDomain = await findDomainViaGoogle(company.name, company.country);
        if (googleDomain) {
          const googleResolves = await verifyDomainResolves(googleDomain);
          if (googleResolves) {
            return {
              company: { ...company, domain: googleDomain },
              log: `[${company.name}] heuristic guess failed — Google Search found ${googleDomain} (DNS confirmed)`,
            };
          }
        }
      }

      return {
        company: { ...company, domain: undefined },
        log: `[${company.name}] heuristic guess "${guess}" did not resolve${hasGoogle() ? " and Google fallback found nothing usable" : " — set GOOGLE_API_KEY/GOOGLE_CSE_ID to enable a search fallback"}`,
      };
    })
  );

  return { companies: results.map((r) => r.company), log: results.map((r) => r.log) };
}
