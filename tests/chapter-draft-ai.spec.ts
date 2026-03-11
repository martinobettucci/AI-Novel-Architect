import { describe, expect, it } from "vitest";
import { buildChapterDraftContext, buildChapterDraftInput } from "@/app/lib/ai/chapterDraft";
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
        storySoFar: "Mira survives by forging route ledgers.",
        notes: "",
        wordCountTarget: 2500,
        wordCountCurrent: 1250,
        status: "draft",
        content: "Mira leaves the archive with blood on the page.",
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
        content: "",
        aiLocked: false,
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "chapter-3",
        projectId: "project-1",
        number: 3,
        title: "Stolen District",
        summary: "The rewritten street reveals a hidden district tied to Mira's missing brother.",
        objectives: ["Enter the hidden district"],
        hook: "The city map now includes a district the regime swore never existed.",
        storySoFar: "Mira has triggered a public impossible event.",
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
        entityType: "relationship",
        entityId: "relation-1",
        label: "Mira -> uneasy alliance -> Jonas",
        note: "Their alliance exists before chapter two but is still fragile entering the market test.",
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

describe("chapter draft AI helpers", () => {
  it("builds a full-chapter drafting brief with canon, scene plan, and chapter targets", () => {
    const input = buildChapterDraftInput(createBundle(), "chapter-2");
    const context = buildChapterDraftContext();

    expect(input).toContain("Assistant: Ghostwriter");
    expect(input).toContain("Selected chapter: 2. Flooded Proof");
    expect(input).toContain("Immediate previous chapter: 1. The Red Atlas");
    expect(input).toContain("Immediate next chapter target: 3. Stolen District");
    expect(input).toContain("Selected chapter scene plan:");
    expect(input).toContain("draft seed=Mira uses blood on the atlas");
    expect(input).toContain("Aggregated computed tracker state through current chapter:");
    expect(input).toContain("Per-entity chapter history timeline through current chapter:");
    expect(input).toContain("Entity progression through current chapter:");
    expect(input).toContain("Target word count: 2500");
    expect(context).toContain("Use the story bible");
    expect(context).toContain("per-entity chapter history");
    expect(context).toContain("scene cards");
    expect(context).toContain("Return only the chapter prose in plain text.");
  });
});
