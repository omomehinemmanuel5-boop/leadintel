import fs from "fs";
import path from "path";
import { Company, Country } from "@/lib/types";
import { fetchAustraliaCompanies } from "@/lib/providers/abr";
import { fetchCanadaCompanies } from "@/lib/providers/canada";
import { hasAbr } from "@/lib/providers/config";

/**
 * STAGE 1 — Company universe
 *
 * Live sources, no paid keys required:
 *  - SEC EDGAR (US) — fully free, no key at all
 *  - Corporations Canada (CA) — fully free, no key at all (bulk CSV)
 *  - Australian Business Register (AU) — free, but needs a registered
 *    ABR_GUID (same-day email registration, not a purchase)
 *  - Germany (DE) — deliberately NOT wired. The Handelsregister has no
 *    official API, imposes a 60 query/hour limit on its portal, and the
 *    register authority has stated that mass automated queries may
 *    constitute a criminal offense under §§303a/303b StGB. The only
 *    legal free option is OffeneRegister.de's static bulk dataset
 *    (2017-2019, stale) — a one-time manual import, not something to
 *    query live. Not building a connector that could look like it's
 *    doing that.
 *
 * This skeleton ships with a demo fallback (data/seed-companies.json)
 * for whatever isn't configured, so the pipeline always runs
 * end-to-end.
 */

// SEC requires a descriptive User-Agent identifying the requester —
// this is their documented fair-access policy, not an API key.
const SEC_USER_AGENT = "leadintel research@aureonics.systems";
const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";

// How many US companies to pull per run. The full file has 10,000+
// entries — capped here to keep runs comfortably inside Vercel's default
// serverless function timeout (10s on Hobby), since each company needs a
// follow-up website lookup.
const US_COMPANY_LIMIT = 15;

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
      provider: "sec_edgar" as const,
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
  if (country === "CA") {
    return fetchCanadaCompanies();
  }
  if (country === "AU" && hasAbr()) {
    return fetchAustraliaCompanies();
  }

  // DE: deliberately not wired, see file header comment.
  return null;
}

function loadSeed(): { companies: Company[] } {
  const seedPath = path.join(process.cwd(), "data", "seed-companies.json");
  const raw = fs.readFileSync(seedPath, "utf-8");
  const parsed = JSON.parse(raw);
  const companies = (parsed.companies as Omit<Company, "provider">[]).map((c) => ({
    ...c,
    provider: "demo" as const,
  }));
  return { companies };
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
      const providerName = live[0]?.provider ?? "live source";
      log.push(`[${country}] fetched ${live.length} companies from ${providerName} (live)`);
      results.push(...live);
    } else {
      const { companies } = loadSeed();
      const seeded = companies.filter((c) => c.country === country);
      const reason =
        country === "AU" && !hasAbr()
          ? "ABR_GUID not set"
          : country === "DE"
            ? "no legal free live API exists for Germany, see file header"
            : "no live connector configured";
      log.push(`[${country}] ${reason} — using ${seeded.length} demo companies (data/seed-companies.json)`);
      results.push(...seeded);
    }
  }

  return { companies: results, log };
}
