import { Contact } from "@/lib/types";
import { getSuppressionList } from "@/lib/suppressionStore";

/**
 * GATE — Suppression check
 *
 * Cross-references every contact against a persisted do-not-contact list
 * before it's allowed into the outreach queue. This is what keeps you off
 * spam blocklists and out of CASL/CAN-SPAM/GDPR trouble long-term — every
 * unsubscribe or bounce goes in here and stays.
 *
 * Storage: Vercel Edge Config when EDGE_CONFIG is set (durable across
 * redeploys), a local JSON file otherwise (dev-only durability). See
 * src/lib/suppressionStore.ts for the full picture, including the
 * disclosed tradeoff on how writes are made durable.
 */

export async function runSuppressionGate(contacts: Contact[]): Promise<{
  contacts: Contact[];
  log: string[];
  blocked: number;
}> {
  const log: string[] = [];
  const list = await getSuppressionList();
  const suppressed = new Set(list.map((s) => s.email.toLowerCase()));
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
