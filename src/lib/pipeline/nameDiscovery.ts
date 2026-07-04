import fs from "fs";
import path from "path";
import { Company, Contact } from "@/lib/types";

/**
 * STAGE 3 — Name discovery
 *
 * IMPORTANT: this stage only ever reads from sources where the COMPANY
 * itself disclosed the leader's name publicly — never a third-party
 * platform profile. Valid sources:
 *  - The target company's own /about, /leadership, /team, /ueber-uns page
 *  - Press releases naming the CEO/founder
 *  - Public regulatory filings that list officers/directors
 *    (SEC EDGAR, ASIC AU, Corporations Canada, Handelsregister DE)
 *
 * This skeleton ships with demo leadership data so the pipeline is
 * runnable end-to-end. Swap `discoverLive` for a real page-fetch +
 * extraction once you're targeting real companies — and keep it scoped
 * to the company's own domain, never a social platform.
 */

async function discoverLive(_company: Company): Promise<Contact | null> {
  // TODO: fetch `${company.domain}/about` (or /leadership, /team,
  // /ueber-uns for DE) and extract a name + title near words like
  // "CEO", "Founder", "Geschäftsführer". Keep this scoped to pages the
  // company itself published, on the company's own domain.
  return null;
}

function loadSeedLeadership(): Record<string, { name: string; title: string; discoverySource: string }> {
  const seedPath = path.join(process.cwd(), "data", "seed-companies.json");
  const raw = fs.readFileSync(seedPath, "utf-8");
  const parsed = JSON.parse(raw);
  return parsed.leadership;
}

export async function discoverNames(companies: Company[]): Promise<{
  contacts: Contact[];
  log: string[];
}> {
  const log: string[] = [];
  const contacts: Contact[] = [];
  const seedLeadership = loadSeedLeadership();

  for (const company of companies) {
    const live = await discoverLive(company);
    if (live) {
      contacts.push({ ...live, id: `${company.id}-lead`, companyId: company.id, country: company.country, stage: "name_discovery" });
      log.push(`[${company.name}] found leader via live connector`);
      continue;
    }

    const seeded = seedLeadership[company.id];
    if (seeded) {
      contacts.push({
        id: `${company.id}-lead`,
        companyId: company.id,
        name: seeded.name,
        title: seeded.title,
        country: company.country,
        discoverySource: seeded.discoverySource,
        stage: "name_discovery",
      });
      log.push(`[${company.name}] no live connector — using demo leadership record (${seeded.discoverySource})`);
    } else if (company.source.startsWith("seed:")) {
      log.push(`[${company.name}] no leader found (live or demo) — skipped`);
    } else {
      log.push(
        `[${company.name}] real company from ${company.source} — leadership discovery not wired for this source yet (see TODO in nameDiscovery.ts), skipped`
      );
    }
  }

  return { contacts, log };
}
