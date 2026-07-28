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

/**
 * The upstream LLM endpoint, read from the server environment alone.
 *
 * This used to accept `x-openai-base-url` / `x-openai-api-key` from the browser,
 * which made the server fetch any host a caller named and — because a missing
 * client key fell back to the server's own — mail `OPENAI_API_KEY` straight to
 * it. The endpoint is deployment configuration, not user input; the browser no
 * longer has a say in it.
 */
export function readOpenAiConfig(): OpenAiRuntimeConfig {
  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL?.trim() || "");
  const model = process.env.OPENAI_MODEL?.trim() || "";
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  return {
    baseUrl,
    model,
    apiKey: apiKey || undefined,
    endpoint: buildChatEndpoint(baseUrl),
    modelsEndpoint: buildModelsEndpoint(baseUrl),
  };
}

/** True when the deployment has no usable upstream configured. */
export function isConfigured(config: OpenAiRuntimeConfig): boolean {
  return Boolean(config.baseUrl && config.model);
}

export const MISSING_CONFIG_MESSAGE =
  "No LLM endpoint is configured on the server. Set OPENAI_BASE_URL and OPENAI_MODEL (see .env.example).";

export function openAiHeaders(apiKey?: string): Record<string, string> {
  if (!apiKey) {
    return { "Content-Type": "application/json" };
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * Chain-of-thought is billed against `max_tokens` and, on the measured gateway,
 * accounted for roughly 60% of every completion without improving the result.
 * Servers that don't understand this field ignore it.
 */
const NO_REASONING = { reasoning_effort: "none" } as const;

/** How many times to re-attempt a request the upstream may serve on retry. */
const MAX_ATTEMPTS = 3;

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

function backoffMs(attempt: number): number {
  // Exponential with jitter, so a queue that rejected several agents at once
  // doesn't get all of them back in the same instant.
  return Math.round(2 ** attempt * 250 * (0.5 + Math.random()));
}

export interface UpstreamResult {
  response: { ok: boolean; status: number; error: string };
  completion?: CompletionRead;
}

/**
 * POST a chat completion, retrying the failures an overloaded queue produces.
 * A serializing backend routinely answers 503 while busy, and without this a
 * single transient rejection loses a whole multi-agent run.
 */
export async function postCompletion(
  config: OpenAiRuntimeConfig,
  body: Record<string, unknown>,
  options: { timeoutMs?: number; attempts?: number } = {}
): Promise<UpstreamResult> {
  const attempts = options.attempts ?? MAX_ATTEMPTS;
  let lastError = "Upstream request failed";
  let lastStatus = 503;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, backoffMs(attempt)));
    }

    try {
      const res = await fetch(config.endpoint, {
        method: "POST",
        headers: openAiHeaders(config.apiKey),
        signal: AbortSignal.timeout(options.timeoutMs ?? 280_000),
        body: JSON.stringify({ model: config.model, ...NO_REASONING, ...body }),
      });

      if (res.ok) {
        return {
          response: { ok: true, status: 200, error: "" },
          completion: readCompletion(await res.json()),
        };
      }

      lastStatus = res.status === 429 ? 429 : 502;
      lastError = await readApiErrorMessage(res);
      if (!isRetryableStatus(res.status)) break;
    } catch (error) {
      lastStatus = 503;
      lastError = error instanceof Error ? error.message : "Network error";
      // A timeout means the upstream is wedged, not merely busy; retrying only
      // multiplies the wait the user already sat through.
      if (error instanceof Error && error.name === "TimeoutError") break;
    }
  }

  return { response: { ok: false, status: lastStatus, error: lastError } };
}

export interface CompletionRead {
  text: string;
  /** "stop" | "length" | … — "length" means the model was cut off mid-answer. */
  finishReason: string;
  /** True when the budget ran out before the model finished its answer. */
  truncated: boolean;
  /** Characters of chain-of-thought the model emitted, for diagnostics only. */
  reasoningChars: number;
  completionTokens?: number;
}

/**
 * Read a chat completion along with the signals that say whether it is
 * *complete*. Reasoning models bill their thinking against `max_tokens`, so a
 * budget that looks generous can be spent entirely on thought — the call then
 * returns HTTP 200 with empty or half-written content. Reading only the text
 * turns that into silent data loss, so callers get `truncated` too.
 */
export function readCompletion(payload: unknown): CompletionRead {
  const choice = (
    payload as {
      choices?: Array<{
        finish_reason?: unknown;
        message?: { reasoning?: unknown; thinking?: unknown };
      }>;
      usage?: { completion_tokens?: unknown };
    }
  )?.choices?.[0];

  const finishReason = typeof choice?.finish_reason === "string" ? choice.finish_reason : "";
  const reasoning = choice?.message?.reasoning ?? choice?.message?.thinking;
  const completionTokens = (payload as { usage?: { completion_tokens?: unknown } })?.usage
    ?.completion_tokens;

  return {
    text: extractAssistantText(payload),
    finishReason,
    truncated: finishReason === "length",
    reasoningChars: typeof reasoning === "string" ? reasoning.length : 0,
    completionTokens: typeof completionTokens === "number" ? completionTokens : undefined,
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
