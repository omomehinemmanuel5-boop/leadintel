import { describe, it, expect } from "vitest";
import { looksLikeHumanName } from "@/lib/nameExtraction";

describe("looksLikeHumanName", () => {
  it("accepts real names caught during live testing", () => {
    expect(looksLikeHumanName("Sundar Pichai")).toBe(true);
    expect(looksLikeHumanName("Tim Cook")).toBe(true);
    expect(looksLikeHumanName("Steven P. Jobs")).toBe(true);
  });

  it("rejects the exact false positives a live SEC filing produced", () => {
    // These are real regex matches captured during development against
    // actual SEC DEF 14A filings — not hypothetical edge cases.
    expect(looksLikeHumanName("Analysis CEO")).toBe(false);
    expect(looksLikeHumanName("Compensation Committee. The")).toBe(false);
  });

  it("rejects boilerplate-adjacent phrases in general", () => {
    expect(looksLikeHumanName("The Board")).toBe(false);
    expect(looksLikeHumanName("Executive Officer")).toBe(false);
    expect(looksLikeHumanName("Audit Committee")).toBe(false);
  });

  it("rejects names with the wrong word count", () => {
    expect(looksLikeHumanName("Cher")).toBe(false); // single word
    expect(looksLikeHumanName("A B C D")).toBe(false); // too many words
  });
});
