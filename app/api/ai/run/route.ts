import { NextRequest, NextResponse } from "next/server";
import type { AiActionType } from "@/app/domain/models";
import { buildSystemPrompt, buildUserPrompt, type AiRunRequest } from "@/app/lib/ai/prompts";
import {
  connectionErrorMessage,
  extractAssistantText,
  extractFinishReason,
  isOllamaModel,
  postAiChat,
  readApiErrorMessage,
  readOpenAiConfigFromHeaders,
} from "@/app/lib/openaiClient";
import type { AiResponseFormat } from "@/app/lib/ai/structuredOutput";
import { parseStructuredJson } from "@/app/lib/ai/structuredOutput";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RunBody {
  action: AiActionType;
  locale: "fr" | "en";
  input: string;
  context?: string;
  styleProfile?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  toneGuide?: string;
  responseFormat?: AiResponseFormat;
}

export async function POST(req: NextRequest) {
  const config = readOpenAiConfigFromHeaders(req.headers);
  const body = (await req.json()) as RunBody;

  if (!body.input?.trim()) {
    return NextResponse.json({ error: "Input text is required" }, { status: 400 });
  }

  const runReq: AiRunRequest = {
    action: body.action,
    locale: body.locale ?? "fr",
    input: body.input,
    context: body.context,
    styleProfile: body.styleProfile,
    systemPrompt: body.systemPrompt,
    toneGuide: body.toneGuide,
  };

  const systemPrompt = buildSystemPrompt(runReq);
  const schema = body.responseFormat?.json_schema?.schema;
  const userPrompt = [
    buildUserPrompt(runReq),
    schema
      ? [
          "Return one valid JSON value matching this schema exactly.",
          "Do not wrap the JSON in markdown fences.",
          "Keep every string concise and use the smallest useful number of array items.",
          "Do not treat maxLength or maxItems as targets.",
          "Complete every required field before adding optional detail.",
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    const res = await postAiChat(config, {
      model: config.model,
      messages,
      temperature: schema ? Math.min(body.temperature ?? 0.2, 0.2) : body.temperature ?? 0.7,
      max_tokens: body.maxTokens ?? 2200,
      ...(body.responseFormat ? { response_format: body.responseFormat } : {}),
      ...(isOllamaModel(config.model)
        ? { reasoning_effort: schema ? "none" : "low" }
        : {}),
    }, { timeoutMs: 285_000 });

    if (!res.ok) {
      const message = await readApiErrorMessage(res);
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const payload = await res.json();
    const text = extractAssistantText(payload);
    const finishReason = extractFinishReason(payload);

    if (!text) {
      return NextResponse.json(
        { error: "Model returned an empty response" },
        { status: 502 }
      );
    }

    if (schema && finishReason === "length") {
      return NextResponse.json(
        {
          error:
            "The model truncated its structured response. Reduce the requested scope or increase the helper token budget.",
        },
        { status: 502 }
      );
    }

    if (schema && parseStructuredJson(text) == null) {
      return NextResponse.json(
        {
          error:
            "The model returned invalid structured JSON. Retry the generator or use a smaller scope.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      action: body.action,
      text,
      model: config.model,
      baseUrl: config.baseUrl,
      endpoint: res.url || config.endpoint,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: connectionErrorMessage(config.baseUrl, error),
      },
      { status: 503 }
    );
  }
}
