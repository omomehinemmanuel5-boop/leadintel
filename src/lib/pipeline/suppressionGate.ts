import fs from "fs";
import path from "path";
import { Contact } from "@/lib/types";

/**
 * GATE — Suppression check
 *
 * Cross-references every contact against a persisted do-not-contact list
 * before it's allowed into the outreach queue. This is what keeps you off
 * spam blocklists and out of CASL/CAN-SPAM/GDPR trouble long-term — every
 * unsubscribe or bounce goes in here and stays.
 *
 * Storage: a flat JSON file for the skeleton. Swap for a real DB (e.g.
 * Vercel Postgres / Supabase free tier) before production — this file
 * approach doesn't survive serverless cold starts reliably.
 */

const SUPPRESSION_PATH = path.join(process.cwd(), "data", "suppression-list.json");

interface SuppressionEntry {
  email: string;
  reason: string;
  addedAt: string;
}

function loadSuppressionList(): SuppressionEntry[] {
  try {
    const raw = fs.readFileSync(SUPPRESSION_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addToSuppressionList(email: string, reason: string) {
  const list = loadSuppressionList();
  list.push({ email: email.toLowerCase(), reason, addedAt: new Date().toISOString() });
  fs.writeFileSync(SUPPRESSION_PATH, JSON.stringify(list, null, 2));
}

export function runSuppressionGate(contacts: Contact[]): {
  contacts: Contact[];
  log: string[];
  blocked: number;
} {
  const log: string[] = [];
  const suppressed = new Set(loadSuppressionList().map((s) => s.email.toLowerCase()));
  let blocked = 0;

  const out = contacts.map((contact) => {
    if (!contact.email) {
      return { ...contact, stage: "suppression_gate" as const };
    }

    const isSuppressed = suppressed.has(contact.email.toLowerCase());
    if (isSuppressed) {
      blocked += 1;
      log.push(`[${contact.name}] BLOCKED — ${contact.email} is on the suppression list`);
    } else {
      log.push(`[${contact.name}] cleared suppression check`);
    }

    return {
      ...contact,
      suppressed: isSuppressed,
      suppressionReason: isSuppressed ? "on do-not-contact list" : undefined,
      stage: "suppression_gate" as const,
    };
  });

  return { contacts: out, log, blocked };
}
