import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ai/run/route";

describe("AI run route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends Ollama-compatible structured output without reasoning overhead", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{"title":"La carte rouge"}',
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const request = new NextRequest("http://localhost/api/ai/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-openai-base-url": "http://192.168.0.31:11434",
        "x-openai-model": "gpt-oss:20b",
      },
      body: JSON.stringify({
        action: "brainstorm",
        locale: "fr",
        input: "Propose un titre.",
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "title",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
              },
              required: ["title"],
            },
          },
        },
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { text?: string };
    expect(response.status).toBe(200);
    expect(payload.text).toBe('{"title":"La carte rouge"}');

    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.body)
    ) as {
      reasoning_effort?: string;
      response_format?: { json_schema?: { name?: string } };
      messages?: Array<{ content?: string }>;
    };
    expect(requestBody.reasoning_effort).toBe("none");
    expect(requestBody.response_format?.json_schema?.name).toBe("title");
    expect(requestBody.messages?.[1]?.content).toContain(
      "Return one valid JSON value"
    );
  });

  it("rejects truncated structured output with a useful error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: '{"title":"Incomplete' },
              finish_reason: "length",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const request = new NextRequest("http://localhost/api/ai/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-openai-base-url": "http://192.168.0.37:11434",
        "x-openai-model": "gpt-oss:20b",
      },
      body: JSON.stringify({
        action: "brainstorm",
        locale: "fr",
        input: "Propose un titre.",
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "title",
            strict: true,
            schema: {
              type: "object",
              properties: { title: { type: "string" } },
              required: ["title"],
            },
          },
        },
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(payload.error).toContain("truncated");
  });
});
