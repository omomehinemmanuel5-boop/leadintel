import { put, list, del } from "@vercel/blob";
import { Company, Contact, PipelineRun } from "@/lib/types";

/**
 * Durable storage for search jobs, companies, and contacts.
 *
 * Backed by Vercel Blob — a native Vercel product (not a third-party
 * marketplace integration), provisioned via API with zero dashboard
 * steps. The auto-injected BLOB_READ_WRITE_TOKEN is scoped specifically
 * to this one blob store, not a broad account token — a meaningfully
 * better security posture than the suppression list's Edge Config write
 * path (see suppressionStore.ts), which had no scoped-token option.
 *
 * IMPORTANT — this is NOT a single overwritten file, and that's
 * deliberate, not incidental. The first version of this store used one
 * stable pathname with allowOverwrite, and testing directly against
 * Vercel's API (before this shipped, not after) caught a real bug: the
 * public CDN caches that URL for up to 30 days regardless of
 * `cacheControlMaxAge` on the new write, and cache invalidation on
 * overwrite was non-deterministic — some reads got fresh data, some got
 * a stale snapshot from a much earlier write, unpredictably depending
 * on which edge node served the request.
 *
 * The fix: every save writes to a brand-new, never-before-requested
 * path (timestamped), which is always a guaranteed cache MISS — there's
 * no stale copy of a URL nothing has ever fetched. `list()` finds the
 * most recent snapshot by upload time, and old snapshots get deleted
 * right after a successful write so storage doesn't grow unbounded.
 *
 * Known limitation, disclosed not hidden: writes are read-modify-write
 * (fetch latest snapshot, append, write a new one), which has a race
 * window under concurrent writes — the last write wins and could drop
 * a concurrent one. Acceptable for a single-operator tool; would need a
 * real transactional database for safe concurrent writers.
 *
 * Falls back to an in-memory store when BLOB_READ_WRITE_TOKEN isn't set
 * (e.g. local dev without pulling env vars) — same graceful-degradation
 * pattern as every other provider in this app.
 */

const SNAPSHOT_PREFIX = "leadintel-snapshots/";
const MAX_RUNS = 200;

interface StoreData {
  runs: PipelineRun[];
}

interface MemoryStore {
  runs: PipelineRun[];
}

declare global {
  var __leadintelMemoryStore: MemoryStore | undefined;
}

function getMemoryStore(): MemoryStore {
  if (!global.__leadintelMemoryStore) {
    global.__leadintelMemoryStore = { runs: [] };
  }
  return global.__leadintelMemoryStore;
}

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

async function readData(): Promise<StoreData> {
  if (!hasBlob()) {
    return { runs: getMemoryStore().runs };
  }
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN!;
    const { blobs } = await list({ prefix: SNAPSHOT_PREFIX, token });
    if (blobs.length === 0) return { runs: [] };

    const latest = blobs.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
    const res = await fetch(latest.url, { cache: "no-store" });
    if (!res.ok) return { runs: [] };
    return (await res.json()) as StoreData;
  } catch {
    return { runs: [] };
  }
}

async function writeData(data: StoreData): Promise<void> {
  if (!hasBlob()) {
    getMemoryStore().runs = data.runs;
    return;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN!;
  const path = `${SNAPSHOT_PREFIX}${Date.now()}.json`;

  await put(path, JSON.stringify(data), {
    access: "public",
    token,
    addRandomSuffix: false,
    contentType: "application/json",
  });

  // Clean up older snapshots so storage doesn't grow unbounded. Best
  // effort — if this fails, it's a storage-quota nuisance, not data
  // loss, so it shouldn't fail the write itself.
  try {
    const { blobs } = await list({ prefix: SNAPSHOT_PREFIX, token });
    const old = blobs.filter((b) => !b.pathname.endsWith(path.split("/").pop()!));
    if (old.length > 0) await del(old.map((b) => b.url), { token });
  } catch {
    // non-fatal
  }
}

export async function saveRun(run: PipelineRun): Promise<void> {
  const data = await readData();
  data.runs.unshift(run); // most recent first
  if (data.runs.length > MAX_RUNS) data.runs.length = MAX_RUNS;
  await writeData(data);
}

export async function listRuns(): Promise<PipelineRun[]> {
  return (await readData()).runs;
}

export async function getRun(id: string): Promise<PipelineRun | undefined> {
  return (await readData()).runs.find((r) => r.id === id);
}

export async function getAllCompanies(): Promise<(Company & { runId: string })[]> {
  const { runs } = await readData();
  const byId = new Map<string, Company & { runId: string }>();
  for (const run of runs) {
    for (const company of run.companies ?? []) {
      if (!byId.has(company.id)) {
        byId.set(company.id, { ...company, runId: run.id });
      }
    }
  }
  return Array.from(byId.values());
}

export async function getAllContacts(): Promise<(Contact & { runId: string; createdAt: string })[]> {
  const { runs } = await readData();
  const byId = new Map<string, Contact & { runId: string; createdAt: string }>();
  for (const run of runs) {
    for (const contact of run.contacts) {
      if (!byId.has(contact.id)) {
        byId.set(contact.id, { ...contact, runId: run.id, createdAt: run.createdAt });
      }
    }
  }
  return Array.from(byId.values());
}

export async function getCompanyById(id: string): Promise<Company | undefined> {
  return (await getAllCompanies()).find((c) => c.id === id);
}

export async function getContactById(id: string): Promise<Contact | undefined> {
  return (await getAllContacts()).find((c) => c.id === id);
}

export async function getContactForCompany(companyId: string): Promise<Contact | undefined> {
  return (await getAllContacts()).find((c) => c.companyId === companyId);
}

export async function getAnalytics() {
  const [contacts, companies, runs] = await Promise.all([getAllContacts(), getAllCompanies(), listRuns()]);

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
