import { describe, expect, it } from "vitest";
import {
  joinMultiValueField,
  parseProjectSetupSuggestion,
  splitMultiValueField,
} from "@/app/lib/projectIntake";

describe("project intake helpers", () => {
  it("splits multi-value fields into distinct trimmed tags", () => {
    expect(splitMultiValueField("Thriller, Mystery; thriller \n Gothic")).toEqual([
      "Thriller",
      "Mystery",
      "Gothic",
    ]);
  });

  it("joins multi-value fields without duplicate tags", () => {
    expect(joinMultiValueField(["Adult", "YA", "adult", "Book Club"])).toBe(
      "Adult, YA, Book Club"
    );
  });

  it("parses Ollama structured JSON project suggestions", () => {
    const parsed = parseProjectSetupSuggestion(
      JSON.stringify({
        createMode: "template",
        templateId: "investigation",
        title: "La ville effacée",
        genre: "Mystère fantastique",
        audience: "Adulte",
        tone: "Tendu",
        targetWords: 85000,
        initialChapterCount: 24,
        synopsis: "Une cartographe enquête sur des rues disparues.",
        rationale: "La structure d'enquête convient au mystère central.",
      })
    );

    expect(parsed.createMode).toBe("template");
    expect(parsed.templateId).toBe("investigation");
    expect(parsed.targetWords).toBe(85000);
  });
});
