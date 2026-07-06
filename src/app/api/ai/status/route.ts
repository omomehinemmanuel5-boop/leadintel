import { NextResponse } from "next/server";
import { hasGemini, hasGroq, geminiModel, groqModel } from "@/lib/providers/aiConfig";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    groq: hasGroq(),
    gemini: hasGemini(),
    activeProvider: hasGroq() ? "groq" : hasGemini() ? "gemini" : null,
    model: hasGroq() ? groqModel() : hasGemini() ? geminiModel() : null,
  });
}
