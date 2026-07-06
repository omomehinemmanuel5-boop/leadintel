import { NextResponse } from "next/server";
import { listRuns } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const runs = await listRuns();
  // trim logs for the list view — full detail is fetched per-job
  const summaries = runs.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    countries: r.countries,
    label: (r as unknown as { label?: string }).label,
    companyCount: (r as unknown as { companies?: unknown[] }).companies?.length ?? 0,
    contactCount: r.contacts.length,
    verifiedCount: r.contacts.filter((c) => c.verified).length,
  }));
  return NextResponse.json({ runs: summaries });
}
