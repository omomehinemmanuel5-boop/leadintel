import fs from "fs";
import path from "path";
import { Company, Country } from "@/lib/types";

/**
 * STAGE 1 — Company universe
 *
 * Production sources (no paid keys required):
 *  - OpenCorporates search API (free tier, rate limited — no key needed for light use)
 *  - Australian Business Register (ABR) web services (free ABN lookup)
 *  - SEC EDGAR full-text search (US public companies, fully free/no key)
 *  - Corporations Canada federal corporate search (free)
 *  - Handelsregister / Unternehmensregister (DE — free search, no bulk API)
 *
 * This skeleton ships with a demo fallback (data/seed-companies.json) so the
 * pipeline runs end-to-end without any external calls. Swap `fetchLive` for
 * a real registry call per country when you're ready — the shape of Company
 * stays the same either way.
 */

async function fetchLive(country: Country): Promise<Company[] | null> {
  // TODO: implement per-country registry calls, e.g.:
  //
  // if (country === "US") {
  //   const res = await fetch("https://www.sec.gov/cgi-bin/browse-edgar?...");
  //   ...
  // }
  //
  // Left unimplemented on purpose — wire in one registry at a time and
  // keep the free-tier rate limit in the fetch (see README).
  return null;
}

function loadSeed(): { companies: Company[] } {
  const seedPath = path.join(process.cwd(), "data", "seed-companies.json");
  const raw = fs.readFileSync(seedPath, "utf-8");
  const parsed = JSON.parse(raw);
  return { companies: parsed.companies as Company[] };
}

export async function getCompanyUniverse(countries: Country[]): Promise<{
  companies: Company[];
  log: string[];
}> {
  const log: string[] = [];
  const results: Company[] = [];

  for (const country of countries) {
    const live = await fetchLive(country);
    if (live) {
      log.push(`[${country}] fetched ${live.length} companies from live registry`);
      results.push(...live);
    } else {
      const { companies } = loadSeed();
      const seeded = companies.filter((c) => c.country === country);
      log.push(
        `[${country}] no live connector configured — using ${seeded.length} demo companies (data/seed-companies.json)`
      );
      results.push(...seeded);
    }
  }

  return { companies: results, log };
}
