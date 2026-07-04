import { NextResponse } from "next/server";
import { getAllContacts } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ contacts: getAllContacts() });
}
