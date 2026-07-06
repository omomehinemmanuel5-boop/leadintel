import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getContactById, getCompanyById } from "@/lib/store";
import { draftOutreachEmail } from "@/lib/providers/ai";
import { hasAnyAIProvider } from "@/lib/providers/aiConfig";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const BodySchema = z.object({
  contactId: z.string().min(1),
  productName: z.string().trim().min(1).max(100),
  valueProposition: z.string().trim().min(1).max(300),
});

export async function POST(req: NextRequest) {
  if (!hasAnyAIProvider()) {
    return NextResponse.json({ error: "No AI provider configured (set GROQ_API_KEY or GEMINI_API_KEY)" }, { status: 503 });
  }

  const identity = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = checkRateLimit(`ai_draft:${identity}`, { limit: 20, windowMs: 5 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }

  const contact = getContactById(parsed.data.contactId);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  const company = getCompanyById(contact.companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found for this contact" }, { status: 404 });
  }

  // Don't draft outreach for anyone the pipeline itself has already
  // blocked — the AI layer inherits the same compliance boundary as
  // everything else, it doesn't get a side door around the consent gate.
  if (contact.suppressed || contact.consentBasis === "requires_optin" || contact.consentBasis === "blocked") {
    return NextResponse.json(
      { error: "This contact is blocked by the consent or suppression gate — drafting outreach for them isn't allowed." },
      { status: 403 }
    );
  }

  const result = await draftOutreachEmail(company, contact, {
    productName: parsed.data.productName,
    valueProposition: parsed.data.valueProposition,
  });
  if (!result) {
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  }

  return NextResponse.json({ draft: result.text, provider: result.provider });
}
