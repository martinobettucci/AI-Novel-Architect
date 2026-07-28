import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractAssistantText,
  isConfigured,
  openAiHeaders,
  postCompletion,
  readApiErrorMessage,
  readCompletion,
  readOpenAiConfig,
} from "@/app/lib/openaiClient";

const ENV_KEYS = ["OPENAI_BASE_URL", "OPENAI_MODEL", "OPENAI_API_KEY"] as const;

describe("openai client helpers", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("reads config from the server environment", () => {
    process.env.OPENAI_BASE_URL = "http://localhost:11434/";
    process.env.OPENAI_MODEL = "model-x";
    process.env.OPENAI_API_KEY = "token";

    const config = readOpenAiConfig();
    expect(config.baseUrl).toBe("http://localhost:11434");
    expect(config.model).toBe("model-x");
    expect(config.apiKey).toBe("token");
    expect(config.endpoint).toBe("http://localhost:11434/v1/chat/completions");
    expect(config.modelsEndpoint).toBe("http://localhost:11434/v1/models");
    expect(isConfigured(config)).toBe(true);
  });

  it("does not take the endpoint from request headers", () => {
    // Regression guard. The config used to be read from `x-openai-base-url` /
    // `x-openai-api-key`, so any caller could point the server at a host of
    // their choosing and — since a missing client key fell back to the
    // server's — have OPENAI_API_KEY delivered to it.
    process.env.OPENAI_BASE_URL = "http://trusted:11434";
    process.env.OPENAI_MODEL = "model-x";

    expect(readOpenAiConfig()).toMatchObject({ baseUrl: "http://trusted:11434" });
    expect(readOpenAiConfig.length).toBe(0);
  });

  it("reports an unconfigured deployment", () => {
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_MODEL;
    expect(isConfigured(readOpenAiConfig())).toBe(false);
  });

  it("preserves an endpoint that already names a path", () => {
    process.env.OPENAI_BASE_URL = "http://host/v1";
    process.env.OPENAI_MODEL = "m";
    expect(readOpenAiConfig().endpoint).toBe("http://host/v1/chat/completions");

    process.env.OPENAI_BASE_URL = "http://host/v1/chat/completions";
    const config = readOpenAiConfig();
    expect(config.endpoint).toBe("http://host/v1/chat/completions");
    expect(config.modelsEndpoint).toBe("http://host/v1/models");
  });

  it("builds headers and extracts text", () => {
    expect(openAiHeaders()["Content-Type"]).toBe("application/json");
    expect(openAiHeaders()).not.toHaveProperty("Authorization");
    const withKey = openAiHeaders("abc");
    expect((withKey as Record<string, string>).Authorization).toContain("Bearer");

    const messageText = extractAssistantText({
      choices: [{ message: { content: "hello" } }],
    });
    expect(messageText).toBe("hello");
  });

  it("extracts text from every shape a compatible server may return", () => {
    // Multipart content, as sent by servers that model content as blocks.
    expect(
      extractAssistantText({
        choices: [
          { message: { content: [{ text: "one " }, "two", { image: "ignored" }] } },
        ],
      })
    ).toBe("one two");

    // Legacy completion shape.
    expect(extractAssistantText({ choices: [{ text: "  legacy  " }] })).toBe("legacy");

    // Nothing usable.
    expect(extractAssistantText({ choices: [{ message: { content: 42 } }] })).toBe("");
    expect(extractAssistantText({})).toBe("");
    expect(extractAssistantText(null)).toBe("");
  });

  it("pulls a human-readable message out of assorted error bodies", async () => {
    const message = async (body: string, status = 502) =>
      readApiErrorMessage(new Response(body, { status }));

    expect(await message(JSON.stringify({ error: { message: "nested" } }))).toBe("nested");
    expect(await message(JSON.stringify({ error: "flat" }))).toBe("flat");
    expect(await message(JSON.stringify({ message: "bare" }))).toBe("bare");
    // A proxy's HTML error page is passed through, truncated.
    expect(await message("<html>gateway down</html>")).toContain("gateway down");
    expect(await message("x".repeat(400))).toHaveLength(320);
    expect(await message("", 504)).toBe("HTTP 504");
  });

  it("flags a completion cut off at the token ceiling", () => {
    const complete = readCompletion({
      choices: [{ finish_reason: "stop", message: { content: "done" } }],
      usage: { completion_tokens: 12 },
    });
    expect(complete).toMatchObject({ text: "done", truncated: false, completionTokens: 12 });

    const cut = readCompletion({
      choices: [{ finish_reason: "length", message: { content: '{"a":' } }],
    });
    expect(cut.truncated).toBe(true);
    expect(cut.finishReason).toBe("length");
  });

  describe("postCompletion", () => {
    const config = {
      baseUrl: "http://up",
      model: "m",
      apiKey: "k",
      endpoint: "http://up/v1/chat/completions",
      modelsEndpoint: "http://up/v1/models",
    };

    const okBody = { choices: [{ finish_reason: "stop", message: { content: "hi" } }] };
    const ok = () => new Response(JSON.stringify(okBody), { status: 200 });
    const fail = (status: number) =>
      new Response(JSON.stringify({ error: { message: `boom ${status}` } }), { status });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("returns the completion and disables chain-of-thought", async () => {
      const fetchMock = vi.fn().mockResolvedValue(ok());
      vi.stubGlobal("fetch", fetchMock);

      const result = await postCompletion(config, { messages: [] });

      expect(result.response.ok).toBe(true);
      expect(result.completion?.text).toBe("hi");
      // Thinking tokens are billed against max_tokens and add nothing here.
      const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(sent).toMatchObject({ model: "m", reasoning_effort: "none" });
    });

    it("retries a busy upstream and succeeds", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(fail(503))
        .mockResolvedValueOnce(ok());
      vi.stubGlobal("fetch", fetchMock);

      const result = await postCompletion(config, { messages: [] });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.response.ok).toBe(true);
    });

    it("gives up after exhausting attempts and reports the last error", async () => {
      // A fresh Response per call: a body can only be read once.
      const fetchMock = vi.fn().mockImplementation(async () => fail(503));
      vi.stubGlobal("fetch", fetchMock);

      const result = await postCompletion(config, { messages: [] }, { attempts: 2 });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.response).toMatchObject({ ok: false, status: 502 });
      expect(result.response.error).toContain("boom 503");
      expect(result.completion).toBeUndefined();
    });

    it("does not retry a request the upstream rejected outright", async () => {
      const fetchMock = vi.fn().mockResolvedValue(fail(400));
      vi.stubGlobal("fetch", fetchMock);

      const result = await postCompletion(config, { messages: [] });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.response.ok).toBe(false);
    });

    it("surfaces rate limiting as 429 rather than a generic gateway error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fail(429)));
      const result = await postCompletion(config, { messages: [] }, { attempts: 1 });
      expect(result.response.status).toBe(429);
    });

    it("does not retry a timeout — the upstream is wedged, not busy", async () => {
      const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
      const fetchMock = vi.fn().mockRejectedValue(timeout);
      vi.stubGlobal("fetch", fetchMock);

      const result = await postCompletion(config, { messages: [] });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.response).toMatchObject({ ok: false, status: 503 });
    });

    it("retries a transient network error", async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockResolvedValueOnce(ok());
      vi.stubGlobal("fetch", fetchMock);

      expect((await postCompletion(config, { messages: [] })).response.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it("counts reasoning from either the compat or the native field", () => {
    expect(
      readCompletion({
        choices: [{ finish_reason: "length", message: { content: "", reasoning: "abcd" } }],
      })
    ).toMatchObject({ text: "", truncated: true, reasoningChars: 4 });

    expect(
      readCompletion({
        choices: [{ finish_reason: "stop", message: { content: "hi", thinking: "abc" } }],
      })
    ).toMatchObject({ reasoningChars: 3 });
  });
});
