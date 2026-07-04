import { Company } from "@/lib/types";

/**
 * Australian Business Register (ABN Lookup) JSON API.
 *
 * Free, but requires registering for a GUID at
 * https://abr.business.gov.au/Tools/AbrApi — a same-day email
 * registration, not a purchase. Set ABR_GUID once you have it.
 *
 * Real constraint worth knowing: this is a name-search API, not a
 * "browse all companies" endpoint — there's no bulk list like SEC's
 * ticker file or Canada's CSV. To get a spread of real companies, this
 * rotates through a handful of generic industry keywords per run. It
 * also does NOT return director/officer data (confirmed against ABR's
 * own docs) — company universe only, name discovery still needs
 * Apollo/Google/demo for Australian leadership names.
 */

const ABR_BASE = "https://abr.business.gov.au/json";
const AU_COMPANY_LIMIT = 10;

// Rotates through these so repeated runs don't always return the exact
// same companies. Genuinely just a discovery seed, not a magic list.
const SEARCH_KEYWORDS = ["technology", "consulting", "logistics", "health", "construction", "finance", "retail", "manufacturing"];

interface AbrNameMatch {
  Names: { Name: string }[];
  Abn: string;
  IsCurrent: boolean;
  State?: string;
}

function stripJsonp(text: string): unknown {
  const match = text.match(/^callback\(([\s\S]*)\)$/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export async function fetchAustraliaCompanies(): Promise<Company[] | null> {
  const guid = process.env.ABR_GUID;
  if (!guid) return null;

  const keyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];

  try {
    const params = new URLSearchParams({
      name: keyword,
      maxResults: String(AU_COMPANY_LIMIT * 2), // over-fetch, then filter to current/active
      guid,
      callback: "callback",
    });
    const res = await fetch(`${ABR_BASE}/MatchingNames.aspx?${params.toString()}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const text = await res.text();
    const data = stripJsonp(text) as { Names?: AbrNameMatch[] } | null;
    const matches = data?.Names ?? [];

    const companies: Company[] = matches
      .filter((m) => m.IsCurrent)
      .slice(0, AU_COMPANY_LIMIT)
      .map((m) => ({
        id: `au-abr-${m.Abn}`,
        name: m.Names?.[0]?.Name ?? "Unknown",
        country: "AU" as const,
        registryId: `ABN-${m.Abn}`,
        source: `Australian Business Register (name search: "${keyword}")`,
        provider: "abr" as const,
      }));

    return companies.length > 0 ? companies : null;
  } catch {
    return null;
  }
}
