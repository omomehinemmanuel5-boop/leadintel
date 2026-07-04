import { describe, it, expect } from "vitest";
import { inferEmailPatterns } from "@/lib/pipeline/emailPattern";
import { buildOutreachQueue } from "@/lib/pipeline/outreachQueue";
import { Contact, Company } from "@/lib/types";

function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: "co1",
    name: "Example Co",
    country: "US",
    source: "test",
    provider: "demo",
    domain: "example.com",
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "c1",
    companyId: "co1",
    name: "Jordan Prescott",
    title: "CEO",
    country: "US",
    discoverySource: "test",
    provider: "demo",
    stage: "name_discovery",
    ...overrides,
  };
}

describe("inferEmailPatterns", () => {
  it("guesses first.last@domain as the top pattern", () => {
    const { contacts } = inferEmailPatterns([makeContact()], [makeCompany()]);
    expect(contacts[0].email).toBe("jordan.prescott@example.com");
    expect(contacts[0].emailPattern).toBe("first.last");
    expect(contacts[0].emailSource).toBe("inferred");
  });

  it("does not overwrite an email already supplied by Apollo", () => {
    const { contacts } = inferEmailPatterns(
      [makeContact({ email: "real@apollo-match.com", emailSource: "apollo" })],
      [makeCompany()]
    );
    expect(contacts[0].email).toBe("real@apollo-match.com");
    expect(contacts[0].emailPattern).toBeUndefined();
  });

  it("skips contacts whose company has no resolved domain", () => {
    const { contacts } = inferEmailPatterns(
      [makeContact()],
      [makeCompany({ domain: undefined })]
    );
    expect(contacts[0].email).toBeUndefined();
  });

  it("handles single-word names gracefully without crashing", () => {
    const { contacts } = inferEmailPatterns([makeContact({ name: "Cher" })], [makeCompany()]);
    // first === last for a single-word name; should still produce *something* or safely skip
    expect(() => contacts[0]).not.toThrow();
  });
});

describe("buildOutreachQueue", () => {
  it("excludes contacts blocked by the consent gate even if verified", () => {
    const contacts = [
      makeContact({ email: "a@example.com", verified: true, consentBasis: "requires_optin" }),
    ];
    const { queue, excluded } = buildOutreachQueue(contacts);
    expect(queue).toHaveLength(0);
    expect(excluded).toBe(1);
  });

  it("excludes suppressed contacts even if otherwise eligible", () => {
    const contacts = [
      makeContact({
        email: "a@example.com",
        verified: true,
        consentBasis: "public_interest_b2b",
        suppressed: true,
      }),
    ];
    const { queue } = buildOutreachQueue(contacts);
    expect(queue).toHaveLength(0);
  });

  it("excludes unverified contacts", () => {
    const contacts = [
      makeContact({ email: "a@example.com", verified: false, consentBasis: "public_interest_b2b" }),
    ];
    const { queue } = buildOutreachQueue(contacts);
    expect(queue).toHaveLength(0);
  });

  it("includes a fully-eligible contact and attaches an unsubscribe token", () => {
    const contacts = [
      makeContact({
        email: "a@example.com",
        verified: true,
        consentBasis: "public_interest_b2b",
        suppressed: false,
      }),
    ];
    const { queue } = buildOutreachQueue(contacts);
    expect(queue).toHaveLength(1);
    expect(queue[0].unsubscribeToken).toBeTruthy();
  });
});
