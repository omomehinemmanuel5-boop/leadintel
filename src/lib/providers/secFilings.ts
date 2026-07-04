import { Company, Contact } from "@/lib/types";
import { looksLikeHumanName } from "@/lib/nameExtraction";

/**
 * SEC DEF 14A (proxy statement) name extraction.
 *
 * Every US public company files a DEF 14A annually listing its named
 * executive officers by name and title — it's a legal disclosure
 * requirement, not something scraped from a website. This is genuinely
 * free and needs zero registration (same User-Agent fair-access policy
 * as the rest of the SEC integration), and it's a MORE authoritative
 * source than the Google heuristic in google.ts, since it's reading an
 * official regulatory filing rather than parsing arbitrary HTML.
 *
 * Only applies to companies sourced from SEC EDGAR (i.e. has a CIK in
 * registryId) — this is a US-only, public-company-only source.
 *
 * Verified against real filings during development: the regex alone
 * produces false positives (e.g. matching "Compensation Committee. The"
 * when it sits next to "Chief Executive Officer" in boilerplate text).
 * Every match is run through looksLikeHumanName() before being trusted —
 * matches that fail are treated as "not found", not "found, but wrong."
 */

const SEC_USER_AGENT = "leadintel research@aureonics.systems";
const FULL_TEXT_SEARCH = "https://efts.sec.gov/LATEST/search-index";

const CEO_NAME_RE =
  /([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.]+){1,3})\s+(?:Director(?:\s+and)?\s+)?Chief Executive Officer/;

interface FullTextHit {
  _id: string; // e.g. "0001047469-04-007414:a2129874zdef14a.htm"
  _source: { ciks: string[]; file_date: string };
}

function extractCik(registryId?: string): string | null {
  const match = registryId?.match(/CIK-(\d+)/);
  return match ? match[1] : null;
}

async function findMostRecentDef14a(cik: string): Promise<{ url: string; filedDate: string } | null> {
  try {
    const params = new URLSearchParams({ q: '"Chief Executive Officer"', forms: "DEF 14A", ciks: cik });
    const res = await fetch(`${FULL_TEXT_SEARCH}?${params.toString()}`, {
      headers: { "User-Agent": SEC_USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const hits = (data.hits?.hits ?? []) as FullTextHit[];
    if (hits.length === 0) return null;

    // pick the most recently filed, not just the most textually relevant
    const newest = hits.reduce((a, b) => (a._source.file_date > b._source.file_date ? a : b));
    const [accession, filename] = newest._id.split(":");
    const accessionNoDashes = accession.replace(/-/g, "");
    const cikNoLeadingZeros = String(Number(cik));

    return {
      url: `https://www.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accessionNoDashes}/${filename}`,
      filedDate: newest._source.file_date,
    };
  } catch {
    return null;
  }
}

export async function findLeaderViaSecProxy(
  company: Company
): Promise<Pick<Contact, "name" | "title" | "discoverySource"> | null> {
  const cik = extractCik(company.registryId);
  if (!cik) return null;

  const filing = await findMostRecentDef14a(cik);
  if (!filing) return null;

  try {
    const res = await fetch(filing.url, {
      headers: { "User-Agent": SEC_USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const text = html
      .replace(/&nbsp;/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");

    const match = text.match(CEO_NAME_RE);
    if (!match) return null;

    const candidate = match[1].trim();
    if (!looksLikeHumanName(candidate)) return null;

    return {
      name: candidate,
      title: "CEO",
      discoverySource: `SEC DEF 14A proxy statement, filed ${filing.filedDate} -> ${filing.url}`,
    };
  } catch {
    return null;
  }
}
