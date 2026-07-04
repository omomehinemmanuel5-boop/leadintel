import { Company, Contact } from "@/lib/types";
import { looksLikeHumanName } from "@/lib/nameExtraction";

/**
 * Google Programmable Search Engine (Custom Search JSON API).
 *
 * Free tier: 100 queries/day. Used for two things, both scoped to a
 * company's OWN domain — never used to search LinkedIn or any other
 * third-party platform, consistent with this project's name-discovery
 * rule:
 *
 *  1. Domain fallback — when the DNS-heuristic guess in
 *     domainResolution.ts fails, ask Google what the real site is.
 *  2. Leadership page discovery — find the About/Leadership page on a
 *     company's own domain, fetch it, and run a best-effort heuristic
 *     extraction for a name near "CEO"/"Founder". This is explicitly
 *     lower-confidence than Apollo or SEC data — it's regex over HTML,
 *     not a structured API response — and is labeled as such wherever
 *     it surfaces in the UI.
 */

const CSE_BASE = "https://www.googleapis.com/customsearch/v1";

async function googleSearch(query: string): Promise<{ title: string; link: string; snippet: string }[]> {
  try {
    const params = new URLSearchParams({
      key: process.env.GOOGLE_API_KEY!,
      cx: process.env.GOOGLE_CSE_ID!,
      q: query,
      num: "3",
    });
    const res = await fetch(`${CSE_BASE}?${params.toString()}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((item: { title: string; link: string; snippet: string }) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    }));
  } catch {
    return [];
  }
}

export async function findDomainViaGoogle(companyName: string, country: string): Promise<string | undefined> {
  const results = await googleSearch(`${companyName} official website ${country}`);
  const top = results[0];
  if (!top) return undefined;
  try {
    return new URL(top.link).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

const NAME_NEAR_TITLE_RE =
  /([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s*(?:,|-|–|\|)?\s*(CEO|Chief Executive Officer|Founder|Co-Founder|Managing Director)/;
const TITLE_NEAR_NAME_RE =
  /(CEO|Chief Executive Officer|Founder|Co-Founder|Managing Director)\s*(?:,|-|–|\||:)?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})/;

function extractNameNearTitle(text: string): { name: string; title: string } | null {
  const m1 = text.match(NAME_NEAR_TITLE_RE);
  if (m1) return { name: m1[1], title: m1[2] };
  const m2 = text.match(TITLE_NEAR_NAME_RE);
  if (m2) return { name: m2[2], title: m2[1] };
  return null;
}

export async function findLeaderViaGoogle(
  company: Company
): Promise<Pick<Contact, "name" | "title" | "discoverySource"> | null> {
  if (!company.domain) return null;

  const results = await googleSearch(`site:${company.domain} CEO OR Founder OR "leadership team"`);
  const top = results[0];
  if (!top) return null;

  try {
    const res = await fetch(top.link, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");

    const found = extractNameNearTitle(text) ?? extractNameNearTitle(top.snippet);
    if (!found || !looksLikeHumanName(found.name)) return null;

    return {
      name: found.name,
      title: found.title,
      discoverySource: `Google Search -> ${top.link} (heuristic extraction, lower confidence)`,
    };
  } catch {
    return null;
  }
}
