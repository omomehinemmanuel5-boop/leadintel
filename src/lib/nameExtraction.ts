/**
 * Shared validation for regex-extracted "names" from filing/page text.
 * The extraction regexes (in secFilings.ts and google.ts) are
 * pattern-based, not semantic — they'll happily capture "Compensation
 * Committee. The" if it sits next to "Chief Executive Officer" in the
 * source text. This filters out the common failure modes before a bad
 * match becomes a fake contact.
 */

const NON_NAME_WORDS = new Set([
  "the", "committee", "compensation", "analysis", "officer", "chief", "executive",
  "board", "directors", "company", "corporation", "report", "summary", "discussion",
  "section", "proxy", "statement", "annual", "meeting", "named", "election", "item",
  "table", "contents", "notice", "shareholders", "stockholders", "audit", "governance",
  "nominating", "risk", "management", "plan", "program", "policy", "form", "part",
]);

export function looksLikeHumanName(candidate: string): boolean {
  const words = candidate.trim().split(/\s+/);
  if (words.length < 2 || words.length > 3) return false;
  return words.every((w) => {
    const isInitial = /^[A-Z]\.$/.test(w);
    const clean = w.replace(/[.,]/g, "").toLowerCase();
    if (isInitial) return true;
    return clean.length >= 2 && !NON_NAME_WORDS.has(clean);
  });
}
