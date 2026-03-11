import { describe, expect, it } from "vitest";
import {
  extractAssistantText,
  openAiHeaders,
  readOpenAiConfigFromHeaders,
} from "@/app/lib/openaiClient";

describe("openai client helpers", () => {
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
    expect(openAiHeaders()["Content-Type"]).toBe("application/json");
    const withKey = openAiHeaders("abc");
    expect((withKey as Record<string, string>).Authorization).toContain("Bearer");

    const messageText = extractAssistantText({
      choices: [{ message: { content: "hello" } }],
    });
    expect(messageText).toBe("hello");
  });
});
