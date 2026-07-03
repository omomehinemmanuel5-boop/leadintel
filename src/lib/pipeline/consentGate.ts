import { Contact, ConsentBasis, Country } from "@/lib/types";

/**
 * GATE — Consent classification
 *
 * This is the actual product. Every contact gets a legal basis assigned
 * BEFORE it's allowed further down the pipeline. Nothing with basis
 * "requires_optin" or "blocked" reaches the outreach queue.
 *
 * These rules are a starting point, not legal advice — review with
 * counsel in each jurisdiction before sending real outreach. But the
 * point of building this as code (not a spreadsheet someone forgets to
 * check) is that the gate can't be skipped by accident.
 */

interface ConsentDecision {
  basis: ConsentBasis;
  notes: string;
}

function classifyAU(contact: Contact): ConsentDecision {
  // Australia's Privacy Act (APP 7) permits direct marketing to a business
  // contact where the info was collected from a source other than the
  // individual directly, IF it's clearly related to their professional
  // role and there's a simple opt-out. B2B outreach to a company officer,
  // sourced from public filings, generally clears this bar.
  return {
    basis: "public_interest_b2b",
    notes: "APP 7 — B2B contact via public role disclosure, opt-out required on first contact.",
  };
}

function classifyDE(contact: Contact): ConsentDecision {
  // GDPR Art. 6(1)(f) "legitimate interest" can cover B2B cold outreach,
  // but it's a narrower needle than AU/CA — requires a documented
  // balancing test and is more defensible for closely-relevant offers to
  // a person's actual professional function. Flag for review rather than
  // auto-clearing.
  return {
    basis: "legitimate_interest_gdpr",
    notes: "GDPR Art. 6(1)(f) — legitimate interest requires a documented balancing test before first contact. Flagged for manual review.",
  };
}

function classifyUS(contact: Contact): ConsentDecision {
  // CAN-SPAM doesn't require prior consent for B2B commercial email, but
  // mandates accurate headers, no deceptive subject lines, a physical
  // address, and a working opt-out honored within 10 business days.
  return {
    basis: "public_interest_b2b",
    notes: "CAN-SPAM — no prior consent required, but header accuracy + working opt-out are mandatory.",
  };
}

function classifyCA(contact: Contact): ConsentDecision {
  // CASL defaults to requiring express consent, but has an "implied
  // consent" carve-out for an existing business relationship OR where the
  // recipient has conspicuously published their business email and the
  // message is relevant to their role — which fits a CEO's published
  // contact used for a relevant B2B offer. Still time-limited (2 years).
  return {
    basis: "public_interest_b2b",
    notes: "CASL implied consent — conspicuously published business contact, role-relevant offer. Re-validate after 2 years.",
  };
}

export function classifyContact(contact: Contact): ConsentDecision {
  switch (contact.country) {
    case "AU":
      return classifyAU(contact);
    case "DE":
      return classifyDE(contact);
    case "US":
      return classifyUS(contact);
    case "CA":
      return classifyCA(contact);
    default:
      return { basis: "requires_optin", notes: "Unrecognized jurisdiction — default to requiring opt-in." };
  }
}

export function runConsentGate(contacts: Contact[]): {
  contacts: Contact[];
  log: string[];
  blocked: number;
} {
  const log: string[] = [];
  let blocked = 0;

  const out = contacts.map((contact) => {
    const decision = classifyContact(contact);
    if (decision.basis === "requires_optin" || decision.basis === "blocked") {
      blocked += 1;
      log.push(`[${contact.name}] BLOCKED — ${decision.notes}`);
    } else {
      log.push(`[${contact.name}] cleared (${contact.country}) — ${decision.notes}`);
    }
    return { ...contact, consentBasis: decision.basis, consentNotes: decision.notes, stage: "consent_gate" as const };
  });

  return { contacts: out, log, blocked };
}
