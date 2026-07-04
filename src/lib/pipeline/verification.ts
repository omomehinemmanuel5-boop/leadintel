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

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

async function domainAcceptsMail(domain: string): Promise<boolean> {
  return withTimeout(
    (async () => {
      try {
        const dns = await import("dns/promises");
        const mx = await dns.resolveMx(domain).catch(() => null);
        return !!(mx && mx.length > 0);
      } catch {
        return false;
      }
    })(),
    3000,
    false
  );
}

export async function verifyContacts(contacts: Contact[]): Promise<{
  contacts: Contact[];
  log: string[];
}> {
  const results = await Promise.all(
    contacts.map(async (contact) => {
      if (!contact.email) {
        return { contact: { ...contact, verified: false, stage: "verification" as const }, log: `[${contact.name}] no email to verify` };
      }
      const domain = contact.email.split("@")[1];
      const accepts = await domainAcceptsMail(domain);
      return {
        contact: { ...contact, verified: accepts, stage: "verification" as const },
        log: `[${contact.name}] ${accepts ? "MX confirmed" : "no MX record found"} for ${domain}`,
      };
    })
  );

  return { contacts: results.map((r) => r.contact), log: results.map((r) => r.log) };
}
