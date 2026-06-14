import { describe, expect, it } from "vitest";
import type { ProjectBundle } from "@/app/domain/models";
import {
  buildProjectCompanionContext,
  buildProjectCompanionQuestionInput,
} from "@/app/lib/ai/projectCompanion";

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
        summary: "Mira steals the map from the archive.",
        objectives: ["Steal the map", "Escape"],
        hook: "Someone has already redrawn her home.",
        storySoFar: "Mira survives by forging ledgers.",
        notes: "Sets up pursuit.",
        wordCountTarget: 2500,
        wordCountCurrent: 0,
        status: "draft",
        content: "<p>Mira takes the page and runs.</p>",
        aiLocked: false,
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "chapter-2",
        projectId: "project-1",
        number: 2,
        title: "The Market That Moved",
        summary: "Mira uses the map in public.",
        objectives: ["Use map", "Recruit Jonas"],
        hook: "A street appears with her brother's handwriting.",
        storySoFar: "Mira escaped with the map page.",
        notes: "Public consequences begin.",
        wordCountTarget: 2500,
        wordCountCurrent: 0,
        status: "draft",
        content: "<p>The market tilts as she bleeds on the map.</p>",
        aiLocked: false,
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    scenes: [],
    bible: {
      id: "bible-1",
      projectId: "project-1",
      premise: "A cartographer discovers maps that can alter reality.",
      themes: ["memory", "power"],
      stakes: "If Mira fails, the city becomes a prison.",
      worldRules: "Maps only change places that were accurately surveyed.",
      loreEntries: [],
      glossaryEntries: [],
      locations: [],
      updatedAt: "2026-03-11T00:00:00.000Z",
    },
    characters: [
      {
        id: "char-1",
        projectId: "project-1",
        name: "Mira",
        role: "Disgraced cartographer",
        motivation: "",
        arc: "Learns to use power without becoming a tyrant",
        voice: "",
        relationships: "",
        notes: "Missing brother",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    locations: [
      {
        id: "loc-1",
        projectId: "project-1",
        name: "Flooded Market",
        role: "Volatile public hub",
        narrativeStatus: "unstable",
        description: "",
        notes: "Patrolled after dusk",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    loreEntries: [
      {
        id: "lore-1",
        projectId: "project-1",
        title: "Red Atlas",
        category: "artifact",
        status: "forbidden",
        description: "A mapbook that can rewrite streets.",
        notes: "",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    timeline: [
      {
        id: "timeline-1",
        projectId: "project-1",
        order: 1,
        chapterId: "chapter-1",
        label: "Archive theft",
        details: "Mira steals the map page.",
        impact: "Regime alert",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    relationships: [
      {
        id: "rel-1",
        projectId: "project-1",
        sourceType: "character",
        sourceId: "char-1",
        targetType: "lore",
        targetId: "lore-1",
        relationType: "bound to",
        status: "dangerous",
        intensity: 8,
        notes: "The map answers Mira directly.",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
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

describe("project companion prompts", () => {
  it("builds agentless project-aware context with selected chapter details", () => {
    const context = buildProjectCompanionContext(createBundle(), "chapter-2");

    expect(context).toContain("Companion policy:");
    expect(context).toContain("Do not run agents");
    expect(context).toContain("Story bible");
    expect(context).toContain("Selected chapter");
    expect(context).toContain("Chapter: 2. The Market That Moved");
    expect(context).toContain("Chapter map");
    expect(context).toContain("Timeline");
    expect(context).toContain("Relationships");
  });

  it("builds a conversation-aware question payload", () => {
    const input = buildProjectCompanionQuestionInput("Is this reveal too early?", [
      { role: "user", text: "How risky is chapter 2's reveal?" },
      { role: "assistant", text: "It increases pace but can reduce mystery too soon." },
    ]);

    expect(input).toContain("Author question:");
    expect(input).toContain("Recent conversation");
    expect(input).toContain("1. USER:");
    expect(input).toContain("2. ASSISTANT:");
    expect(input).toContain("Response requirements:");
  });
});
