import { DEFAULT_LLM_BASE_URL, DEFAULT_LLM_MODEL } from "@/app/domain/defaults";

export interface OpenAiRuntimeConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  endpoint: string;
  modelsEndpoint: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function buildChatEndpoint(baseUrl: string): string {
  if (baseUrl.endsWith("/chat/completions")) return baseUrl;
  if (baseUrl.endsWith("/v1")) return `${baseUrl}/chat/completions`;
  return `${baseUrl}/v1/chat/completions`;
}

function buildModelsEndpoint(baseUrl: string): string {
  if (baseUrl.endsWith("/chat/completions")) {
    return baseUrl.replace(/\/chat\/completions$/, "/models");
  }
  if (baseUrl.endsWith("/v1")) return `${baseUrl}/models`;
  return `${baseUrl}/v1/models`;
}

export function readOpenAiConfigFromHeaders(headers: Headers): OpenAiRuntimeConfig {
  const baseUrl = normalizeBaseUrl(
    headers.get("x-openai-base-url") || process.env.OPENAI_BASE_URL || DEFAULT_LLM_BASE_URL
  );
  const model =
    headers.get("x-openai-model")?.trim() || process.env.OPENAI_MODEL?.trim() || DEFAULT_LLM_MODEL;
  const apiKey = headers.get("x-openai-api-key")?.trim() || process.env.OPENAI_API_KEY?.trim();

  return {
    baseUrl,
    model,
    apiKey: apiKey || undefined,
    endpoint: buildChatEndpoint(baseUrl),
    modelsEndpoint: buildModelsEndpoint(baseUrl),
  };
}

export function openAiHeaders(apiKey?: string): HeadersInit {
  if (!apiKey) {
    return { "Content-Type": "application/json" };
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

export function extractAssistantText(payload: unknown): string {
  const content = (
    payload as {
      choices?: Array<{ message?: { content?: unknown }; text?: unknown }>;
    }
  )?.choices?.[0]?.message?.content;

  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join("")
      .trim();
  }

  const fallback = (
    payload as {
      choices?: Array<{ text?: unknown }>;
    }
  )?.choices?.[0]?.text;

  if (typeof fallback === "string") return fallback.trim();
  return "";
}

export async function readApiErrorMessage(res: Response): Promise<string> {
  const raw = await res.text();
  if (!raw) {
    return `HTTP ${res.status}`;
  }

  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string } | string;
      message?: string;
    };

    if (typeof parsed.error === "string") return parsed.error;
    if (typeof parsed.error?.message === "string") return parsed.error.message;
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    // raw not JSON
  }

  return raw.slice(0, 320);
}
