import { describe, expect, it } from "vitest";
import {
  buildChapterDetailsAutocompleteContext,
  buildChapterDetailsAutocompleteInput,
  parseChapterDetailsSuggestion,
} from "@/app/lib/ai/chapterDetails";
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
        objectives: ["Steal the map", "Escape the archivists"],
        hook: "Someone has already redrawn her home.",
        storySoFar: "Mira has been surviving by forging route ledgers.",
        notes: "",
        wordCountTarget: 2500,
        wordCountCurrent: 0,
        status: "draft",
        content: "",
        aiLocked: false,
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "chapter-2",
        projectId: "project-1",
        number: 2,
        title: "",
        summary: "",
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
    scenes: [
      {
        id: "scene-1",
        projectId: "project-1",
        chapterId: "chapter-2",
        order: 1,
        title: "Glass Market",
        description: "Mira tests the stolen map inside the flooded market district.",
        location: "Flooded Market",
        characters: ["Mira", "Jonas"],
        notes: "The map reacts to blood.",
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
    ],
    locations: [
      {
        id: "loc-1",
        projectId: "project-1",
        name: "Flooded Market",
        role: "Testing ground for illegal cartography",
        narrativeStatus: "unstable",
        description: "Canals cut through abandoned stalls and mirrored awnings.",
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
        notes: "Demands a blood toll",
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
        details: "Mira steals the atlas page from the state archive.",
        impact: "Puts the regime on alert",
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
        notes: "The atlas seems to answer Mira directly.",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
    entityProgression: [
      {
        id: "prog-1",
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
        knowledge: "Knows the Red Atlas is real",
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
        entityType: "character",
        entityId: "char-1",
        label: "Mira",
        note: "Mira enters the story as a disgraced cartographer already under regime pressure.",
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
        chapterEvolution: "She chooses theft over obedience.",
        finalState: "Mira is active, compromised, and newly dangerous.",
        rawResponse: "Mira now has proof the atlas is real.",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "tracker-2",
        projectId: "project-1",
        chapterId: "chapter-1",
        trackerType: "relationships",
        previousState: "Mira distrusts every institutional ally.",
        chapterEvolution: "She starts a dangerous bond with the atlas itself.",
        finalState: "Mira is tethered to the Red Atlas and cannot treat it like an object.",
        rawResponse: "The atlas responds directly to her blood.",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
  };
}

describe("chapter details AI helpers", () => {
  it("builds an input with progression-limited canon context", () => {
    const input = buildChapterDetailsAutocompleteInput(createBundle(), "chapter-2");
    const context = buildChapterDetailsAutocompleteContext();

    expect(input).toContain("Selected chapter number: 2");
    expect(input).toContain("Story Bible premise:");
    expect(input).toContain("Story-wide characters registry:");
    expect(input).toContain("Story-wide relationship registry:");
    expect(input).toContain("Aggregated entity state as of current chapter:");
    expect(input).toContain("Ordered tracker history through current chapter:");
    expect(input).toContain("Per-entity chapter history timeline through current chapter:");
    expect(input).toContain("Entity progression through current chapter:");
    expect(input).toContain("Chapter details through current chapter:");
    expect(input).toContain("Timeline through current chapter:");
    expect(context).toContain("write all values in the requested response language");
    expect(context).toContain("Do not spoil chapters after the selected chapter.");
    expect(context).toContain("Story-wide registries are the baseline canon.");
    expect(context).toContain("Objectives:");
  });

  it("parses a structured chapter detail suggestion", () => {
    const parsed = parseChapterDetailsSuggestion(`Chapter Details
Title: The Market That Moved
Summary: Mira tests the stolen atlas in the flooded market and realizes the city is already being reshaped by an unseen rival.
Objectives:
- Verify the atlas can alter real streets
- Force Jonas to reveal what he knows about the atlas network
- Escape before the patrols trap them in the rewritten district
Hook: A new street appears with her brother's handwriting painted across its stones.
Story so far: Mira stole a forbidden map and learned the regime hid more than contraband inside the archive.`);

    expect(parsed.title).toBe("The Market That Moved");
    expect(parsed.summary).toContain("flooded market");
    expect(parsed.objectives).toEqual([
      "Verify the atlas can alter real streets",
      "Force Jonas to reveal what he knows about the atlas network",
      "Escape before the patrols trap them in the rewritten district",
    ]);
    expect(parsed.hook).toContain("brother's handwriting");
    expect(parsed.storySoFar).toContain("forbidden map");
  });

  it("accepts bolded labels and pipe-separated objectives", () => {
    const parsed = parseChapterDetailsSuggestion(`Chapter Details
**Title:** The Tidal Blueprint
**Summary:** Mira learns the atlas reacts to blood and starts rewriting merchant routes.
**Objectives:** Test the atlas safely | Learn whether Jonas is lying | Leave with proof
**Hook:** The market wakes after midnight.
**Story so far:** Mira stole the atlas and survived the archive raid.`);

    expect(parsed.title).toBe("The Tidal Blueprint");
    expect(parsed.objectives).toEqual([
      "Test the atlas safely",
      "Learn whether Jonas is lying",
      "Leave with proof",
    ]);
    expect(parsed.storySoFar).toContain("archive raid");
  });
});
