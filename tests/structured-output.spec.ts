import { describe, expect, it } from "vitest";
import { parseStructuredJson } from "@/app/lib/ai/structuredOutput";

describe("structured AI output", () => {
  it("extracts JSON from reasoning wrappers and markdown fences", () => {
    expect(
      parseStructuredJson(
        '<think>internal reasoning</think>\n```json\n{"title":"Mapped city"}\n```'
      )
    ).toEqual({ title: "Mapped city" });
  });

  it("extracts the first balanced JSON value from surrounding prose", () => {
    expect(
      parseStructuredJson(
        'Here is the result:\n{"items":[{"text":"a } inside a string"}]}\nDone.'
      )
    ).toEqual({ items: [{ text: "a } inside a string" }] });
  });
});
