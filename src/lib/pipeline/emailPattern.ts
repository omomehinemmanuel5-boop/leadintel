import { Contact } from "@/lib/types";
import { Company } from "@/lib/types";

/**
 * STAGE 4 — Email pattern inference
 *
 * Infers a likely email address from name + domain using the most common
 * B2B patterns. Confidence is intentionally conservative — this stage
 * only guesses, verification (stage 5) is what confirms.
 */

interface PatternGuess {
  email: string;
  pattern: string;
  confidence: number;
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  return { first, last };
}

function guessPatterns(name: string, domain: string): PatternGuess[] {
  const { first, last } = splitName(name);
  if (!first || !last) return [];

  return [
    { email: `${first}.${last}@${domain}`, pattern: "first.last", confidence: 0.45 },
    { email: `${first}${last}@${domain}`, pattern: "firstlast", confidence: 0.2 },
    { email: `${first[0]}${last}@${domain}`, pattern: "flast", confidence: 0.25 },
    { email: `${first}@${domain}`, pattern: "first", confidence: 0.15 },
  ];
}

export function inferEmailPatterns(contacts: Contact[], companies: Company[]): {
  contacts: Contact[];
  log: string[];
} {
  const log: string[] = [];
  const domainByCompany = new Map(companies.map((c) => [c.id, c.domain]));

  const out = contacts.map((contact) => {
    const domain = domainByCompany.get(contact.companyId);
    if (!domain) {
      log.push(`[${contact.name}] no domain resolved — skipping pattern inference`);
      return { ...contact, stage: "email_pattern" as const };
    }

    const guesses = guessPatterns(contact.name, domain).sort((a, b) => b.confidence - a.confidence);
    const best = guesses[0];
    if (!best) {
      log.push(`[${contact.name}] could not parse name into first/last`);
      return { ...contact, stage: "email_pattern" as const };
    }

    log.push(`[${contact.name}] best guess ${best.email} (pattern: ${best.pattern}, confidence: ${best.confidence})`);
    return {
      ...contact,
      email: best.email,
      emailPattern: best.pattern,
      emailConfidence: best.confidence,
      stage: "email_pattern" as const,
    };
  });

  return { contacts: out, log };
}
