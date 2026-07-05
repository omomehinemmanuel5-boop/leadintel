import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCompanyById, getContactForCompany } from "@/lib/store";
import { generateCompanySummary } from "@/lib/providers/gemini";
import { hasGemini } from "@/lib/providers/geminiConfig";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const BodySchema = z.object({ companyId: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (!hasGemini()) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  const identity = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = checkRateLimit(`ai_summary:${identity}`, { limit: 20, windowMs: 5 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const company = getCompanyById(parsed.data.companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const contact = getContactForCompany(company.id) ?? null;
  const summary = await generateCompanySummary(company, contact);
  if (!summary) {
    return NextResponse.json({ error: "Gemini request failed" }, { status: 502 });
  }

  return NextResponse.json({ summary });
}
