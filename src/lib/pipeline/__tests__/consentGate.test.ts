import { describe, it, expect } from "vitest";
import { classifyContact, runConsentGate } from "@/lib/pipeline/consentGate";
import { Contact } from "@/lib/types";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "c1",
    companyId: "co1",
    name: "Jordan Prescott",
    title: "CEO",
    country: "AU",
    discoverySource: "test",
    provider: "demo",
    stage: "name_discovery",
    ...overrides,
  };
}

describe("classifyContact", () => {
  it("classifies AU contacts as public_interest_b2b", () => {
    const result = classifyContact(makeContact({ country: "AU" }));
    expect(result.basis).toBe("public_interest_b2b");
  });

  it("classifies DE contacts under GDPR legitimate interest, flagged for review", () => {
    const result = classifyContact(makeContact({ country: "DE" }));
    expect(result.basis).toBe("legitimate_interest_gdpr");
    expect(result.notes).toMatch(/review/i);
  });

  it("classifies US contacts as public_interest_b2b (CAN-SPAM)", () => {
    const result = classifyContact(makeContact({ country: "US" }));
    expect(result.basis).toBe("public_interest_b2b");
  });

  it("classifies CA contacts as public_interest_b2b (CASL implied consent)", () => {
    const result = classifyContact(makeContact({ country: "CA" }));
    expect(result.basis).toBe("public_interest_b2b");
  });

  it("defaults unrecognized jurisdictions to requiring opt-in (fail closed)", () => {
    // @ts-expect-error deliberately testing an invalid country
    const result = classifyContact(makeContact({ country: "XX" }));
    expect(result.basis).toBe("requires_optin");
  });
});

describe("runConsentGate", () => {
  it("never lets a requires_optin or blocked contact through un-flagged", () => {
    const contacts = [
      makeContact({ id: "a", country: "AU" }),
      // @ts-expect-error deliberately testing an invalid country
      makeContact({ id: "b", country: "ZZ" }),
    ];
    const { contacts: out, blocked } = runConsentGate(contacts);
    expect(blocked).toBe(1);
    const flaggedContact = out.find((c) => c.id === "b");
    expect(flaggedContact?.consentBasis).toBe("requires_optin");
  });

  it("assigns a consentBasis to every contact — none left unclassified", () => {
    const contacts = [makeContact({ id: "a", country: "AU" }), makeContact({ id: "b", country: "DE" })];
    const { contacts: out } = runConsentGate(contacts);
    expect(out.every((c) => !!c.consentBasis)).toBe(true);
  });
});
