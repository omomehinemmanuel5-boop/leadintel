import { NextResponse } from "next/server";
import { getAllCompanies } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ companies: await getAllCompanies() });
}
