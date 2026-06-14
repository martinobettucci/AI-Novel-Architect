import { afterEach, describe, expect, it, vi } from "vitest";
import {
  connectionErrorMessage,
  extractAssistantText,
  ollamaNativeChatBody,
  openAiHeaders,
  postAiChat,
  readOpenAiConfigFromHeaders,
} from "@/app/lib/openaiClient";

describe("openai client helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads config from headers", () => {
    const headers = new Headers({
      "x-openai-base-url": "http://localhost:11434",
      "x-openai-model": "model-x",
      "x-openai-api-key": "token",
    });

    const config = readOpenAiConfigFromHeaders(headers);
    expect(config.baseUrl).toBe("http://localhost:11434");
    expect(config.model).toBe("model-x");
    expect(config.apiKey).toBe("token");
    expect(config.endpoint).toContain("chat/completions");
  });

  it("builds headers and extracts text", () => {
    expect((openAiHeaders() as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
    const withKey = openAiHeaders("abc");
    expect((withKey as Record<string, string>).Authorization).toContain("Bearer");

    const messageText = extractAssistantText({
      choices: [{ message: { content: "hello" } }],
    });
    expect(messageText).toBe("hello");
  });

  it("normalizes Ollama base URLs and strips thinking traces", () => {
    const config = readOpenAiConfigFromHeaders(
      new Headers({
        "x-openai-base-url": "http://192.168.0.31:11434/api/",
        "x-openai-model": "gpt-oss:20b",
      })
    );

    expect(config.baseUrl).toBe("http://192.168.0.31:11434");
    expect(config.endpoint).toBe("http://192.168.0.31:11434/v1/chat/completions");
    expect(config.ollamaChatEndpoint).toBe("http://192.168.0.31:11434/api/chat");
    expect(
      extractAssistantText({
        choices: [
          {
            message: {
              content: "<think>private reasoning</think>\nFinal answer",
            },
          },
        ],
      })
    ).toBe("Final answer");
    expect(
      extractAssistantText({
        message: { thinking: "private reasoning", content: "Native final answer" },
      })
    ).toBe("Native final answer");
  });

  it("normalizes HTTPS on a private Ollama port to HTTP", () => {
    const config = readOpenAiConfigFromHeaders(
      new Headers({
        "x-openai-base-url": "https://192.168.0.37:11434",
        "x-openai-model": "gpt-oss:20b",
      })
    );

    expect(config.baseUrl).toBe("http://192.168.0.37:11434");
    expect(config.endpoint).toBe("http://192.168.0.37:11434/v1/chat/completions");
  });

  it("maps OpenAI requests to Ollama native chat and falls back when needed", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: { content: '{"ok":true}' } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    const config = readOpenAiConfigFromHeaders(
      new Headers({
        "x-openai-base-url": "http://localhost:11434/v1",
        "x-openai-model": "gpt-oss:20b",
      })
    );
    const body = {
      model: config.model,
      messages: [{ role: "user", content: "Return JSON" }],
      temperature: 0.2,
      max_tokens: 200,
      reasoning_effort: "low" as const,
      response_format: {
        type: "json_schema" as const,
        json_schema: {
          name: "test",
          strict: true as const,
          schema: {
            type: "object",
            properties: { ok: { type: "boolean" } },
            required: ["ok"],
          },
        },
      },
    };

    const response = await postAiChat(config, body);
    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:11434/api/chat",
      expect.objectContaining({ method: "POST" })
    );

    const nativeBody = ollamaNativeChatBody(body);
    expect(nativeBody).toMatchObject({
      model: "gpt-oss:20b",
      stream: false,
      think: "low",
      format: body.response_format.json_schema.schema,
      options: {
        temperature: 0.2,
        num_predict: 200,
      },
    });

    expect(
      ollamaNativeChatBody({
        ...body,
        reasoning_effort: "none",
      })
    ).toMatchObject({ think: false });
  });

  it("explains the common Ollama HTTPS configuration mistake", () => {
    expect(
      connectionErrorMessage(
        "https://192.168.0.31:11434",
        new Error("fetch failed")
      )
    ).toContain("try http:// instead of https://");
  });
});
