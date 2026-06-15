import type { AiActionType, AppSettings } from "@/app/domain/models";
import { buildTextDiff, type DiffChunk } from "@/app/lib/ai/diff";

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
  settings: AppSettings;
  responseFormat?: "text" | "json";
}

function buildHeaders(settings: AppSettings): Record<string, string> {
  const headers: Record<string, string> = {
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
  const response = await fetch("/api/ai/run", {
    method: "POST",
    headers: buildHeaders(input.settings),
    body: JSON.stringify({
      action: input.action,
      input: input.input,
      context: input.context,
      styleProfile: input.styleProfile,
      locale: input.settings.locale,
      temperature: input.settings.llm.temperature,
      maxTokens: input.settings.llm.maxTokens,
      systemPrompt: input.settings.prompts.systemPrompt,
      toneGuide: input.settings.prompts.toneGuide,
      responseFormat: input.responseFormat,
    }),
  });

  const data = (await response.json()) as {
    text?: string;
    model?: string;
    baseUrl?: string;
    action?: AiActionType;
    error?: string;
  };

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

/**
 * Tolerantly pull the first JSON value out of a model response: strips code
 * fences, then scans for a balanced top-level object or array. Returns the
 * parsed value or throws a normalized error. Pure and unit-tested.
 */
export function extractJson(raw: string): unknown {
  const text = raw
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const direct = tryParse(text);
  if (direct.ok) return direct.value;

  const start = text.search(/[[{]/);
  if (start === -1) {
    throw new Error("No JSON value found in the model response.");
  }

  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        const parsed = tryParse(slice);
        if (parsed.ok) return parsed.value;
        throw new Error("Found a JSON block but it could not be parsed.");
      }
    }
  }

  throw new Error("Unterminated JSON value in the model response.");
}

function tryParse(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/**
 * Run an action in JSON mode and validate/shape the parsed value with the
 * provided mapper. The mapper throws if the structure is unusable, which keeps
 * brittle free-text parsing out of feature code.
 */
export async function runStructuredAiAction<T>(
  input: Omit<AiRunInput, "responseFormat">,
  map: (value: unknown) => T
): Promise<{ data: T; result: AiRunResult }> {
  const result = await runAiAction({ ...input, responseFormat: "json" });
  const parsed = extractJson(result.text);
  return { data: map(parsed), result };
}
