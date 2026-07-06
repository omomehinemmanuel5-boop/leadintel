import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCompanyById, getContactForCompany } from "@/lib/store";
import { generateCompanySummary } from "@/lib/providers/ai";
import { hasAnyAIProvider } from "@/lib/providers/aiConfig";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const BodySchema = z.object({ companyId: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (!hasAnyAIProvider()) {
    return NextResponse.json({ error: "No AI provider configured (set GROQ_API_KEY or GEMINI_API_KEY)" }, { status: 503 });
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

  const company = await getCompanyById(parsed.data.companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const contact = (await getContactForCompany(company.id)) ?? null;
  const result = await generateCompanySummary(company, contact);
  if (!result) {
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  }

  return NextResponse.json({ summary: result.text, provider: result.provider });
}
