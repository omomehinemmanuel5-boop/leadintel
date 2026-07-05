import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getContactById, getCompanyById } from "@/lib/store";
import { draftOutreachEmail } from "@/lib/providers/gemini";
import { hasGemini } from "@/lib/providers/geminiConfig";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const BodySchema = z.object({
  contactId: z.string().min(1),
  productName: z.string().trim().min(1).max(100),
  valueProposition: z.string().trim().min(1).max(300),
});

export async function POST(req: NextRequest) {
  if (!hasGemini()) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
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
  // everything else, it doesn't get to route around it.
  if (contact.suppressed || contact.consentBasis === "requires_optin" || contact.consentBasis === "blocked") {
    return NextResponse.json(
      { error: "This contact is blocked by the consent or suppression gate — drafting outreach for them isn't allowed." },
      { status: 403 }
    );
  }

  const draft = await draftOutreachEmail(company, contact, {
    productName: parsed.data.productName,
    valueProposition: parsed.data.valueProposition,
  });
  if (!draft) {
    return NextResponse.json({ error: "Gemini request failed" }, { status: 502 });
  }

  return NextResponse.json({ draft });
}
