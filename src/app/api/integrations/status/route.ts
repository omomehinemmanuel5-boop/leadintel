import { NextResponse } from "next/server";
import { hasApollo, hasGoogle, hasAbr, hasSerper } from "@/lib/providers/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    apollo: hasApollo(),
    google: hasGoogle(),
    abr: hasAbr(),
    serper: hasSerper(),
  });
}
