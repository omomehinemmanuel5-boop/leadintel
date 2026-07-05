import { Company, Contact } from "@/lib/types";
import { trimToValidName } from "@/lib/nameExtraction";

/**
 * SEC Form 10-K, Item 401 "Information About Our Executive Officers".
 *
 * Free, zero registration — same as the rest of the SEC integration.
 * This is a BETTER source than the DEF 14A proxy extraction in
 * secFilings.ts when it's available, because Item 401 lists ONLY
 * current executive officers — no director bios mentioning past jobs
 * at other companies to accidentally match against.
 *
 * Real coverage, verified against actual filings during development
 * (not assumed):
 *  - NVIDIA: "Name Age Position" table format — works
 *  - Micron: alphabetical prose list, name directly before title — works
 *  - Broadcom: "Name and Title Age Position and Offices" table — works
 *  - Tesla: does NOT inline this section — incorporates Item 10 by
 *    reference to their proxy statement instead. This is common enough
 *    that a meaningful fraction of 10-Ks will return nothing here, by
 *    design, not by bug. When that happens, secFilings.ts (DEF 14A) is
 *    tried next in the provider chain.
 */

const SEC_USER_AGENT = "leadintel research@aureonics.systems";
const FULL_TEXT_SEARCH = "https://efts.sec.gov/LATEST/search-index";

interface FullTextHit {
  _id: string;
  _source: { file_date: string };
}

function extractCik(registryId?: string): string | null {
  const match = registryId?.match(/CIK-(\d+)/);
  return match ? match[1] : null;
}

async function findMostRecent10K(cik: string): Promise<{ url: string; filedDate: string } | null> {
  try {
    const params = new URLSearchParams({ q: '"Information About Our Executive Officers"', forms: "10-K", ciks: cik });
    const res = await fetch(`${FULL_TEXT_SEARCH}?${params.toString()}`, {
      headers: { "User-Agent": SEC_USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const hits = (data.hits?.hits ?? []) as FullTextHit[];
    if (hits.length === 0) return null;

    const newest = hits.reduce((a, b) => (a._source.file_date > b._source.file_date ? a : b));
    const [accession, filename] = newest._id.split(":");
    const cikNoLeadingZeros = String(Number(cik));

    return {
      url: `https://www.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accession.replace(/-/g, "")}/${filename}`,
      filedDate: newest._source.file_date,
    };
  } catch {
    return null;
  }
}

function getOfficerSection(text: string): string | null {
  const idx = text.search(/Information [Aa]bout [Oo]ur Executive Officers/);
  if (idx === -1) return null;
  let section = text.slice(idx, idx + 8000);
  for (const marker of ["Item 1B", "Item 2.", "Unresolved Staff Comments"]) {
    const markerIdx = section.indexOf(marker);
    if (markerIdx !== -1) {
      section = section.slice(0, markerIdx);
      break;
    }
  }
  return section;
}

// Format 1: a structured table — "Name [and Title] Age Position [and Offices]"
function tryTableFormat(section: string): string | null {
  const headerMatch = section.match(/Name[^.]{0,25}Age[^.]{0,25}Position/);
  if (!headerMatch || headerMatch.index === undefined) return null;

  const tableText = section.slice(headerMatch.index + headerMatch[0].length);
  const rowMatch = tableText.match(/([A-Z][A-Za-z.\-]+(?:\s[A-Z][A-Za-z.\-]+){1,3})\s+(\d{2,3})\s+/);
  if (!rowMatch || rowMatch.index === undefined) return null;

  const afterRow = tableText.slice(rowMatch.index + rowMatch[0].length, rowMatch.index + rowMatch[0].length + 80);
  const nextDigit = afterRow.search(/\d/);
  const positionText = nextDigit === -1 ? afterRow : afterRow.slice(0, nextDigit);

  if (!/Chief Executive Officer/.test(positionText)) return null;
  return trimToValidName(rowMatch[1]);
}

// Format 2: alphabetical prose list — name sits directly before the title,
// no age number in between (e.g. Micron's officer list)
function tryProseFormat(section: string): string | null {
  const pattern =
    /([A-Z][A-Za-z.\-]+(?:\s[A-Z][A-Za-z.\-]+){1,4})\s+(?:(?:President|Chairman|Founder|Co-Founder|Director|Corporate|Executive|Senior|Vice)[,\s]*(?:and\s+)?){0,4}Chief Executive Officer/;
  const match = section.match(pattern);
  if (!match) return null;
  return trimToValidName(match[1]);
}

export async function findLeaderViaSecOfficerTable(
  company: Company
): Promise<Pick<Contact, "name" | "title" | "discoverySource"> | null> {
  const cik = extractCik(company.registryId);
  if (!cik) return null;

  const filing = await findMostRecent10K(cik);
  if (!filing) return null; // common — many 10-Ks incorporate this by reference instead

  try {
    const res = await fetch(filing.url, {
      headers: { "User-Agent": SEC_USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#8217;/g, "'")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ");

    const section = getOfficerSection(text);
    if (!section) return null;

    const name = tryTableFormat(section) ?? tryProseFormat(section);
    if (!name) return null;

    return {
      name,
      title: "CEO",
      discoverySource: `SEC 10-K, Item 401 executive officers, filed ${filing.filedDate} -> ${filing.url}`,
    };
  } catch {
    return null;
  }
}
