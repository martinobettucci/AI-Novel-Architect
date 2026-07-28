import { NextRequest, NextResponse } from "next/server";
import { callerKey, consumeToken } from "@/app/lib/rateLimit";
import {
  MISSING_CONFIG_MESSAGE,
  isConfigured,
  openAiHeaders,
  readApiErrorMessage,
  readOpenAiConfig,
} from "@/app/lib/openaiClient";

export const runtime = "nodejs";

interface RawModel {
  id?: string;
  model?: string;
  name?: string;
}

export async function GET(req: NextRequest) {
  const limit = consumeToken(`models:${callerKey(req.headers)}`, {
    ratePerMinute: 12,
    burst: 4,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const config = readOpenAiConfig();
  if (!isConfigured(config)) {
    return NextResponse.json({ error: MISSING_CONFIG_MESSAGE }, { status: 500 });
  }

  try {
    const res = await fetch(config.modelsEndpoint, {
      method: "GET",
      headers: openAiHeaders(config.apiKey),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const message = await readApiErrorMessage(res);
      return NextResponse.json(
        {
          error: message,
          endpoint: config.modelsEndpoint,
          baseUrl: config.baseUrl,
        },
        { status: 502 }
      );
    }

    const payload = (await res.json()) as {
      data?: RawModel[];
      models?: RawModel[];
    };

    const source = payload.data ?? payload.models ?? [];
    const models = Array.from(
      new Set(
        source
          .map((model) => model.id || model.model || model.name || "")
          .map((name) => name.trim())
          .filter(Boolean)
      )
    );

    return NextResponse.json({
      baseUrl: config.baseUrl,
      endpoint: config.modelsEndpoint,
      selectedModel: config.model,
      models,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Network error",
        endpoint: config.modelsEndpoint,
        baseUrl: config.baseUrl,
      },
      { status: 503 }
    );
  }
}
