import { describe, expect, it } from "vitest";
import {
  buildChapterTrackerComputationContext,
  buildChapterTrackerComputationInput,
  parseChapterTrackerComputation,
  parseChapterTrackerSuggestion,
} from "@/app/lib/ai/chapterTrackers";
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
        summary: "Mira tests the atlas in the market.",
        objectives: ["Test the atlas"],
        hook: "",
        storySoFar: "Mira has proof the atlas works.",
        notes: "",
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

describe("chapter trackers AI helpers", () => {
  it("builds a chapter tracker prompt with prior chapters and current draft", () => {
    const input = buildChapterTrackerComputationInput(createBundle(), "chapter-2");
    const context = buildChapterTrackerComputationContext();

    expect(input).toContain("Selected chapter number: 2");
    expect(input).toContain("Previous chapters:");
    expect(input).toContain("Current chapter scenes:");
    expect(input).toContain("Relationship tracker through current chapter:");
    expect(input).toContain("Entity progression through current chapter:");
    expect(input).toContain("Per-entity chapter history timeline through current chapter:");
    expect(context).toContain("[Characters]");
    expect(context).toContain("[Entity History]");
    expect(context).toContain("write all values in the requested response language");
    expect(context).toContain("End-of-chapter state:");
  });

  it("parses the structured tracker response", () => {
    const parsed = parseChapterTrackerSuggestion(`Chapter Trackers
[Characters]
Previous state: Mira begins chapter two distrustful and already linked to the atlas.
Chapter evolution: She tests the atlas openly and pressures Jonas into revealing partial knowledge.
End-of-chapter state: Mira is more decisive, more exposed, and now knows Jonas has prior contact with atlas smugglers.

[Locations]
Previous state: The Flooded Market is unstable but still navigable.
Chapter evolution: Atlas changes distort familiar routes and turn the market into hostile terrain.
End-of-chapter state: The market becomes a volatile proof site tied to forbidden cartography.

[Lore]
Previous state: The Red Atlas is known to redraw streets after sundown.
Chapter evolution: The chapter reveals that blood can trigger changes faster than expected.
End-of-chapter state: The atlas is now understood as an active blood-linked artifact rather than a passive mapbook.

[Timelines]
Previous state: The atlas theft has already triggered the chase.
Chapter evolution: Mira's market experiment creates a new escalation point in the plot.
End-of-chapter state: The story timeline now includes public proof that the atlas can alter real streets.

[Relationships]
Previous state: Mira is dangerously bound to the atlas and wary of Jonas.
Chapter evolution: Shared risk forces Mira and Jonas into a brittle operational alliance.
End-of-chapter state: Mira and Jonas remain mistrustful allies, while Mira's link to the atlas deepens.

[Progressions]
Previous state: Mira ended chapter one curious and cornered.
Chapter evolution: She moves from private suspicion to active experimentation and tactical coercion.
End-of-chapter state: Mira ends chapter two emboldened, more knowledgeable, and less able to retreat.`);

    expect(parsed).toHaveLength(6);
    expect(parsed[0]).toMatchObject({
      trackerType: "characters",
    });
    expect(parsed[0]?.previousState).toContain("Mira");
    expect(parsed[4]?.finalState).toContain("mistrustful allies");
    expect(parsed[5]?.finalState).toContain("emboldened");
  });

  it("parses the parallel per-entity history layer", () => {
    const parsed = parseChapterTrackerComputation(
      `Chapter Trackers
[Characters]
Previous state: Mira begins chapter two distrustful and already linked to the atlas.
Chapter evolution: She tests the atlas openly and pressures Jonas into revealing partial knowledge.
End-of-chapter state: Mira is more decisive, more exposed, and now knows Jonas has prior contact with atlas smugglers.

[Locations]
Previous state: The Flooded Market is unstable but still navigable.
Chapter evolution: Atlas changes distort familiar routes and turn the market into hostile terrain.
End-of-chapter state: The market becomes a volatile proof site tied to forbidden cartography.

[Lore]
Previous state: The Red Atlas is known to redraw streets after sundown.
Chapter evolution: The chapter reveals that blood can trigger changes faster than expected.
End-of-chapter state: The atlas is now understood as an active blood-linked artifact rather than a passive mapbook.

[Timelines]
Previous state: The atlas theft has already triggered the chase.
Chapter evolution: Mira's market experiment creates a new escalation point in the plot.
End-of-chapter state: The story timeline now includes public proof that the atlas can alter real streets.

[Relationships]
Previous state: Mira is dangerously bound to the atlas and wary of Jonas.
Chapter evolution: Shared risk forces Mira and Jonas into a brittle operational alliance.
End-of-chapter state: Mira and Jonas remain mistrustful allies, while Mira's link to the atlas deepens.

[Progressions]
Previous state: Mira ended chapter one curious and cornered.
Chapter evolution: She moves from private suspicion to active experimentation and tactical coercion.
End-of-chapter state: Mira ends chapter two emboldened, more knowledgeable, and less able to retreat.

[Entity History]
- entityType: character | entity: Mira | note: Mira publicly proves the atlas works and ends the chapter exposed.
- entityType: location | entity: Flooded Market | note: The market becomes a watched proof site reshaped by atlas use.
- entityType: relationship | sourceType: character | source: Mira | targetType: lore | target: Red Atlas | relationType: bound to | note: Mira's bond to the atlas becomes public-facing and harder to hide.`,
      createBundle()
    );

    expect(parsed.reports).toHaveLength(6);
    expect(parsed.entityHistory).toHaveLength(3);
    expect(parsed.entityHistory[0]).toMatchObject({
      entityType: "character",
      entityId: "char-1",
    });
    expect(parsed.entityHistory[2]).toMatchObject({
      entityType: "relationship",
      entityId: "relation-1",
    });
  });
});
