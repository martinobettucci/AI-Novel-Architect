import { NextRequest, NextResponse } from "next/server";
import {
  extractAssistantText,
  openAiHeaders,
  readApiErrorMessage,
  readOpenAiConfigFromHeaders,
} from "@/app/lib/openaiClient";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const config = readOpenAiConfigFromHeaders(req.headers);
  const startedAt = Date.now();

  try {
    const res = await fetch(config.endpoint, {
      method: "POST",
      headers: openAiHeaders(config.apiKey),
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "Reply with exactly OK" }],
        temperature: 0,
        max_tokens: 16,
      }),
    });

    if (!res.ok) {
      const message = await readApiErrorMessage(res);
      return NextResponse.json(
        {
          status: "error",
          baseUrl: config.baseUrl,
          endpoint: config.endpoint,
          model: config.model,
          latencyMs: Date.now() - startedAt,
          error: message,
          checkedAt: new Date().toISOString(),
        },
        { status: 502 }
      );
    }

    const payload = await res.json();
    const text = extractAssistantText(payload);

    return NextResponse.json({
      status: "connected",
      baseUrl: config.baseUrl,
      endpoint: config.endpoint,
      model: config.model,
      latencyMs: Date.now() - startedAt,
      ...(text ? {} : { warning: "Model returned empty text" }),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        model: config.model,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Network error",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
