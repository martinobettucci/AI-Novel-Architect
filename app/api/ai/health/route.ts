import { NextRequest, NextResponse } from "next/server";
import {
  connectionErrorMessage,
  extractAssistantText,
  isOllamaModel,
  postAiChat,
  readApiErrorMessage,
  readOpenAiConfigFromHeaders,
} from "@/app/lib/openaiClient";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const config = readOpenAiConfigFromHeaders(req.headers);
  const startedAt = Date.now();

  try {
    const res = await postAiChat(config, {
      model: config.model,
      messages: [{ role: "user", content: "Reply with exactly OK" }],
      temperature: 0,
      max_tokens: isOllamaModel(config.model) ? 128 : 16,
      ...(isOllamaModel(config.model) ? { reasoning_effort: "low" } : {}),
    }, { timeoutMs: 60_000 });

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
      endpoint: res.url || config.endpoint,
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
        error: connectionErrorMessage(config.baseUrl, error),
        checkedAt: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
