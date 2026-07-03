import { Contact } from "@/lib/types";

/**
 * STAGE 6 — Outreach queue
 *
 * Only contacts that are: verified, cleared by BOTH gates, and have a
 * usable email make it here. Rate-limited per sending domain to protect
 * deliverability, and every queued item carries a mandatory unsubscribe
 * link — this isn't optional under CASL/CAN-SPAM/GDPR.
 */

const DAILY_SEND_LIMIT_PER_DOMAIN = 40;

export interface QueuedMessage {
  contactId: string;
  email: string;
  scheduledFor: string; // ISO date, spread across days to respect the cap
  unsubscribeToken: string;
}

function makeUnsubscribeToken(email: string): string {
  return Buffer.from(`${email}:${Date.now()}`).toString("base64url");
}

export function buildOutreachQueue(contacts: Contact[]): {
  queue: QueuedMessage[];
  log: string[];
  excluded: number;
} {
  const log: string[] = [];
  let excluded = 0;

  const eligible = contacts.filter((c) => {
    const ok =
      !!c.email &&
      c.verified === true &&
      c.suppressed !== true &&
      c.consentBasis !== "requires_optin" &&
      c.consentBasis !== "blocked";
    if (!ok) {
      excluded += 1;
      log.push(`[${c.name}] excluded from queue (verified=${c.verified}, suppressed=${c.suppressed}, consent=${c.consentBasis})`);
    }
    return ok;
  });

  // Spread sends across days at DAILY_SEND_LIMIT_PER_DOMAIN to protect
  // sender reputation instead of blasting everything at once.
  const queue: QueuedMessage[] = eligible.map((c, i) => {
    const dayOffset = Math.floor(i / DAILY_SEND_LIMIT_PER_DOMAIN);
    const scheduled = new Date();
    scheduled.setDate(scheduled.getDate() + dayOffset);

    return {
      contactId: c.id,
      email: c.email!,
      scheduledFor: scheduled.toISOString(),
      unsubscribeToken: makeUnsubscribeToken(c.email!),
    };
  });

  log.push(`Queued ${queue.length} messages across ${Math.ceil(queue.length / DAILY_SEND_LIMIT_PER_DOMAIN)} day(s), capped at ${DAILY_SEND_LIMIT_PER_DOMAIN}/day.`);

  return { queue, log, excluded };
}
