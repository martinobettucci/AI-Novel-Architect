import { NextRequest, NextResponse } from "next/server";
import type { AiActionType } from "@/app/domain/models";
import { buildSystemPrompt, buildUserPrompt, type AiRunRequest } from "@/app/lib/ai/prompts";
import {
  extractAssistantText,
  openAiHeaders,
  readApiErrorMessage,
  readOpenAiConfigFromHeaders,
} from "@/app/lib/openaiClient";

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
  responseFormat?: "text" | "json";
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

  const jsonMode = body.responseFormat === "json";
  const systemPrompt = jsonMode
    ? `${buildSystemPrompt(runReq)}\nReturn a single valid JSON value only. No prose, no markdown fences.`
    : buildSystemPrompt(runReq);
  const userPrompt = buildUserPrompt(runReq);

  try {
    const res = await fetch(config.endpoint, {
      method: "POST",
      headers: openAiHeaders(config.apiKey),
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: body.temperature ?? (jsonMode ? 0.2 : 0.7),
        max_tokens: body.maxTokens ?? 2200,
        // OpenAI-compatible JSON mode. Servers that ignore it still get the
        // instruction in the system prompt, and the client extracts JSON
        // tolerantly, so this degrades gracefully.
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const message = await readApiErrorMessage(res);
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const payload = await res.json();
    const text = extractAssistantText(payload);

    if (!text) {
      return NextResponse.json(
        { error: "Model returned an empty response" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      action: body.action,
      text,
      model: config.model,
      baseUrl: config.baseUrl,
      endpoint: config.endpoint,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Network error",
      },
      { status: 503 }
    );
  }
}
