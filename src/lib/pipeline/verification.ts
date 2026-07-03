import { Contact } from "@/lib/types";

/**
 * STAGE 5 — Verification
 *
 * Confirms the domain in a guessed email actually accepts mail (MX lookup)
 * WITHOUT sending anything. This is real, free, and needs no API key —
 * it's a plain DNS query.
 *
 * For higher-confidence verification (does THIS specific mailbox exist,
 * not just the domain), plug in a free-tier service like ZeroBounce
 * (100/mo free) or a self-hosted SMTP RCPT-TO handshake — left as a TODO
 * since it needs careful IP reputation handling to not look like abuse.
 */

async function domainAcceptsMail(domain: string): Promise<boolean> {
  try {
    const dns = await import("dns/promises");
    const mx = await dns.resolveMx(domain).catch(() => null);
    return !!(mx && mx.length > 0);
  } catch {
    return false;
  }
}

export async function verifyContacts(contacts: Contact[]): Promise<{
  contacts: Contact[];
  log: string[];
}> {
  const log: string[] = [];
  const out: Contact[] = [];

  for (const contact of contacts) {
    if (!contact.email) {
      out.push({ ...contact, verified: false, stage: "verification" });
      log.push(`[${contact.name}] no email to verify`);
      continue;
    }

    const domain = contact.email.split("@")[1];
    const accepts = await domainAcceptsMail(domain);
    out.push({ ...contact, verified: accepts, stage: "verification" });
    log.push(`[${contact.name}] ${accepts ? "MX confirmed" : "no MX record found"} for ${domain}`);
  }

  return { contacts: out, log };
}
