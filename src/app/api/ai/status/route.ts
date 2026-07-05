import { NextResponse } from "next/server";
import { hasGemini, geminiModel } from "@/lib/providers/geminiConfig";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ gemini: hasGemini(), model: hasGemini() ? geminiModel() : null });
}
