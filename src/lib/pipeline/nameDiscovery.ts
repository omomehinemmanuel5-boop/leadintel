import fs from "fs";
import path from "path";
import { Company, Contact } from "@/lib/types";
import { hasApollo, hasGoogle } from "@/lib/providers/config";
import { findLeaderViaApollo, resetApolloRunBudget } from "@/lib/providers/apollo";
import { findLeaderViaSecOfficerTable } from "@/lib/providers/secOfficerTable";
import { findLeaderViaGoogle } from "@/lib/providers/google";

/**
 * STAGE 3 — Name discovery
 *
 * Provider chain, in order:
 *  1. Apollo.io (if APOLLO_API_KEY set) — real database match, highest
 *     confidence, but costs credits, so it's tried first and capped.
 *  2. SEC 10-K, Item 401 executive officer table (US, free, zero
 *     registration) — reliable because this section is structurally
 *     guaranteed to be about the filing company's OWN officers.
 *     Coverage isn't universal: some companies (Tesla, notably)
 *     incorporate this section by reference to their proxy instead of
 *     inlining it, so this legitimately returns nothing for them.
 *  3. Google Custom Search (if GOOGLE_API_KEY/GOOGLE_CSE_ID set) — reads
 *     only the company's own site, free, but lower confidence (regex
 *     extraction over HTML, not a structured match).
 *  4. Demo seed data — fictional, clearly labeled, keeps the pipeline
 *     runnable with zero keys configured.
 *
 * NOT in this chain: DEF 14A proxy statement extraction
 * (src/lib/providers/secFilings.ts exists but is deliberately not
 * imported here). Caught during live testing: Tesla's own proxy
 * statement discusses Tim Cook's compensation as a peer-benchmarking
 * comparison (common in "mega-grant" CEO pay disclosures), and the
 * extraction had no way to distinguish "this company's own CEO" from
 * "a peer company's CEO mentioned for comparison" — it returned "Tim
 * Cook" as Tesla's CEO. That's a wrong answer that looks completely
 * legitimate, which is worse than finding nothing. Left the file in
 * place since the underlying idea works for many filings, but it needs
 * a same-company anchor check before it's safe to re-enable.
 *
 * If none of the four active sources find anything, the contact is
 * skipped and the log says exactly why — never silently faked.
 */

function loadSeedLeadership(): Record<string, { name: string; title: string; discoverySource: string }> {
  const seedPath = path.join(process.cwd(), "data", "seed-companies.json");
  const raw = fs.readFileSync(seedPath, "utf-8");
  const parsed = JSON.parse(raw);
  return parsed.leadership;
}

async function discoverOneCompany(
  company: Company,
  seedLeadership: Record<string, { name: string; title: string; discoverySource: string }>
): Promise<{ contact: Contact | null; log: string }> {
  // 1. Apollo
  if (hasApollo()) {
    const found = await findLeaderViaApollo(company);
    if (found) {
      return {
        contact: {
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
        },
        log: `[${company.name}] found via Apollo.io${found.email ? " (email included)" : " (no email on this match)"}`,
      };
    }
  }

  // 2. SEC 10-K Item 401 executive officer table (US, free, no registration)
  if (company.provider === "sec_edgar") {
    const found = await findLeaderViaSecOfficerTable(company);
    if (found) {
      return {
        contact: {
          id: `${company.id}-lead`,
          companyId: company.id,
          name: found.name,
          title: found.title,
          country: company.country,
          discoverySource: found.discoverySource,
          provider: "sec_proxy",
          stage: "name_discovery",
        },
        log: `[${company.name}] found via SEC 10-K officer table (most reliable free source)`,
      };
    }
  }

  // 3. Google
  if (hasGoogle()) {
    const found = await findLeaderViaGoogle(company);
    if (found) {
      return {
        contact: {
          id: `${company.id}-lead`,
          companyId: company.id,
          name: found.name,
          title: found.title,
          country: company.country,
          discoverySource: found.discoverySource,
          provider: "google_search",
          stage: "name_discovery",
        },
        log: `[${company.name}] found via Google Search (heuristic, lower confidence)`,
      };
    }
  }

  // 4. Demo fallback
  const seeded = seedLeadership[company.id];
  if (seeded) {
    return {
      contact: {
        id: `${company.id}-lead`,
        companyId: company.id,
        name: seeded.name,
        title: seeded.title,
        country: company.country,
        discoverySource: seeded.discoverySource,
        provider: "demo",
        stage: "name_discovery",
      },
      log: `[${company.name}] no live provider match — using demo leadership record (${seeded.discoverySource})`,
    };
  }

  if (company.provider === "demo") {
    return { contact: null, log: `[${company.name}] no leader found (demo record has none) — skipped` };
  }

  const attempted = [
    hasApollo() && "Apollo",
    company.provider === "sec_edgar" && "SEC 10-K officer table search",
    hasGoogle() && "Google",
  ].filter(Boolean);
  return {
    contact: null,
    log:
      attempted.length > 0
        ? `[${company.name}] ${attempted.join(", ")} found nothing for this company — skipped`
        : `[${company.name}] real company, no name-discovery provider configured (set APOLLO_API_KEY and/or GOOGLE_API_KEY+GOOGLE_CSE_ID) — skipped`,
  };
}

export async function discoverNames(companies: Company[]): Promise<{
  contacts: Contact[];
  log: string[];
}> {
  const seedLeadership = loadSeedLeadership();
  resetApolloRunBudget();

  // Run every company's discovery attempt in parallel — this used to be
  // a sequential for-loop, which was fine when each company only needed
  // one fast lookup, but broke down once the SEC 10-K provider added two
  // sequential network calls per company. A 25-company US run went
  // sequential-25x-slow and blew past the function timeout in
  // production before this fix (confirmed by testing, not theoretical).
  const results = await Promise.all(companies.map((company) => discoverOneCompany(company, seedLeadership)));

  const contacts = results.map((r) => r.contact).filter((c): c is Contact => c !== null);
  const log = results.map((r) => r.log);

  return { contacts, log };
}
