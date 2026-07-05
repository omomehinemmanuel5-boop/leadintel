import { describe, it, expect } from "vitest";
import { looksLikeHumanName, trimToValidName } from "@/lib/nameExtraction";

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

describe("trimToValidName", () => {
  it("trims leading boilerplate to recover the real name — real cases from live 10-K testing", () => {
    // "Table of Contents Jen-Hsun Huang" — NVIDIA's actual 10-K text had
    // "Contents" bleed into the regex capture from an adjacent heading.
    expect(trimToValidName("Contents Jen-Hsun Huang")).toBe("Jen-Hsun Huang");
    // Broadcom's table header is "Name and Title Age Position and
    // Offices" — "Offices" bled into the next row's name capture.
    expect(trimToValidName("Offices Hock E. Tan")).toBe("Hock E. Tan");
  });

  it("returns the name unchanged when there's no contamination", () => {
    expect(trimToValidName("Sanjay Mehrotra")).toBe("Sanjay Mehrotra");
  });

  it("returns null when nothing in the candidate is a valid name", () => {
    expect(trimToValidName("Compensation Committee The Board")).toBeNull();
  });
});
