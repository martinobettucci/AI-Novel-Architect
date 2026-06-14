import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getHealth } from "@/app/api/ai/health/route";
import { GET as getModels } from "@/app/api/ai/models/route";

function ollamaRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: {
      "x-openai-base-url": "http://192.168.0.31:11434",
      "x-openai-model": "gpt-oss:20b",
    },
  });
}

describe("AI diagnostic routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads models through the native Ollama tags fallback", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [
              { name: "gpt-oss:20b" },
              { name: "qwen3:8b" },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const response = await getModels(ollamaRequest("/api/ai/models"));
    const payload = (await response.json()) as {
      models?: string[];
      endpoint?: string;
    };

    expect(response.status).toBe(200);
    expect(payload.models).toEqual(["gpt-oss:20b", "qwen3:8b"]);
    expect(payload.endpoint).toBe("http://192.168.0.31:11434/api/tags");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("checks health through native Ollama chat and reads final content", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: {
              thinking: "hidden reasoning",
              content: "OK",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const response = await getHealth(ollamaRequest("/api/ai/health"));
    const payload = (await response.json()) as {
      status?: string;
      warning?: string;
    };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("connected");
    expect(payload.warning).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const nativeBody = JSON.parse(
      String((fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.body)
    ) as {
      think?: string;
      options?: { num_predict?: number };
    };
    expect(nativeBody.think).toBe("low");
    expect(nativeBody.options?.num_predict).toBe(128);
  });
});
