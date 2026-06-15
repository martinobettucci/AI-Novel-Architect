import { describe, expect, it } from "vitest";
import { extractJson } from "@/app/lib/ai/client";
import {
  buildChapterDeltaInput,
  mapChapterDeltaProposals,
} from "@/app/lib/ai/canonDeltaAnalysis";
import type { ProjectBundle } from "@/app/domain/models";

describe("extractJson", () => {
  it("parses a clean JSON object", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it("extracts a JSON object embedded in prose", () => {
    const raw = 'Sure, here it is: {"deltas": [{"x": 1}]} — hope that helps!';
    expect(extractJson(raw)).toEqual({ deltas: [{ x: 1 }] });
  });

  it("handles braces inside strings", () => {
    expect(extractJson('{"q": "a } b { c"}')).toEqual({ q: "a } b { c" });
  });

  it("throws when no JSON is present", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("mapChapterDeltaProposals", () => {
  it("normalizes a deltas array and drops empty entries", () => {
    const proposals = mapChapterDeltaProposals({
      deltas: [
        {
          entityType: "character",
          entityName: "Nadia",
          layer: "knowledge",
          after: "Knows the password",
          confidence: "explicit",
          rationale: "She reads the note.",
          evidence: [{ quote: "Nadia read the password aloud." }],
        },
        { entityName: "", after: "ignored" },
        { entityName: "Ghost", after: "" },
      ],
    });

    expect(proposals).toHaveLength(1);
    expect(proposals[0].entityName).toBe("Nadia");
    expect(proposals[0].layer).toBe("knowledge");
    expect(proposals[0].evidence[0].quote).toContain("password");
  });

  it("falls back to safe defaults for unknown enum values", () => {
    const [proposal] = mapChapterDeltaProposals([
      { entityName: "X", after: "Y", entityType: "wat", layer: "nope", confidence: "??" },
    ]);
    expect(proposal.entityType).toBe("character");
    expect(proposal.layer).toBe("endState");
    expect(proposal.confidence).toBe("weak_inference");
  });

  it("throws when the payload is not delta-shaped", () => {
    expect(() => mapChapterDeltaProposals(42)).toThrow();
  });
});

describe("buildChapterDeltaInput", () => {
  it("includes the chapter text and entity catalog", () => {
    const bundle = {
      chapters: [
        {
          id: "c1",
          number: 1,
          title: "Opening",
          summary: "",
          content: "<p>Nadia entered the vault.</p>",
        },
      ],
      characters: [{ name: "Nadia" }],
      locations: [],
      loreEntries: [],
      timeline: [],
    } as unknown as ProjectBundle;

    const input = buildChapterDeltaInput(bundle, "c1");
    expect(input).toContain("Nadia entered the vault.");
    expect(input).toContain("Characters: Nadia");
    expect(input).not.toContain("<p>");
  });
});
