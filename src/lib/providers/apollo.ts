import { Company, Contact } from "@/lib/types";

/**
 * Apollo.io integration.
 *
 * Two calls are needed, not one — this is Apollo's actual API shape, not
 * a simplification:
 *  1. POST /mixed_people/api_search — find candidate people at a domain
 *     by title. Free (doesn't consume credits), but does NOT return an
 *     email, and on lower-tier plans the last name comes back obfuscated
 *     ("Po***r").
 *  2. POST /people/match — enrich ONE specific person by their Apollo id
 *     to get the real name + email. This DOES consume a credit per call.
 *
 * Because step 2 costs money, this is capped hard per run
 * (APOLLO_MATCH_LIMIT) and only runs at all if APOLLO_API_KEY is set.
 */

const APOLLO_BASE = "https://api.apollo.io/api/v1";
const LEADERSHIP_TITLES = ["CEO", "Chief Executive Officer", "Founder", "Co-Founder", "Owner", "Managing Director"];

// Hard cap on paid enrichment calls per pipeline run. Search (step 1) is
// free, so this only limits how many people get the costly step-2 call.
const APOLLO_MATCH_LIMIT = 5;

let matchesUsedThisRun = 0;

export function resetApolloRunBudget() {
  matchesUsedThisRun = 0;
}

interface ApolloSearchPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  last_name_obfuscated?: string;
  title?: string;
}

async function searchApolloPeople(domain: string): Promise<ApolloSearchPerson[]> {
  try {
    const res = await fetch(`${APOLLO_BASE}/mixed_people/api_search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": process.env.APOLLO_API_KEY!,
      },
      body: JSON.stringify({
        q_organization_domains: domain,
        person_titles: LEADERSHIP_TITLES,
        per_page: 3,
        page: 1,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.people ?? []) as ApolloSearchPerson[];
  } catch {
    return [];
  }
}

async function matchApolloPerson(id: string): Promise<{ name: string; title: string; email?: string } | null> {
  try {
    const res = await fetch(`${APOLLO_BASE}/people/match?id=${encodeURIComponent(id)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": process.env.APOLLO_API_KEY!,
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const person = data.person;
    if (!person) return null;
    return {
      name: person.name || [person.first_name, person.last_name].filter(Boolean).join(" "),
      title: person.title || "Executive",
      email: person.email || undefined,
    };
  } catch {
    return null;
  }
}

export async function findLeaderViaApollo(
  company: Company
): Promise<Pick<Contact, "name" | "title" | "email" | "emailSource" | "discoverySource"> | null> {
  if (!company.domain) return null;
  if (matchesUsedThisRun >= APOLLO_MATCH_LIMIT) return null;

  const candidates = await searchApolloPeople(company.domain);
  const top = candidates[0];
  if (!top) return null;

  matchesUsedThisRun += 1;
  const matched = await matchApolloPerson(top.id);
  if (!matched) return null;

  return {
    name: matched.name,
    title: matched.title,
    email: matched.email,
    emailSource: matched.email ? "apollo" : undefined,
    discoverySource: "Apollo.io people search + enrichment",
  };
}
