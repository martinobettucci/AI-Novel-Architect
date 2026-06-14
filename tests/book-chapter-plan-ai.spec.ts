import { describe, expect, it } from "vitest";
import type { ProjectBundle } from "@/app/domain/models";
import {
  BOOK_PLAN_METHODS,
  buildBookChapterPlanContext,
  buildBookChapterPlanInput,
  buildBookChapterPlanMergeContext,
  buildBookChapterPlanMergeInput,
  buildBookChapterPlanMethodContext,
  buildChapterArchitectureGrid,
  createBookChapterPlanResponseFormat,
  getBookPlanMethod,
  parseBookChapterPlanSuggestion,
} from "@/app/lib/ai/bookChapterPlan";

function createBundle(chapterCount = 8): ProjectBundle {
  const timestamp = "2026-06-14T00:00:00.000Z";

  return {
    project: {
      id: "project-1",
      title: "Ashes of Glass",
      genre: "Fantasy thriller",
      audience: "Adult",
      tone: "Tense and lyrical",
      targetWordCount: 80000,
      language: "en",
      status: "active",
      synopsis: "A cartographer discovers maps that can alter reality.",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    manuscript: {
      projectId: "project-1",
      manuscriptTitle: "Ashes of Glass",
      subtitle: "",
      premise: "Power belongs to whoever controls the city's maps.",
      updatedAt: timestamp,
    },
    chapters: Array.from({ length: chapterCount }, (_, index) => ({
      id: `chapter-${index + 1}`,
      projectId: "project-1",
      number: index + 1,
      title: index === 0 ? "The Red Atlas" : "",
      summary: index === 0 ? "Mira steals a map that redraws streets." : "",
      objectives: index === 0 ? ["Steal the map", "Escape the archive"] : [],
      hook: index === 0 ? "Her home has already been redrawn." : "",
      storySoFar: index === 0 ? "Mira survives by forging route ledgers." : "",
      notes: "",
      wordCountTarget: 10000,
      wordCountCurrent: index === 0 ? 1200 : 0,
      status: "draft" as const,
      content: index === 0 ? "<p>Existing drafted canon.</p>" : "",
      aiLocked: index === 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    scenes: [],
    bible: {
      id: "bible-1",
      projectId: "project-1",
      premise: "A map can alter only places its maker surveyed.",
      themes: ["memory", "power"],
      stakes: "The city may become a prison.",
      worldRules: "Every alteration extracts a personal memory.",
      loreEntries: [],
      glossaryEntries: [],
      locations: [],
      updatedAt: timestamp,
    },
    characters: [
      {
        id: "character-1",
        projectId: "project-1",
        name: "Mira",
        role: "Cartographer",
        motivation: "Find her missing brother",
        arc: "Learns that control is not the same as safety",
        voice: "Precise",
        relationships: "Distrusts Jonas",
        notes: "",
        updatedAt: timestamp,
      },
    ],
    locations: [],
    loreEntries: [],
    timeline: [],
    relationships: [],
    entityProgression: [],
    entityHistory: [],
    revisionIssues: [],
    checklist: [],
    annotations: [],
    goal: {
      id: "goal-1",
      projectId: "project-1",
      dailyWords: 500,
      sessionWords: 1000,
      chapterWords: 10000,
      updatedAt: timestamp,
    },
    snapshots: [],
    aiActions: [],
    chapterTrackerReports: [],
  };
}

function validResponse(chapterCount: number): string {
  return JSON.stringify({
    strategy: {
      centralDramaticQuestion: "Can Mira free the city without becoming its next tyrant?",
      endingPromise: "Mira must surrender control of the atlas to save the city.",
      escalationLogic: "Every attempt to repair a district destroys a more personal memory.",
      revealCadence: "Clues reveal the atlas's cost before identifying who designed it.",
    },
    chapters: Array.from({ length: chapterCount }, (_, index) => ({
      chapterNumber: index + 1,
      title: `Chapter ${index + 1}`,
      summary: `A concrete story movement for chapter ${index + 1}.`,
      objectives: ["Advance the immediate goal", "Change the next available choice"],
      hook: `A costly consequence propels chapter ${index + 2}.`,
      storySoFar: `Only facts known before chapter ${index + 1}.`,
      notes: "Preserve the causal chain.",
      wordCountTarget: 10000,
      decisiveTurn: "Mira makes a choice that creates the next obstacle.",
      revealStep: "One clue gains meaning without solving the whole conspiracy.",
      openLoop: "The central causal question remains active.",
      tensionLevel: Math.min(5, index + 2),
    })),
  });
}

describe("book chapter plan AI helpers", () => {
  it("builds quarter-turn architecture and reserves payoff for the end", () => {
    const grid = buildChapterArchitectureGrid(20);

    expect(grid).toHaveLength(20);
    expect(grid[4].phase).toBe("First disaster");
    expect(grid[9].phase).toBe("Midpoint reversal");
    expect(grid[14].phase).toBe("Crisis");
    expect(grid[18].phase).toBe("Climax");
    expect(grid[19].phase).toBe("Resolution");
    expect(grid[0].revealPolicy).toContain("Do not provide the central causal answer");
    expect(grid[18].revealPolicy).toContain("Resolve the central uncertainty");
  });

  it("compresses short books without losing the climax", () => {
    expect(buildChapterArchitectureGrid(2).map((slot) => slot.phase)).toEqual([
      "First disaster",
      "Resolution",
    ]);
    expect(buildChapterArchitectureGrid(2)[1].scenePattern).toContain("Climax");
    expect(buildChapterArchitectureGrid(4).map((slot) => slot.phase)).toEqual([
      "First disaster",
      "Midpoint reversal",
      "Climax",
      "Resolution",
    ]);
  });

  it("serializes all chapters, locked anchors, and the mandatory grid", () => {
    const input = buildBookChapterPlanInput(createBundle());

    expect(input).toContain("Chapter 1 [AI LOCKED]");
    expect(input).toContain("Chapter 8 [editable]");
    expect(input).toContain("Existing drafted canon");
    expect(input).not.toContain("<p>Existing drafted canon.</p>");
    expect(input).toContain("Mandatory chapter architecture grid:");
    expect(input).toContain("phase=Midpoint reversal");
  });

  it("turns researched techniques into explicit generation constraints", () => {
    const context = buildBookChapterPlanContext(8);

    expect(context).toContain("exactly 8 chapters");
    expect(context).toContain("Snowflake Method");
    expect(context).toContain("Goal -> Conflict -> Disaster");
    expect(context).toContain("uncertainty reduction");
    expect(context).toContain("may not disclose the complete causal answer");
    expect(context).toContain("copy all existing chapter fields exactly");
  });

  it("creates an exact-count bounded schema", () => {
    const format = createBookChapterPlanResponseFormat(8);
    const schema = format.json_schema.schema as {
      properties: {
        chapters: {
          minItems: number;
          maxItems: number;
          items: {
            properties: {
              objectives: { minItems: number };
              wordCountTarget: { maximum: number };
            };
          };
        };
      };
    };

    expect(schema.properties.chapters.minItems).toBe(8);
    expect(schema.properties.chapters.maxItems).toBe(8);
    expect(schema.properties.chapters.items.properties.objectives.minItems).toBe(0);
    expect(schema.properties.chapters.items.properties.wordCountTarget.maximum).toBe(20000);
  });

  it("parses a complete plan and attaches deterministic architecture", () => {
    const parsed = parseBookChapterPlanSuggestion(validResponse(8), 8);

    expect(parsed?.chapters).toHaveLength(8);
    expect(parsed?.chapters[1].architecture.phase).toBe("First disaster");
    expect(parsed?.chapters[3].architecture.phase).toBe("Midpoint reversal");
    expect(parsed?.chapters[6].architecture.phase).toBe("Climax");
    expect(parsed?.chapters[7].architecture.phase).toBe("Resolution");
  });

  it("rejects incomplete or duplicate chapter plans", () => {
    const missing = JSON.parse(validResponse(8));
    missing.chapters.pop();
    expect(parseBookChapterPlanSuggestion(JSON.stringify(missing), 8)).toBeNull();

    const duplicate = JSON.parse(validResponse(8));
    duplicate.chapters[7].chapterNumber = 1;
    expect(parseBookChapterPlanSuggestion(JSON.stringify(duplicate), 8)).toBeNull();
  });

  it("exposes three selectable methods mapped to the research sources", () => {
    expect(BOOK_PLAN_METHODS.map((method) => method.id)).toEqual([
      "snowflake",
      "scene-sequel",
      "suspense-uncertainty",
    ]);
    expect(getBookPlanMethod("snowflake")?.title).toBe("The Snowflake Method");
    expect(getBookPlanMethod("suspense-uncertainty")?.role).toContain("tension");
  });

  it("leads each specialist context with its method while keeping the schema constraints", () => {
    const snowflake = buildBookChapterPlanMethodContext(8, "snowflake");

    expect(snowflake).toContain("Macro escalation architect");
    expect(snowflake).toContain("Primary method — The Snowflake Method");
    expect(snowflake).toContain("escalating-disaster macrostructure");
    // companion methods are still referenced, but not the primary as a companion bullet
    expect(snowflake).toContain("Keep these companion methods coherent");
    expect(snowflake).toContain("Scene/Sequel");
    expect(snowflake).toContain("uncertainty reduction");
    // shared output constraints survive
    expect(snowflake).toContain("Return JSON matching the provided schema exactly");
    expect(snowflake).toContain("exactly 8 chapters");

    const suspense = buildBookChapterPlanMethodContext(8, "suspense-uncertainty");
    expect(suspense).toContain("Reveal-cadence and tension strategist");
    expect(suspense).toContain("forward-uncertainty management");
  });

  it("builds a synthesis context that harvests each engaged method", () => {
    const context = buildBookChapterPlanMergeContext(8, [
      "snowflake",
      "scene-sequel",
      "suspense-uncertainty",
    ]);

    expect(context).toContain("3 specialist agents");
    expect(context).toContain("Do not average the candidates");
    expect(context).toContain("macro escalation shape");
    expect(context).toContain("causal handoffs");
    expect(context).toContain("reveal cadence");
    expect(context).toContain("exactly 8 chapters");
  });

  it("embeds each candidate plan into the merge input", () => {
    const snowflake = getBookPlanMethod("snowflake")!;
    const suspense = getBookPlanMethod("suspense-uncertainty")!;
    const input = buildBookChapterPlanMergeInput("PROJECT CONTEXT", [
      { method: snowflake, planJson: '{"plan":"snowflake"}' },
      { method: suspense, planJson: '{"plan":"suspense"}' },
    ]);

    expect(input).toContain("PROJECT CONTEXT");
    expect(input).toContain("Specialist candidate plans to merge (2):");
    expect(input).toContain("Candidate 1 — The Snowflake Method");
    expect(input).toContain('{"plan":"snowflake"}');
    expect(input).toContain("Candidate 2 — Modelling Suspense as Uncertainty Reduction");
    expect(input).toContain('{"plan":"suspense"}');
  });

  it("accepts empty metadata only for immutable locked anchors", () => {
    const response = JSON.parse(validResponse(8));
    response.chapters[0].title = "";
    response.chapters[0].summary = "";
    response.chapters[0].objectives = [];
    response.chapters[0].hook = "";
    response.chapters[0].storySoFar = "";

    expect(parseBookChapterPlanSuggestion(JSON.stringify(response), 8)).toBeNull();
    expect(
      parseBookChapterPlanSuggestion(JSON.stringify(response), 8, new Set([1]))
        ?.chapters[0].title
    ).toBe("");
  });
});
