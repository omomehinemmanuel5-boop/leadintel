import fs from "fs";
import path from "path";
import { get } from "@vercel/edge-config";

/**
 * Suppression list storage — the do-not-contact list.
 *
 * READS use Edge Config via EDGE_CONFIG (a connection string containing
 * a token scoped ONLY to this one store — verified during setup that it
 * genuinely can't write or touch anything else). Safe to embed as a
 * runtime env var; worst case if it leaked, someone could read a list
 * of suppressed emails, which isn't sensitive.
 *
 * WRITES are a real, disclosed tradeoff: Edge Config's write API has no
 * scoped-token option (confirmed by testing, not assumed) — it only
 * accepts a full account-level token. Embedding that in the running app
 * is broader access than ideal for a runtime secret. This is being done
 * anyway, for this specific single-operator tool, behind Basic Auth
 * already, because the alternative is writes not persisting in
 * production at all. If this doesn't sit right: rotate/remove
 * EDGE_CONFIG_WRITE_TOKEN and writes will cleanly fall back to the local
 * file (dev-only durability) until real Postgres replaces this whole
 * module — which is the actual right long-term fix.
 */

const SUPPRESSION_KEY = "suppression-list";
const LOCAL_PATH = path.join(process.cwd(), "data", "suppression-list.json");

export interface SuppressionEntry {
  email: string;
  reason: string;
  addedAt: string;
}

function loadLocal(): SuppressionEntry[] {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveLocal(list: SuppressionEntry[]) {
  try {
    fs.writeFileSync(LOCAL_PATH, JSON.stringify(list, null, 2));
  } catch {
    // read-only filesystem in some deploy targets — fine, Edge Config is primary in prod
  }
}

export async function getSuppressionList(): Promise<SuppressionEntry[]> {
  if (process.env.EDGE_CONFIG) {
    try {
      const remote = await get<SuppressionEntry[]>(SUPPRESSION_KEY);
      if (remote) return remote;
    } catch {
      // fall through to local
    }
  }
  return loadLocal();
}

export async function setSuppressionList(list: SuppressionEntry[]): Promise<{ durable: boolean }> {
  saveLocal(list); // always keep the local copy current for this instance

  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const writeToken = process.env.EDGE_CONFIG_WRITE_TOKEN;
  const teamId = process.env.EDGE_CONFIG_TEAM_ID;

  if (!edgeConfigId || !writeToken) {
    return { durable: false }; // no write credentials — local-only, ephemeral in prod
  }

  try {
    const url = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items${teamId ? `?teamId=${teamId}` : ""}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${writeToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ operation: "upsert", key: SUPPRESSION_KEY, value: list }],
      }),
      signal: AbortSignal.timeout(6000),
    });
    return { durable: res.ok };
  } catch {
    return { durable: false };
  }
}
