import type { AiActionType, AppSettings } from "@/app/domain/models";
import { buildTextDiff, type DiffChunk } from "@/app/lib/ai/diff";
import type { AiResponseFormat } from "@/app/lib/ai/structuredOutput";

export interface AiRunResult {
  text: string;
  model: string;
  baseUrl: string;
  action: AiActionType;
}

export interface AiRunInput {
  action: AiActionType;
  input: string;
  context?: string;
  styleProfile?: string;
  responseFormat?: AiResponseFormat;
  temperature?: number;
  maxTokens?: number;
  settings: AppSettings;
}

function buildHeaders(settings: AppSettings): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "x-openai-base-url": settings.llm.baseUrl,
    "x-openai-model": settings.llm.model,
  };

  if (settings.llm.apiKey?.trim()) {
    headers["x-openai-api-key"] = settings.llm.apiKey.trim();
  }

  return headers;
}

export async function runAiAction(input: AiRunInput): Promise<AiRunResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai/run", {
      method: "POST",
      headers: buildHeaders(input.settings),
      signal: AbortSignal.timeout(295_000),
      body: JSON.stringify({
        action: input.action,
        input: input.input,
        context: input.context,
        styleProfile: input.styleProfile,
        locale: input.settings.locale,
        temperature: input.temperature ?? input.settings.llm.temperature,
        maxTokens: input.maxTokens ?? input.settings.llm.maxTokens,
        systemPrompt: input.settings.prompts.systemPrompt,
        toneGuide: input.settings.prompts.toneGuide,
        responseFormat: input.responseFormat,
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("AI generation timed out after almost five minutes.");
    }
    throw error;
  }

  const raw = await response.text();
  let data: {
    text?: string;
    model?: string;
    baseUrl?: string;
    action?: AiActionType;
    error?: string;
  } = {};

  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    if (!response.ok) {
      throw new Error(raw.trim().slice(0, 320) || `AI request failed with HTTP ${response.status}`);
    }
    throw new Error("AI service returned an invalid response.");
  }

  if (!response.ok || !data.text || !data.model || !data.baseUrl || !data.action) {
    throw new Error(data.error ?? "AI request failed");
  }

  return {
    text: data.text,
    model: data.model,
    baseUrl: data.baseUrl,
    action: data.action,
  };
}

export interface PreviewApplyResult {
  updatedText: string;
  diff: DiffChunk[];
}

export function buildPreviewApply(original: string, candidate: string): PreviewApplyResult {
  return {
    updatedText: candidate,
    diff: buildTextDiff(original, candidate),
  };
}
