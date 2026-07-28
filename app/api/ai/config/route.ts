import { NextResponse } from "next/server";
import { isConfigured, readOpenAiConfig } from "@/app/lib/openaiClient";

export const runtime = "nodejs";

/**
 * The deployment's active LLM configuration, so the UI can *show* what it is
 * talking to. The browser no longer chooses the endpoint — it only reports it —
 * so this returns the non-secret fields and never the API key.
 */
export async function GET() {
  const config = readOpenAiConfig();

  return NextResponse.json({
    baseUrl: config.baseUrl,
    model: config.model,
    hasApiKey: Boolean(config.apiKey),
    configured: isConfigured(config),
  });
}
