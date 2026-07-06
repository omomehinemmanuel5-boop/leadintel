export function hasGemini(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function hasGroq(): boolean {
  return !!process.env.GROQ_API_KEY;
}

export function hasAnyAIProvider(): boolean {
  return hasGemini() || hasGroq();
}

// Configurable via env so a model-name change doesn't need a code change.
// Default: a current (as of mid-2026), free-tier-eligible, cost-efficient
// model — reasonable for company summaries and short outreach drafts,
// which don't need frontier-level reasoning.
export function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
}

// Verified working directly against Groq's API before this default was
// chosen — llama-3.3-70b-versatile, real completion confirmed, ~20ms.
export function groqModel(): string {
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}
