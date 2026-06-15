import { describe, expect, it } from "vitest";
import {
  buildSceneCardSuggestionContext,
  buildSceneCardSuggestionInput,
  buildSceneDraftContext,
  buildSceneDraftInput,
  parseSceneCardSuggestions,
} from "@/app/lib/ai/sceneCards";
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
        summary: "Mira steals a forbidden map and learns it can redraw streets.",
        objectives: ["Steal the atlas"],
        hook: "The city moves overnight.",
        storySoFar: "Mira survives by forging route ledgers.",
        notes: "",
        wordCountTarget: 2500,
        wordCountCurrent: 0,
        status: "draft",
        content: "Mira steals the atlas from the archive.",
        aiLocked: false,
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "chapter-2",
        projectId: "project-1",
        number: 2,
        title: "Flooded Proof",
        summary: "Mira tests the atlas in the market and pressures Jonas to reveal what he knows.",
        objectives: ["Test the atlas", "Force Jonas to reveal his leverage"],
        hook: "A new street appears in her brother's handwriting.",
        storySoFar: "Mira has proof the atlas works.",
        notes: "Escalate the alliance strain with Jonas.",
        wordCountTarget: 2500,
        wordCountCurrent: 0,
        status: "draft",
        content: "In the flooded market, Mira forces Jonas to help her test the atlas.",
        aiLocked: false,
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    scenes: [
      {
        id: "scene-1",
        projectId: "project-1",
        chapterId: "chapter-2",
        order: 1,
        title: "Market Test",
        description: "Mira cuts her hand and rewrites the market streets.",
        location: "Flooded Market",
        characters: ["Mira", "Jonas"],
        notes: "Jonas lies by omission.",
        draftText: "Mira uses blood on the atlas and watches the stalls shift.",
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "scene-2",
        projectId: "project-1",
        chapterId: "chapter-2",
        order: 2,
        title: "Revealed Street",
        description: "A hidden street appears and pulls Mira deeper into the trap.",
        location: "Flooded Market",
        characters: ["Mira", "Jonas"],
        notes: "Her brother's handwriting appears on the stones.",
        draftText: "",
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    bible: {
      id: "bible-1",
      projectId: "project-1",
      premise: "A cartographer discovers maps that can alter reality.",
      themes: ["memory", "power"],
      stakes: "If Mira fails, the city becomes a prison designed by its rulers.",
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
        motivation: "Restore her family name",
        arc: "Learns to use forbidden maps without becoming tyrannical",
        voice: "Precise and suspicious",
        relationships: "Distrusts Jonas but needs him",
        notes: "Missing brother tied to the regime",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "char-2",
        projectId: "project-1",
        name: "Jonas",
        role: "Smuggler guide",
        motivation: "Stay alive long enough to sell everyone else out first",
        arc: "From evasive guide to compromised ally",
        voice: "Dry and evasive",
        relationships: "Fears Mira and the atlas",
        notes: "Knows the smuggler routes tied to atlas contraband",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    locations: [
      {
        id: "loc-1",
        projectId: "project-1",
        name: "Flooded Market",
        role: "Testing ground for illegal cartography",
        narrativeStatus: "unstable",
        description: "Canals cut through abandoned stalls.",
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
        description: "A mapbook that can rewrite streets after sundown.",
        notes: "Demands blood",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    timeline: [
      {
        id: "timeline-1",
        projectId: "project-1",
        order: 1,
        chapterId: "chapter-1",
        label: "Atlas theft",
        details: "Mira steals the atlas.",
        impact: "Starts the chase",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    relationships: [
      {
        id: "relation-1",
        projectId: "project-1",
        sourceType: "character",
        sourceId: "char-1",
        targetType: "character",
        targetId: "char-2",
        relationType: "uneasy alliance",
        status: "fragile",
        intensity: 6,
        notes: "Trust only exists under pressure.",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "relation-2",
        projectId: "project-1",
        sourceType: "character",
        sourceId: "char-1",
        targetType: "lore",
        targetId: "lore-1",
        relationType: "bound to",
        status: "dangerous",
        intensity: 8,
        notes: "The atlas responds to Mira directly.",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    entityProgression: [
      {
        id: "progress-1",
        projectId: "project-1",
        chapterId: "chapter-1",
        entityType: "character",
        entityId: "char-1",
        label: "Mira",
        startState: "Ashamed and cautious",
        evidence: "",
        proposedDelta: "",
        validatedDelta: "Begins choosing risk over obedience",
        endState: "Curious and cornered",
        knowledge: "Knows the atlas is real",
        belief: "Believes the regime hid her brother's disappearance",
        inventory: "Stolen atlas page",
        narrationStatus: "close third",
        confidence: "strong_inference",
        aiSuggestion: "",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    entityHistory: [
      {
        id: "history-1",
        projectId: "project-1",
        chapterId: "chapter-1",
        entityType: "lore",
        entityId: "lore-1",
        label: "Red Atlas",
        note: "After chapter one, the atlas is a stolen forbidden artifact actively tied to Mira.",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
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
    canonDeltas: [],
    writingSessions: [],
    chapterTrackerReports: [
      {
        id: "tracker-1",
        projectId: "project-1",
        chapterId: "chapter-1",
        trackerType: "characters",
        previousState: "Mira is disgraced and isolated.",
        chapterEvolution: "She steals the atlas and commits to a dangerous path.",
        finalState: "Mira is active, compromised, and newly dangerous.",
        rawResponse: "",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "tracker-2",
        projectId: "project-1",
        chapterId: "chapter-1",
        trackerType: "relationships",
        previousState: "Mira distrusts every institutional ally.",
        chapterEvolution: "She forms a dangerous bond with the atlas.",
        finalState: "Mira is tethered to the Red Atlas and cannot treat it like an object.",
        rawResponse: "",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
  };
}

describe("scene cards AI helpers", () => {
  it("builds scene card suggestion input with tracker and canon context", () => {
    const input = buildSceneCardSuggestionInput(createBundle(), "chapter-2");
    const context = buildSceneCardSuggestionContext();

    expect(input).toContain("Selected chapter number: 2");
    expect(input).toContain("Story Bible world rules:");
    expect(input).toContain("Story-wide characters registry:");
    expect(input).toContain("Story-wide lore registry:");
    expect(input).toContain("Story-wide relationship registry:");
    expect(input).toContain("Aggregated tracker state through current chapter:");
    expect(input).toContain("Per-entity chapter history timeline through current chapter:");
    expect(input).toContain("Entity progression through current chapter:");
    expect(input).toContain("Existing scene cards in selected chapter:");
    expect(context).toContain("write all values in the requested response language");
    expect(context).toContain("Suggest 3 to 6 scene cards.");
    expect(context).toContain("per-entity chapter history");
  });

  it("builds scene draft input with previous-scene continuity", () => {
    const input = buildSceneDraftInput(createBundle(), "chapter-2", "scene-2");
    const context = buildSceneDraftContext();

    expect(input).toContain("Previous scene in current chapter:");
    expect(input).toContain("Market Test");
    expect(input).toContain("Selected scene card: 2. Revealed Street");
    expect(input).toContain("Per-entity chapter history timeline through current chapter:");
    expect(input).toContain("Entity progression through current chapter:");
    expect(context).toContain("continue naturally from it");
  });

  it("parses structured scene card suggestions", () => {
    const parsed = parseSceneCardSuggestions(`Scene Cards
[Scene 1]
Title: Blood on the Grid
Description: Mira uses the atlas in public and realizes the market can be rewritten faster than the lore promised.
Location: Flooded Market
Characters: Mira | Jonas
Notes: Confirm the blood toll and show Jonas hiding prior knowledge.
Draft text: Mira presses her cut thumb to the atlas and the market lanes buckle like wet paper.

[Scene 2]
Title: Street of Handwriting
Description: The rewritten path reveals a hidden street marked with her brother's handwriting and forces a choice.
Location: Flooded Market
Characters: Mira | Jonas
Notes: Carry forward distrust while escalating the hook.
Draft text: A narrow lane rises from the canal stones, each slab painted with letters only Mira should recognize.`);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.title).toBe("Blood on the Grid");
    expect(parsed[0]?.characters).toEqual(["Mira", "Jonas"]);
    expect(parsed[1]?.notes).toContain("hook");
    expect(parsed[1]?.draftText).toContain("narrow lane");
  });
});
