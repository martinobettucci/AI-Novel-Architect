import { NextRequest, NextResponse } from "next/server";
import {
  connectionErrorMessage,
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
    let endpoint = config.modelsEndpoint;
    let res = await fetch(endpoint, {
      method: "GET",
      headers: openAiHeaders(config.apiKey),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 404 || res.status === 405 || res.status === 501) {
      endpoint = config.ollamaModelsEndpoint;
      res = await fetch(endpoint, {
        method: "GET",
        headers: openAiHeaders(config.apiKey),
        signal: AbortSignal.timeout(30_000),
      });
    }

    if (!res.ok) {
      const message = await readApiErrorMessage(res);
      return NextResponse.json(
        {
          error: message,
          endpoint,
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
      endpoint,
      selectedModel: config.model,
      models,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: connectionErrorMessage(config.baseUrl, error),
        endpoint: config.modelsEndpoint,
        baseUrl: config.baseUrl,
      },
      { status: 503 }
    );
  }
}
