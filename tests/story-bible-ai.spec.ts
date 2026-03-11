import { describe, expect, it } from "vitest";
import {
  buildStoryBibleSuggestionContext,
  buildStoryBibleSuggestionInput,
  parseStoryBibleSuggestion,
} from "@/app/lib/ai/storyBible";
import type { ProjectBundle } from "@/app/domain/models";

function createBundle(): ProjectBundle {
  return {
    project: {
      id: "project-1",
      title: "Ashes of Glass",
      genre: "Fantasy",
      audience: "Adult",
      tone: "Tense and lyrical",
      targetWordCount: 90000,
      language: "en",
      status: "active",
      synopsis: "A disgraced cartographer finds a city that edits reality through maps.",
      createdAt: "2026-03-11T00:00:00.000Z",
      updatedAt: "2026-03-11T00:00:00.000Z",
    },
    manuscript: {
      projectId: "project-1",
      manuscriptTitle: "Ashes of Glass",
      subtitle: "",
      premise: "",
      updatedAt: "2026-03-11T00:00:00.000Z",
    },
    chapters: [
      {
        id: "chapter-1",
        projectId: "project-1",
        number: 1,
        title: "The Red Atlas",
        summary: "Mira steals a forbidden map and discovers it can rewrite streets overnight.",
        objectives: [],
        hook: "",
        storySoFar: "",
        notes: "",
        wordCountTarget: 2500,
        wordCountCurrent: 0,
        status: "draft",
        content: "",
        aiLocked: false,
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    scenes: [],
    bible: {
      id: "bible-1",
      projectId: "project-1",
      premise: "",
      themes: [],
      stakes: "",
      worldRules: "",
      loreEntries: [],
      glossaryEntries: [],
      locations: [],
      updatedAt: "2026-03-11T00:00:00.000Z",
    },
    characters: [],
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
      chapterWords: 2500,
      updatedAt: "2026-03-11T00:00:00.000Z",
    },
    snapshots: [],
    aiActions: [],
    chapterTrackerReports: [],
  };
}

describe("story bible AI helpers", () => {
  it("builds a constrained story bible instruction set", () => {
    const input = buildStoryBibleSuggestionInput(createBundle());
    const context = buildStoryBibleSuggestionContext();

    expect(input).toContain("Project title: Ashes of Glass");
    expect(input).toContain("Chapter summaries:");
    expect(context).toContain("Story Bible");
    expect(context).toContain("write all values in the requested response language");
    expect(context).toContain("Themes: theme1, theme2, theme3");
  });

  it("parses a structured story bible suggestion", () => {
    const parsed = parseStoryBibleSuggestion(`Story Bible
Premise: A cartographer discovers maps that alter physical reality and becomes the only person able to stop a civic coup.
Themes: memory, power, identity
Stakes: If Mira fails, the city will be redrawn into a prison-state and her erased family history will vanish forever.
World rules: Maps can only change places that have been accurately surveyed. Every alteration demands an equal geographic loss elsewhere.`);

    expect(parsed.premise).toContain("cartographer");
    expect(parsed.themes).toEqual(["memory", "power", "identity"]);
    expect(parsed.stakes).toContain("prison-state");
    expect(parsed.worldRules).toContain("accurately surveyed");
  });

  it("accepts bolded labels and multiline values", () => {
    const parsed = parseStoryBibleSuggestion(`Story Bible
**Premise:** A salvage diver learns the dead can leave instructions inside flooded ruins.
**Themes:** grief, inheritance
**Stakes:** If she ignores the voices, her brother stays dead.
If she obeys them, the drowned city wakes up hungry.
**World rules:** The dead can only speak through waterlogged objects.
Salt water preserves memory; fresh water erases it.`);

    expect(parsed.themes).toEqual(["grief", "inheritance"]);
    expect(parsed.stakes).toContain("drowned city");
    expect(parsed.worldRules).toContain("fresh water erases it");
  });
});
