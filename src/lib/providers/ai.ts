import { geminiModel, groqModel, hasGroq, hasGemini } from "@/lib/providers/aiConfig";
import { Company, Contact } from "@/lib/types";

/**
 * Unified AI text generation — tries Groq first, then Gemini.
 *
 * Why Groq first: it's the one actually verified working end-to-end
 * (real completion call tested directly against their API before this
 * was wired in — confirmed response, ~20ms). The Gemini key on file
 * currently fails with a project-level 403 ("Your project has been
 * denied access") on every model tried — the key itself authenticates
 * (it can list models) but can't call generateContent. Left the Gemini
 * path in rather than deleted, since that's likely a billing/project
 * setup issue on the Google Cloud side, not a code problem — if it gets
 * fixed, this starts using it as a fallback with zero code changes.
 *
 * Every prompt explicitly instructs the model to only use the facts
 * it's given and to say so when something isn't known — this
 * pipeline's data is already partly demo/partly real (see
 * Companies/Contacts pages), and an AI layer that confidently
 * fabricates on top of that would make the whole tool less
 * trustworthy, not more useful.
 */

async function callGroq(prompt: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel(),
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const text: string | undefined = data.choices?.[0]?.message?.content;
    return text?.trim() || null;
  } catch {
    return null;
  }
}

async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch {
    return null;
  }
}

async function callAI(prompt: string): Promise<{ text: string; provider: "groq" | "gemini" } | null> {
  if (hasGroq()) {
    const text = await callGroq(prompt);
    if (text) return { text, provider: "groq" };
  }
  if (hasGemini()) {
    const text = await callGemini(prompt);
    if (text) return { text, provider: "gemini" };
  }
  return null;
}

export async function generateCompanySummary(
  company: Company,
  contact: Contact | null
): Promise<{ text: string; provider: string } | null> {
  const facts = [
    `Company name: ${company.name}`,
    `Country: ${company.country}`,
    company.domain ? `Domain: ${company.domain}` : `Domain: not resolved`,
    `Registry ID: ${company.registryId ?? "unknown"}`,
    `Source: ${company.source}`,
    contact
      ? `Known leader: ${contact.name}, ${contact.title} (source: ${contact.discoverySource})`
      : `No leader identified yet`,
  ].join("\n");

  const prompt = `You are helping a B2B sales researcher understand a company before outreach.

Here is everything actually known about this company from verified sources — do not add any fact not listed here:
${facts}

Write a 2-3 sentence brief a salesperson could skim in 10 seconds. If the known facts are thin (e.g. no leader identified, domain not resolved), say so plainly instead of padding with generic filler. Do not invent industry, size, or founding details that aren't in the facts above.`;

  const result = await callAI(prompt);
  return result ? { text: result.text, provider: result.provider } : null;
}

export async function draftOutreachEmail(
  company: Company,
  contact: Contact,
  senderContext: { productName: string; valueProposition: string }
): Promise<{ text: string; provider: string } | null> {
  const facts = [
    `Recipient: ${contact.name}, ${contact.title} at ${company.name}`,
    `Company country: ${company.country}`,
    company.domain ? `Company domain: ${company.domain}` : "",
    `How this contact was found: ${contact.discoverySource}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Draft a short, professional cold outreach email. Use only these facts about the recipient — do not invent details about their company, role, or challenges:
${facts}

What I'm offering:
Product: ${senderContext.productName}
Value proposition: ${senderContext.valueProposition}

Requirements:
- Under 120 words
- No generic flattery ("I was impressed by your work at...") since we don't actually know anything specific about their work
- One clear call to action
- Professional but not stiff
- Include a placeholder line at the end: "[Unsubscribe link — required by CASL/CAN-SPAM/GDPR, do not remove]"`;

  const result = await callAI(prompt);
  return result ? { text: result.text, provider: result.provider } : null;
}
