import { describe, expect, it } from "vitest";
import {
  buildStoryWorldSuggestionContext,
  buildStoryWorldSuggestionInput,
  parseStoryWorldSuggestion,
} from "@/app/lib/ai/storyBibleFollowup";
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
      premise: "A cartographer discovers maps that alter physical reality.",
      themes: ["memory", "power"],
      stakes: "The city can be redrawn into a prison-state.",
      worldRules: "Maps can only change places that have been accurately surveyed.",
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
    canonDeltas: [],
    writingSessions: [],
    chapterTrackerReports: [],
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
  };
}

describe("story bible followup AI helpers", () => {
  it("builds the story world scaffold prompt", () => {
    const input = buildStoryWorldSuggestionInput(createBundle());
    const context = buildStoryWorldSuggestionContext();

    expect(input).toContain("Project title: Ashes of Glass");
    expect(input).toContain("Premise: A cartographer discovers maps that alter physical reality.");
    expect(context).toContain("Story World Scaffold");
    expect(context).toContain("write all values in the requested response language");
    expect(context).toContain("[Relationships]");
  });

  it("parses structured entity and relationship suggestions", () => {
    const parsed = parseStoryWorldSuggestion(`Story World Scaffold
[Characters]
- name: Mira Vale | role: Disgraced cartographer | motivation: Recover her erased family history | arc: From cynic to guardian of shared memory | voice: Precise, bitter, observant | relationships: Distrusts the city council and depends on Ilyan | notes: Secretly altered one map years ago
[Locations]
- name: The Glass City | role: Primary setting | narrativeStatus: unstable | description: A city whose streets can be redrawn by atlas-makers | notes: The city itself preserves political memory
[Lore]
- title: Red Atlas | category: Artifact | status: forbidden | description: A survey-book able to rewrite surveyed spaces | notes: Every alteration forces a loss elsewhere
[Timeline]
- order: 1 | chapter: 1 | label: Mira steals the Red Atlas | details: She takes the atlas from the civic archive | impact: Starts the pursuit and exposes the city-rewrite conspiracy
[Relationships]
- sourceType: character | source: Mira Vale | targetType: lore | target: Red Atlas | relationType: guardian of | status: reluctant | intensity: 4 | notes: She hates the atlas but cannot let anyone else use it`);

    expect(parsed.characters).toHaveLength(1);
    expect(parsed.characters[0]?.name).toBe("Mira Vale");
    expect(parsed.locations[0]?.narrativeStatus).toBe("unstable");
    expect(parsed.lore[0]?.title).toBe("Red Atlas");
    expect(parsed.timeline[0]?.chapterNumber).toBe(1);
    expect(parsed.relationships[0]?.targetType).toBe("lore");
    expect(parsed.relationships[0]?.intensity).toBe(4);
  });
});
