import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "@/app/lib/ai/prompts";

describe("ai prompts", () => {
  it("builds system prompt with locale and directive", () => {
    const prompt = buildSystemPrompt({
      action: "rewrite",
      locale: "fr",
      input: "sample",
      context: "ctx",
      toneGuide: "Direct",
    });

    expect(prompt).toContain("Write the response body in French");
    expect(prompt).toContain("preserve those labels exactly as provided");
    expect(prompt).toContain("Action directive");
  });

  it("builds user prompt with context and input", () => {
    const prompt = buildUserPrompt({
      action: "summarize",
      locale: "en",
      input: "Body",
      context: "Context",
    });

    expect(prompt).toContain("Action: summarize");
    expect(prompt).toContain("Context");
    expect(prompt).toContain("Body");
  });

  it("supports style profile and no context", () => {
    const system = buildSystemPrompt({
      action: "style_transform",
      locale: "en",
      input: "x",
      styleProfile: "Noir",
      systemPrompt: "Custom system",
    });

    const user = buildUserPrompt({
      action: "continue",
      locale: "en",
      input: "Body",
    });

    expect(system).toContain("Style profile: Noir");
    expect(system).toContain("Custom system");
    expect(user).toContain("Action: continue");
    expect(user).toContain("Write all generated content in English.");
  });
});
