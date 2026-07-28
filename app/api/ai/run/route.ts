import { NextRequest, NextResponse } from "next/server";
import type { AiActionType } from "@/app/domain/models";
import { DEFAULT_LLM_MAX_TOKENS } from "@/app/domain/defaults";
import { buildSystemPrompt, buildUserPrompt, type AiRunRequest } from "@/app/lib/ai/prompts";
import { callerKey, consumeToken } from "@/app/lib/rateLimit";
import {
  MISSING_CONFIG_MESSAGE,
  isConfigured,
  postCompletion,
  readOpenAiConfig,
} from "@/app/lib/openaiClient";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Guard rails on client-supplied generation parameters. */
const MAX_INPUT_CHARS = 200_000;
const MAX_CONTEXT_CHARS = 400_000;
const MAX_TOKEN_CEILING = 32_000;

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

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function POST(req: NextRequest) {
  const limit = consumeToken(callerKey(req.headers), { ratePerMinute: 30, burst: 10 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many AI requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const config = readOpenAiConfig();
  if (!isConfigured(config)) {
    return NextResponse.json({ error: MISSING_CONFIG_MESSAGE }, { status: 500 });
  }

  let body: RunBody;
  try {
    body = (await req.json()) as RunBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!body.input?.trim()) {
    return NextResponse.json({ error: "Input text is required" }, { status: 400 });
  }
  if (body.input.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Input exceeds the ${MAX_INPUT_CHARS}-character limit` },
      { status: 413 }
    );
  }
  if (body.context && body.context.length > MAX_CONTEXT_CHARS) {
    return NextResponse.json(
      { error: `Context exceeds the ${MAX_CONTEXT_CHARS}-character limit` },
      { status: 413 }
    );
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

  const budget = clampNumber(body.maxTokens, 256, MAX_TOKEN_CEILING, DEFAULT_LLM_MAX_TOKENS);
  // Creative temperatures measurably raise the malformed-JSON rate, so JSON mode
  // clamps rather than defaults — the client always sends a temperature, which
  // would make a `??` default dead code.
  const temperature = jsonMode
    ? Math.min(clampNumber(body.temperature, 0, 2, 0.2), 0.2)
    : clampNumber(body.temperature, 0, 2, 0.7);

  try {
    const { response: res, completion } = await postCompletion(config, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: budget,
      // OpenAI-compatible JSON mode. Servers that ignore it still get the
      // instruction in the system prompt, and the client extracts JSON
      // tolerantly, so this degrades gracefully.
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    });

    if (!res.ok || !completion) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }

    if (!completion.text) {
      // A reasoning model that spends its whole budget thinking returns 200 with
      // no content. Saying "empty response" sends the user hunting a gateway
      // fault; the real fix is a bigger budget, so name that.
      const error = completion.truncated
        ? `The model used its entire ${budget}-token budget before producing an answer. ` +
          `Raise "Max tokens" in AI settings (${completion.reasoningChars} characters of reasoning were generated).`
        : "Model returned an empty response";
      return NextResponse.json({ error }, { status: 502 });
    }

    return NextResponse.json({
      action: body.action,
      text: completion.text,
      model: config.model,
      baseUrl: config.baseUrl,
      endpoint: config.endpoint,
      // Surfaced so callers can refuse to persist a half-written result.
      truncated: completion.truncated,
      finishReason: completion.finishReason,
      ...(completion.truncated
        ? {
            warning: `Response was cut off at the ${budget}-token limit and is incomplete. Raise "Max tokens" in AI settings.`,
          }
        : {}),
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
