import { Company, Contact, PipelineRun } from "@/lib/types";

/**
 * In-memory store, module-scoped so it survives across requests within
 * the same warm serverless instance. This is intentionally NOT durable —
 * it resets on cold start/redeploy. It exists so the Dashboard, Companies,
 * Contacts, and Analytics screens have something real to aggregate across
 * search jobs without standing up Postgres yet.
 *
 * Swap for a real database (Volume VI: Infrastructure & Deployment in the
 * handbook — Postgres via Vercel Postgres or Supabase free tier are both
 * zero-cost to start) before relying on this for anything real. The shape
 * of every function below is written so that swap is a drop-in — nothing
 * outside this file needs to change.
 */

interface GlobalStore {
  runs: PipelineRun[];
}

declare global {
  var __leadintelStore: GlobalStore | undefined;
}

function getStore(): GlobalStore {
  if (!global.__leadintelStore) {
    global.__leadintelStore = { runs: [] };
  }
  return global.__leadintelStore;
}

export function saveRun(run: PipelineRun) {
  const store = getStore();
  store.runs.unshift(run); // most recent first
  // keep memory bounded in a long-lived instance
  if (store.runs.length > 200) store.runs.length = 200;
}

export function listRuns(): PipelineRun[] {
  return getStore().runs;
}

export function getRun(id: string): PipelineRun | undefined {
  return getStore().runs.find((r) => r.id === id);
}

export function getAllCompanies(): (Company & { runId: string })[] {
  const store = getStore();
  const byId = new Map<string, Company & { runId: string }>();
  for (const run of store.runs) {
    for (const company of run.companies ?? []) {
      if (!byId.has(company.id)) {
        byId.set(company.id, { ...company, runId: run.id });
      }
    }
  }
  return Array.from(byId.values());
}

export function getAllContacts(): (Contact & { runId: string; createdAt: string })[] {
  const store = getStore();
  const byId = new Map<string, Contact & { runId: string; createdAt: string }>();
  for (const run of store.runs) {
    for (const contact of run.contacts) {
      if (!byId.has(contact.id)) {
        byId.set(contact.id, { ...contact, runId: run.id, createdAt: run.createdAt });
      }
    }
  }
  return Array.from(byId.values());
}

export function getAnalytics() {
  const contacts = getAllContacts();
  const companies = getAllCompanies();
  const runs = listRuns();

  const byCountry: Record<string, number> = {};
  const byConsent: Record<string, number> = {};
  let verified = 0;
  let suppressed = 0;
  let queueEligible = 0;

  for (const c of contacts) {
    byCountry[c.country] = (byCountry[c.country] ?? 0) + 1;
    const consent = c.consentBasis ?? "pending";
    byConsent[consent] = (byConsent[consent] ?? 0) + 1;
    if (c.verified) verified += 1;
    if (c.suppressed) suppressed += 1;
    if (
      c.email &&
      c.verified &&
      !c.suppressed &&
      c.consentBasis !== "requires_optin" &&
      c.consentBasis !== "blocked"
    ) {
      queueEligible += 1;
    }
  }

  const funnel: Record<string, number> = {};
  for (const run of runs) {
    for (const [stageId, result] of Object.entries(run.stages)) {
      funnel[stageId] = (funnel[stageId] ?? 0) + result.output;
    }
  }

  return {
    totalRuns: runs.length,
    totalCompanies: companies.length,
    totalContacts: contacts.length,
    verified,
    suppressed,
    queueEligible,
    byCountry,
    byConsent,
    funnel,
  };
}
