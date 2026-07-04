import fs from "fs";
import path from "path";
import { Company, Contact } from "@/lib/types";
import { hasApollo, hasGoogle } from "@/lib/providers/config";
import { findLeaderViaApollo, resetApolloRunBudget } from "@/lib/providers/apollo";
import { findLeaderViaGoogle } from "@/lib/providers/google";

/**
 * STAGE 3 — Name discovery
 *
 * Provider chain, in order:
 *  1. Apollo.io (if APOLLO_API_KEY set) — real database match, highest
 *     confidence, but costs credits, so it's tried first and capped.
 *  2. Google Custom Search (if GOOGLE_API_KEY/GOOGLE_CSE_ID set) — reads
 *     only the company's own site, free, but lower confidence (regex
 *     extraction over HTML, not a structured match).
 *  3. Demo seed data — fictional, clearly labeled, keeps the pipeline
 *     runnable with zero keys configured.
 *
 * If none of the three find anything, the contact is skipped and the
 * log says exactly why — never silently faked.
 */

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
  resetApolloRunBudget();

  for (const company of companies) {
    // 1. Apollo
    if (hasApollo()) {
      const found = await findLeaderViaApollo(company);
      if (found) {
        contacts.push({
          id: `${company.id}-lead`,
          companyId: company.id,
          name: found.name,
          title: found.title,
          country: company.country,
          discoverySource: found.discoverySource,
          provider: "apollo",
          email: found.email,
          emailSource: found.emailSource,
          stage: "name_discovery",
        });
        log.push(`[${company.name}] found via Apollo.io${found.email ? " (email included)" : " (no email on this match)"}`);
        continue;
      }
    }

    // 2. Google
    if (hasGoogle()) {
      const found = await findLeaderViaGoogle(company);
      if (found) {
        contacts.push({
          id: `${company.id}-lead`,
          companyId: company.id,
          name: found.name,
          title: found.title,
          country: company.country,
          discoverySource: found.discoverySource,
          provider: "google_search",
          stage: "name_discovery",
        });
        log.push(`[${company.name}] found via Google Search (heuristic, lower confidence)`);
        continue;
      }
    }

    // 3. Demo fallback
    const seeded = seedLeadership[company.id];
    if (seeded) {
      contacts.push({
        id: `${company.id}-lead`,
        companyId: company.id,
        name: seeded.name,
        title: seeded.title,
        country: company.country,
        discoverySource: seeded.discoverySource,
        provider: "demo",
        stage: "name_discovery",
      });
      log.push(`[${company.name}] no live provider match — using demo leadership record (${seeded.discoverySource})`);
      continue;
    }

    if (company.provider === "demo") {
      log.push(`[${company.name}] no leader found (demo record has none) — skipped`);
    } else {
      const configured = [hasApollo() && "Apollo", hasGoogle() && "Google"].filter(Boolean);
      log.push(
        configured.length > 0
          ? `[${company.name}] ${configured.join(" and ")} found nothing for this company — skipped`
          : `[${company.name}] real company, no name-discovery provider configured (set APOLLO_API_KEY and/or GOOGLE_API_KEY+GOOGLE_CSE_ID) — skipped`
      );
    }
  }

  return { contacts, log };
}
