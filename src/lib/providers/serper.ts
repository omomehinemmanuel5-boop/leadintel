import { Company, Country } from "@/lib/types";

/**
 * Serper.dev — a commercial Google Search API reseller (legitimate paid
 * API, same category as Google's own Custom Search, not scraping).
 *
 * Scope is deliberately narrow, and that's the whole point of this
 * rewrite. An earlier version of this idea (added directly via GitHub,
 * not through this pipeline) tried to do everything in one place: mass
 * query generation, regex-extract a person's name from arbitrary page
 * snippets, and blindly guess an email — with no consent check, no
 * suppression check, and no verification. That's the same shape of
 * problem as scraping LinkedIn directly, just one layer removed: broad
 * web search for executives + guessed emails, no compliance framework.
 *
 * This version does ONE thing: find candidate COMPANIES (name + domain)
 * for a country/industry. It does not try to extract a person's name or
 * guess an email — those stay the job of the existing, gated stages
 * (name_discovery's Apollo/SEC-10K/Google chain, email_pattern's
 * structured guesser, verification's MX check, consent_gate,
 * suppression_gate). A company found here goes through exactly the same
 * pipeline as one found via SEC or ABR — nothing skips the gates.
 *
 * Explicitly excludes linkedin.com, facebook.com, and a few other
 * platforms from search results — not just because scraping them
 * directly is off the table, but because surfacing the same data
 * through a search-API proxy would be the same problem wearing a
 * different hat.
 */

const SERPER_URL = "https://google.serper.dev/search";
const SERPER_COMPANY_LIMIT = 10;
const EXCLUDED_DOMAINS = ["linkedin.com", "facebook.com", "instagram.com", "twitter.com", "x.com", "crunchbase.com"];

// One representative industry per call, rotated — deliberately not the
// full city x industry x role cartesian product the earlier version
// generated (which would have been hundreds of queries per run).
const INDUSTRIES = [
  "B2B SaaS",
  "logistics and freight",
  "commercial construction",
  "medical device manufacturing",
  "renewable energy",
  "industrial manufacturing",
  "IT consulting",
  "specialty chemicals",
];

const COUNTRY_GL: Record<Country, string> = { US: "us", AU: "au", DE: "de", CA: "ca" };

interface SerperResult {
  title: string;
  link: string;
  snippet?: string;
}

function cleanCompanyName(title: string): string {
  return title.split(/[-|–]/)[0].trim();
}

function isExcluded(hostname: string): boolean {
  return EXCLUDED_DOMAINS.some((d) => hostname.includes(d));
}

export async function findCompaniesViaSerper(country: Country): Promise<Company[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const industry = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
  const excludeClause = EXCLUDED_DOMAINS.map((d) => `-site:${d}`).join(" ");
  const query = `"${industry}" company official website ${excludeClause}`;

  try {
    const res = await fetch(SERPER_URL, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: SERPER_COMPANY_LIMIT * 2, gl: COUNTRY_GL[country] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const results = (data.organic ?? []) as SerperResult[];

    const companies: Company[] = [];
    const seenDomains = new Set<string>();

    for (const result of results) {
      if (companies.length >= SERPER_COMPANY_LIMIT) break;
      let hostname: string;
      try {
        hostname = new URL(result.link).hostname.replace(/^www\./, "");
      } catch {
        continue;
      }
      if (isExcluded(hostname) || seenDomains.has(hostname)) continue;
      seenDomains.add(hostname);

      const name = cleanCompanyName(result.title);
      if (!name) continue;

      companies.push({
        id: `serper-${hostname}`,
        name,
        country,
        domain: hostname,
        source: `Serper search: "${industry}" (Google Search API, not a registry)`,
        provider: "serper",
      });
    }

    return companies;
  } catch {
    return [];
  }
}
