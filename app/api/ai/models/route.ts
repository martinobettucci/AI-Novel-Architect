import { NextRequest, NextResponse } from "next/server";
import {
  openAiHeaders,
  readApiErrorMessage,
  readOpenAiConfigFromHeaders,
} from "@/app/lib/openaiClient";

export const runtime = "nodejs";

interface RawModel {
  id?: string;
  model?: string;
  name?: string;
}

export async function GET(req: NextRequest) {
  const config = readOpenAiConfigFromHeaders(req.headers);

  try {
    const res = await fetch(config.modelsEndpoint, {
      method: "GET",
      headers: openAiHeaders(config.apiKey),
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
