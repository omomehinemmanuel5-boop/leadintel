import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { SuppressionAddSchema } from "@/lib/validation";

export const runtime = "nodejs";

const SUPPRESSION_PATH = path.join(process.cwd(), "data", "suppression-list.json");

interface SuppressionEntry {
  email: string;
  reason: string;
  addedAt: string;
}

function load(): SuppressionEntry[] {
  try {
    return JSON.parse(fs.readFileSync(SUPPRESSION_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function save(list: SuppressionEntry[]) {
  // NOTE: on Vercel's production filesystem this write will not persist
  // reliably across invocations — fine for local dev, needs a real DB
  // (Volume VI) before this is load-bearing in production.
  try {
    fs.writeFileSync(SUPPRESSION_PATH, JSON.stringify(list, null, 2));
  } catch {
    // swallow — read-only filesystem in some deploy targets
  }
}

export async function GET() {
  return NextResponse.json({ suppressions: load() });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.json().catch(() => ({}));
  const parsed = SuppressionAddSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const reason = parsed.data.reason ?? "manually added";
  const list = load();
  if (!list.some((e) => e.email === email)) {
    list.push({ email, reason, addedAt: new Date().toISOString() });
    save(list);
  }
  return NextResponse.json({ suppressions: list });
}

export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email query param is required" }, { status: 400 });
  }
  const list = load().filter((e) => e.email !== email);
  save(list);
  return NextResponse.json({ suppressions: list });
}
