import fs from "fs";
import path from "path";
import { Company, Country } from "@/lib/types";

/**
 * STAGE 1 — Company universe
 *
 * Production sources (no paid keys required):
 *  - OpenCorporates search API (free tier, rate limited — no key needed for light use)
 *  - Australian Business Register (ABR) web services (free ABN lookup)
 *  - SEC EDGAR company tickers file (US public companies, fully free/no key) — LIVE
 *  - Corporations Canada federal corporate search (free)
 *  - Handelsregister / Unternehmensregister (DE — free search, no bulk API)
 *
 * This skeleton ships with a demo fallback (data/seed-companies.json) for
 * countries without a live connector yet, so the pipeline always runs
 * end-to-end. Swap `fetchLive` for a real registry call per country when
 * you're ready — the shape of Company stays the same either way.
 */

// SEC requires a descriptive User-Agent identifying the requester —
// this is their documented fair-access policy, not an API key.
const SEC_USER_AGENT = "leadintel research@aureonics.systems";
const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";

// How many US companies to pull per run. The full file has 10,000+
// entries — capped here to keep runs comfortably inside Vercel's default
// serverless function timeout (10s on Hobby), since each company needs a
// follow-up website lookup.
const US_COMPANY_LIMIT = 10;

interface SecTickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

async function fetchSecWebsite(cik: number): Promise<string | undefined> {
  try {
    const paddedCik = String(cik).padStart(10, "0");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`, {
      headers: { "User-Agent": SEC_USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return undefined;
    const data = await res.json();
    const website: string | undefined = data.website || undefined;
    if (!website) return undefined;
    return website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

async function fetchUSCompaniesFromSEC(): Promise<Company[] | null> {
  try {
    const res = await fetch(SEC_TICKERS_URL, {
      headers: { "User-Agent": SEC_USER_AGENT },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, SecTickerEntry>;
    const entries = Object.values(data).slice(0, US_COMPANY_LIMIT);

    // Fetch all website lookups in parallel — sequential awaits here
    // risk exceeding Vercel's default 10s serverless timeout once you
    // add DNS resolution for every other country on top.
    const websites = await Promise.all(entries.map((e) => fetchSecWebsite(e.cik_str)));

    return entries.map((entry, i) => ({
      id: `us-sec-${entry.cik_str}`,
      name: entry.title,
      country: "US" as Country,
      registryId: `CIK-${String(entry.cik_str).padStart(10, "0")}`,
      source: "SEC EDGAR company_tickers.json",
      domain: websites[i],
    }));
  } catch {
    return null;
  }
}

async function fetchLive(country: Country): Promise<Company[] | null> {
  if (country === "US") {
    return fetchUSCompaniesFromSEC();
  }

  // TODO: implement remaining registries, e.g.:
  //
  // if (country === "AU") {
  //   const res = await fetch("https://abr.business.gov.au/...");
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
      log.push(`[${country}] fetched ${live.length} companies from SEC EDGAR (live)`);
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
