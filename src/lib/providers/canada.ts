import { Company } from "@/lib/types";

/**
 * Corporations Canada (ISED) — federal corporations.
 *
 * This is the best kind of free source: a government-published, no-key,
 * no-rate-limit-to-negotiate bulk CSV extract, updated regularly:
 * https://open.canada.ca/data/en/dataset/0032ce54-c5dd-4b66-99a0-320a7b5e99f2
 *
 * The full file covers 1.5M+ corporations, which is both too much to
 * pull every run and unnecessary — an HTTP Range request grabs just the
 * first chunk (confirmed the CDN supports it), which is plenty of rows
 * for a demo-scale run. No API key exists for this at all; this is not
 * a workaround, it's how the government intends the data to be used.
 *
 * Caveat: no website/domain field and no director/officer data — same
 * limitation as SEC's ticker list. Domain resolution and name discovery
 * still run as separate stages afterward.
 */

const CSV_URL = "https://d4bf66bykfyaf.cloudfront.net/corporations-active-cbca-en.csv";
const CA_COMPANY_LIMIT = 10;
const RANGE_BYTES = 50_000; // comfortably more than enough rows for CA_COMPANY_LIMIT after filtering

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export async function fetchCanadaCompanies(): Promise<Company[] | null> {
  try {
    const res = await fetch(CSV_URL, {
      headers: { Range: `bytes=0-${RANGE_BYTES}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok && res.status !== 206) return null;

    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 2) return null;

    const header = parseCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());
    const nameIdx = header.indexOf("Corporate name - form 1");
    const numberIdx = header.indexOf("Corporation number");
    const statusIdx = header.indexOf("Status");

    const companies: Company[] = [];
    // start at 1 to skip header, stop early once we have enough — the
    // last line is likely truncated mid-row from the range cut, so drop it
    for (let i = 1; i < lines.length - 1 && companies.length < CA_COMPANY_LIMIT; i++) {
      const fields = parseCsvLine(lines[i]);
      const name = fields[nameIdx]?.trim();
      const number = fields[numberIdx]?.trim();
      const status = fields[statusIdx]?.trim();
      if (!name || !number || status !== "Active") continue;

      companies.push({
        id: `ca-corp-${number}`,
        name,
        country: "CA",
        registryId: `CBCA-${number}`,
        source: "Corporations Canada (Open Government bulk extract)",
        provider: "corporations_canada",
      });
    }

    return companies;
  } catch {
    return null;
  }
}
