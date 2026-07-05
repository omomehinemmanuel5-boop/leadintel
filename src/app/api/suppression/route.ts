import { NextRequest, NextResponse } from "next/server";
import { SuppressionAddSchema } from "@/lib/validation";
import { getSuppressionList, setSuppressionList } from "@/lib/suppressionStore";

export const runtime = "nodejs";

export async function GET() {
  const suppressions = await getSuppressionList();
  return NextResponse.json({ suppressions, durable: !!process.env.EDGE_CONFIG });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.json().catch(() => ({}));
  const parsed = SuppressionAddSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const reason = parsed.data.reason ?? "manually added";

  const list = await getSuppressionList();
  if (!list.some((e) => e.email === email)) {
    list.push({ email, reason, addedAt: new Date().toISOString() });
  }
  const { durable } = await setSuppressionList(list);
  return NextResponse.json({ suppressions: list, durable });
}

export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email query param is required" }, { status: 400 });
  }
  const list = (await getSuppressionList()).filter((e) => e.email !== email);
  const { durable } = await setSuppressionList(list);
  return NextResponse.json({ suppressions: list, durable });
}
