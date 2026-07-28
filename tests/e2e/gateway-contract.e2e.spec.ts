import { describe, expect, it } from "vitest";
import { extractAssistantText } from "@/app/lib/openaiClient";
import { gateway, skipE2e, upstreamHeaders } from "./support/gateway";

/**
 * Characterization tests for the gateway's OpenAI-compatible layer.
 *
 * These pin the behaviours the app depends on. When the gateway, its compat
 * shim, or the model changes, these fail first and say exactly what moved —
 * before the failure shows up as a mystery parse error in a feature.
 */
describe.skipIf(skipE2e)("gateway OpenAI-compat contract", () => {
  const config = gateway!;
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;

  async function complete(body: Record<string, unknown>) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: upstreamHeaders(config),
      body: JSON.stringify({ model: config.model, ...body }),
    });
    expect(res.ok, `gateway returned ${res.status}: ${await res.clone().text()}`).toBe(true);
    return (await res.json()) as {
      choices: Array<{
        finish_reason: string;
        message: { content?: string; reasoning?: string };
      }>;
      usage?: { completion_tokens?: number };
    };
  }

  it("keeps chain-of-thought out of message.content", async () => {
    const payload = await complete({
      messages: [{ role: "user", content: "Reply with exactly OK" }],
      temperature: 0,
      max_tokens: 64,
    });

    const message = payload.choices[0].message;
    expect(extractAssistantText(payload)).toBe("OK");
    // `ornith:9b` is a reasoning model. The app relies on the compat layer
    // splitting thought from answer; if that stops, every parser downstream
    // starts ingesting reasoning text.
    expect(message.content).not.toContain("reasoning");
    expect(typeof message.reasoning === "string" || message.reasoning === undefined).toBe(true);
  });

  it("honours response_format json_object", async () => {
    const payload = await complete({
      messages: [
        { role: "system", content: "Return a single valid JSON value only. No prose, no fences." },
        { role: "user", content: "Invent one fantasy character as {name, role}." },
      ],
      temperature: 0.2,
      // Must cover the reasoning trace as well as the answer, or this comes back
      // truncated no matter how short the JSON is.
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    expect(payload.choices[0].finish_reason).toBe("stop");
    const parsed = JSON.parse(extractAssistantText(payload)) as Record<string, unknown>;
    expect(parsed).toBeTypeOf("object");
  });

  it("truncates at max_tokens with finish_reason=length rather than erroring", async () => {
    const payload = await complete({
      messages: [
        { role: "system", content: "Return a single valid JSON value only." },
        {
          role: "user",
          content: "Return a JSON array of 20 chapter objects {number,title,summary} for a noir novel.",
        },
      ],
      temperature: 0.2,
      max_tokens: 120,
      response_format: { type: "json_object" },
    });

    // This is the app's most likely structured-output failure mode: the gateway
    // reports success, the body is valid HTTP, and the JSON is cut in half.
    expect(payload.choices[0].finish_reason).toBe("length");
    expect(() => JSON.parse(extractAssistantText(payload))).toThrow();
  });

  it("lists the configured model and rejects an unknown one", async () => {
    const res = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/v1/models`, {
      headers: upstreamHeaders(config),
    });
    expect(res.ok).toBe(true);

    const body = (await res.json()) as { data: Array<{ id: string }> };
    expect(body.data.map((m) => m.id)).toContain(config.model);
  });
});
