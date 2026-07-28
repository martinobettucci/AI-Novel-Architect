import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { aiRequest, applyServerEnv, gateway, skipE2e } from "./support/gateway";

/**
 * Exercises the real route handlers against the real gateway. These are the
 * tests that catch "the app and the endpoint disagree" — auth scheme, URL
 * shape, response shape — which no amount of mocking can.
 *
 * The handlers read their upstream from the environment, so it has to be in
 * place before they are imported.
 */
if (gateway) applyServerEnv(gateway);

const { GET: modelsRoute } = await import("@/app/api/ai/models/route");
const { GET: healthRoute } = await import("@/app/api/ai/health/route");
const { GET: configRoute } = await import("@/app/api/ai/config/route");
const { POST: runRoute } = await import("@/app/api/ai/run/route");
const { extractJson } = await import("@/app/lib/ai/client");

describe.skipIf(skipE2e)("AI routes against the live gateway", () => {
  const config = gateway!;

  it("reports the server's own configuration without leaking the key", async () => {
    const body = await (await configRoute()).json();

    expect(body).toMatchObject({
      baseUrl: config.baseUrl,
      model: config.model,
      configured: true,
    });
    expect(JSON.stringify(body)).not.toContain(config.apiKey);
  });

  it("discovers the configured model in the catalogue", async () => {
    const res = await modelsRoute(new NextRequest(aiRequest("/api/ai/models")));
    const body = await res.json();

    expect(res.status, `models route failed: ${JSON.stringify(body)}`).toBe(200);
    expect(body.models).toBeInstanceOf(Array);
    expect(body.models).toContain(config.model);
    expect(body.selectedModel).toBe(config.model);
  });

  it("reports a connected health check with a latency figure", async () => {
    const res = await healthRoute(new NextRequest(aiRequest("/api/ai/health")));
    const body = await res.json();

    expect(res.status, `health failed: ${JSON.stringify(body)}`).toBe(200);
    expect(body.status).toBe("connected");
    expect(body.model).toBe(config.model);
    expect(body.latencyMs).toBeGreaterThan(0);
    expect(body).not.toHaveProperty("warning");
  });

  it("ignores a caller trying to redirect the upstream endpoint", async () => {
    // Regression guard for the SSRF: these headers used to choose the host the
    // server fetched, and the server's own API key went along with the request.
    const request = new Request("http://localhost/api/ai/health", {
      headers: {
        "x-openai-base-url": "http://127.0.0.1:9/blackhole",
        "x-openai-model": "attacker-model",
        "x-openai-api-key": "attacker-key",
      },
    });

    const body = await (await healthRoute(new NextRequest(request))).json();
    expect(body.baseUrl).toBe(config.baseUrl);
    expect(body.model).toBe(config.model);
  });

  it("runs a plain-text action and returns prose, not reasoning", async () => {
    const request = aiRequest("/api/ai/run", {
      action: "brainstorm",
      locale: "en",
      input: "A lighthouse keeper finds a message in a bottle addressed to them.",
      maxTokens: 4000,
      temperature: 0.4,
    });

    const res = await runRoute(new NextRequest(request));
    const body = await res.json();

    expect(res.status, `run failed: ${JSON.stringify(body)}`).toBe(200);
    expect(body.model).toBe(config.model);
    expect(body.action).toBe("brainstorm");
    expect(body.text.length).toBeGreaterThan(40);
    // Chain-of-thought is disabled upstream and the compat layer keeps it in a
    // separate field regardless. If either changes, the prose gets polluted.
    expect(body.text).not.toMatch(/<think>|^Thinking Process:/i);
  });

  it("runs a JSON action whose output survives extractJson", async () => {
    const request = aiRequest("/api/ai/run", {
      action: "plan_audit",
      locale: "en",
      input: [
        "Return a JSON object shaped exactly like:",
        '{ "issues": [ { "severity": "low|medium|high", "message": "..." } ] }',
        "Audit this outline: Chapter 1 introduces Mara in winter.",
        "Chapter 2 has Mara recall that same day as a summer afternoon.",
      ].join("\n"),
      responseFormat: "json",
      maxTokens: 3000,
    });

    const res = await runRoute(new NextRequest(request));
    const body = await res.json();

    expect(res.status, `json run failed: ${JSON.stringify(body)}`).toBe(200);
    expect(body.truncated).toBe(false);

    const parsed = extractJson(body.text) as { issues?: unknown };
    expect(parsed).toBeTypeOf("object");
    expect(Array.isArray(parsed.issues)).toBe(true);
  });

  it("rejects an empty input without calling the model", async () => {
    const res = await runRoute(
      new NextRequest(aiRequest("/api/ai/run", { action: "expand", locale: "en", input: "   " }))
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  it("rejects an oversized input without calling the model", async () => {
    const res = await runRoute(
      new NextRequest(
        aiRequest("/api/ai/run", {
          action: "expand",
          locale: "en",
          input: "x".repeat(200_001),
        })
      )
    );

    expect(res.status).toBe(413);
  });
});
