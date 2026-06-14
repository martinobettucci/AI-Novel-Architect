import { DEFAULT_LLM_BASE_URL, DEFAULT_LLM_MODEL } from "@/app/domain/defaults";

export interface OpenAiRuntimeConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  endpoint: string;
  modelsEndpoint: string;
  ollamaChatEndpoint: string;
  ollamaModelsEndpoint: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  const normalized = baseUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/v1\/chat\/completions$/i, "")
    .replace(/\/api\/chat$/i, "")
    .replace(/\/(?:v1|api)$/i, "");

  try {
    const url = new URL(normalized);
    const localOllamaHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      /^10\./.test(url.hostname) ||
      /^192\.168\./.test(url.hostname) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(url.hostname);

    if (localOllamaHost && url.protocol === "https:" && url.port === "11434") {
      url.protocol = "http:";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // Let the downstream fetch report malformed URLs with request context.
  }

  return normalized;
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

export function isOllamaModel(model: string): boolean {
  return /^gpt-oss(?::|$)/i.test(model);
}

function isLikelyOllama(config: OpenAiRuntimeConfig): boolean {
  return isOllamaModel(config.model) || /:11434(?:\/|$)/.test(config.baseUrl);
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
    ollamaChatEndpoint: `${baseUrl}/api/chat`,
    ollamaModelsEndpoint: `${baseUrl}/api/tags`,
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

  if (typeof content === "string") return cleanAssistantText(content);
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
      .trim()
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .trim();
  }

  const fallback = (
    payload as {
      choices?: Array<{ text?: unknown }>;
    }
  )?.choices?.[0]?.text;

  if (typeof fallback === "string") return cleanAssistantText(fallback);

  const nativeContent = (
    payload as {
      message?: { content?: unknown };
      response?: unknown;
    }
  )?.message?.content;
  if (typeof nativeContent === "string") return cleanAssistantText(nativeContent);

  const nativeResponse = (payload as { response?: unknown })?.response;
  if (typeof nativeResponse === "string") return cleanAssistantText(nativeResponse);
  return "";
}

function cleanAssistantText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*```(?:text|markdown|md|json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

interface ChatRequestBody {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  max_tokens: number;
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  reasoning_effort?: "low" | "medium" | "high" | "none";
}

export function ollamaNativeChatBody(body: ChatRequestBody): Record<string, unknown> {
  const think =
    body.reasoning_effort === "none"
      ? false
      : body.reasoning_effort === "high"
        ? "high"
        : body.reasoning_effort === "medium"
          ? "medium"
          : "low";

  return {
    model: body.model,
    messages: body.messages,
    stream: false,
    options: {
      temperature: body.temperature,
      num_predict: body.max_tokens,
    },
    ...(body.response_format
      ? { format: body.response_format.json_schema.schema }
      : {}),
    ...(isOllamaModel(body.model) ? { think } : {}),
  };
}

function shouldTryOllamaFallback(response: Response): boolean {
  return response.status === 404 || response.status === 405 || response.status === 501;
}

export async function postAiChat(
  config: OpenAiRuntimeConfig,
  body: ChatRequestBody,
  options: { timeoutMs?: number } = {}
): Promise<Response> {
  const signal = AbortSignal.timeout(options.timeoutMs ?? 285_000);
  const openAiResponse = await fetch(config.endpoint, {
    method: "POST",
    headers: openAiHeaders(config.apiKey),
    body: JSON.stringify(body),
    signal,
  });

  const structuredOutputRejected =
    Boolean(body.response_format) &&
    (openAiResponse.status === 400 || openAiResponse.status === 422);
  if (
    !shouldTryOllamaFallback(openAiResponse) &&
    !(structuredOutputRejected && isLikelyOllama(config))
  ) {
    return openAiResponse;
  }

  return fetch(config.ollamaChatEndpoint, {
    method: "POST",
    headers: openAiHeaders(config.apiKey),
    body: JSON.stringify(ollamaNativeChatBody(body)),
    signal,
  });
}

export function extractFinishReason(payload: unknown): string {
  const openAiReason = (
    payload as {
      choices?: Array<{ finish_reason?: unknown }>;
    }
  )?.choices?.[0]?.finish_reason;
  if (typeof openAiReason === "string") return openAiReason;

  const nativeReason = (payload as { done_reason?: unknown })?.done_reason;
  return typeof nativeReason === "string" ? nativeReason : "";
}

export function connectionErrorMessage(baseUrl: string, error: unknown): string {
  const message = error instanceof Error ? error.message : "Network error";
  if (/^https:\/\/.+:11434(?:\/|$)/i.test(baseUrl)) {
    return `${message}. Ollama uses HTTP on port 11434 by default; try http:// instead of https:// unless a TLS proxy is configured.`;
  }
  return message;
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
