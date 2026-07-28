import { NextRequest, NextResponse } from "next/server";
import { callerKey, consumeToken } from "@/app/lib/rateLimit";
import {
  MISSING_CONFIG_MESSAGE,
  isConfigured,
  postCompletion,
  readOpenAiConfig,
} from "@/app/lib/openaiClient";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limit = consumeToken(`health:${callerKey(req.headers)}`, {
    ratePerMinute: 12,
    burst: 4,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { status: "error", error: "Too many health checks. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const config = readOpenAiConfig();
  const startedAt = Date.now();

  if (!isConfigured(config)) {
    return NextResponse.json(
      {
        status: "error",
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        model: config.model,
        latencyMs: 0,
        error: MISSING_CONFIG_MESSAGE,
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  const { response, completion } = await postCompletion(
    config,
    {
      messages: [{ role: "user", content: "Reply with exactly OK" }],
      temperature: 0,
      // Reasoning models bill thinking tokens against this budget, so a tiny
      // probe returns empty text and reports a healthy gateway as degraded.
      max_tokens: 512,
    },
    { timeoutMs: 60_000, attempts: 1 }
  );

  const base = {
    baseUrl: config.baseUrl,
    endpoint: config.endpoint,
    model: config.model,
    latencyMs: Date.now() - startedAt,
    checkedAt: new Date().toISOString(),
  };

  if (!response.ok) {
    return NextResponse.json(
      { status: "error", ...base, error: response.error },
      { status: response.status === 429 ? 429 : 503 }
    );
  }

  return NextResponse.json({
    status: "connected",
    ...base,
    ...(completion?.text ? {} : { warning: "Model returned empty text" }),
  });
}
