import { NextRequest, NextResponse } from "next/server";
import { getAllContacts } from "@/lib/store";

export const runtime = "nodejs";

function csvEscape(value: unknown): string {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const includeAll = req.nextUrl.searchParams.get("all") === "true";
  const contacts = getAllContacts();

  const rows = includeAll
    ? contacts
    : contacts.filter(
        (c) =>
          c.email &&
          c.verified &&
          !c.suppressed &&
          c.consentBasis !== "requires_optin" &&
          c.consentBasis !== "blocked"
      );

  const headers = [
    "name",
    "title",
    "country",
    "email",
    "email_confidence",
    "verified",
    "consent_basis",
    "consent_notes",
    "suppressed",
    "discovery_source",
  ];

  const lines = [headers.join(",")];
  for (const c of rows) {
    lines.push(
      [
        csvEscape(c.name),
        csvEscape(c.title),
        csvEscape(c.country),
        csvEscape(c.email),
        csvEscape(c.emailConfidence),
        csvEscape(c.verified ?? false),
        csvEscape(c.consentBasis ?? "pending"),
        csvEscape(c.consentNotes),
        csvEscape(c.suppressed ?? false),
        csvEscape(c.discoverySource),
      ].join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leadintel-contacts${includeAll ? "-all" : "-eligible"}.csv"`,
    },
  });
}
