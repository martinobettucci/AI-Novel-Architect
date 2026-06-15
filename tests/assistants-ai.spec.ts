import { describe, expect, it } from "vitest";
import type { ProjectBundle } from "@/app/domain/models";
import { ASSISTANTS, buildAssistantInput } from "@/app/lib/ai/assistants";

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
        summary: "Mira steals the atlas from the archive.",
        objectives: ["Steal the map", "Escape the archivists"],
        hook: "Someone has already redrawn her home.",
        storySoFar: "Mira survives by forging route ledgers.",
        notes: "",
        wordCountTarget: 2500,
        wordCountCurrent: 0,
        status: "draft",
        content: "Mira steals the forbidden atlas page.",
        aiLocked: false,
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "chapter-2",
        projectId: "project-1",
        number: 2,
        title: "The Market That Moved",
        summary: "Mira tests the atlas in public.",
        objectives: ["Test the atlas", "Force Jonas to help"],
        hook: "A new street appears with her brother's handwriting.",
        storySoFar: "Mira escaped with the atlas page.",
        notes: "Public use of the atlas must change the city's danger level.",
        wordCountTarget: 2500,
        wordCountCurrent: 0,
        status: "draft",
        content: "Mira tests the atlas in the flooded market.",
        aiLocked: false,
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "chapter-3",
        projectId: "project-1",
        number: 3,
        title: "The City Remembers",
        summary: "The city starts hunting anyone marked by the atlas.",
        objectives: ["Survive the crackdown"],
        hook: "The city now tracks Mira by blood.",
        storySoFar: "The atlas was used in public and exposed Mira.",
        notes: "Depends on chapter 2 escalating public risk.",
        wordCountTarget: 2500,
        wordCountCurrent: 0,
        status: "draft",
        content: "Patrols use the rewritten streets to trap atlas users.",
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
        draftText: "The market tilts when Mira cuts her palm across the page.",
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
      {
        id: "timeline-2",
        projectId: "project-1",
        order: 2,
        chapterId: "chapter-3",
        label: "Crackdown begins",
        details: "The city starts tracing atlas users through rewritten routes.",
        impact: "Makes public atlas use impossible to hide",
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
      {
        id: "prog-2",
        projectId: "project-1",
        chapterId: "chapter-3",
        entityType: "character",
        entityId: "char-1",
        label: "Mira",
        startState: "Exposed but defiant",
        evidence: "",
        proposedDelta: "",
        validatedDelta: "Learns the city can trace her blood",
        endState: "Hunted by the city",
        knowledge: "Knows public atlas use triggered the crackdown",
        belief: "Believes she has become visible to the city itself",
        inventory: "Atlas page and marked blood",
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
        chapterId: "chapter-2",
        entityType: "location",
        entityId: "loc-1",
        label: "Flooded Market",
        note: "Public atlas use makes the market a watched proof site from chapter two onward.",
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
        chapterId: "chapter-2",
        trackerType: "relationships",
        previousState: "Mira is bound to the atlas in secret.",
        chapterEvolution: "She uses it in public and changes the city in front of witnesses.",
        finalState: "Mira's bond to the atlas now threatens to expose her.",
        rawResponse: "The atlas stops behaving like a private danger.",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "tracker-3",
        projectId: "project-1",
        chapterId: "chapter-3",
        trackerType: "timelines",
        previousState: "The city is alert but uncertain.",
        chapterEvolution: "Public atlas evidence triggers a coordinated crackdown.",
        finalState: "The city now hunts atlas users openly.",
        rawResponse: "Chapter 2's public use became chapter 3's crackdown.",
        updatedAt: "2026-03-11T00:00:00.000Z",
      },
    ],
  };
}

describe("assistant context builder", () => {
  it("gives chapter assistants current-chapter and full-book canon context", () => {
    const assistant = ASSISTANTS.find((item) => item.id === "development_editor");
    expect(assistant).toBeTruthy();

    const input = buildAssistantInput(assistant!, createBundle(), "chapter-2");

    expect(input).toContain("Selected chapter assistant operating mode:");
    expect(input).toContain("Use later chapters as downstream constraints and continuity targets.");
    expect(input).toContain("World rules:");
    expect(input).toContain("Story-wide characters registry:");
    expect(input).toContain("Timeline registry across full book:");
    expect(input).toContain("Selected chapter in book context:");
    expect(input).toContain("Chapters after selected chapter:");
    expect(input).toContain("3. The City Remembers");
    expect(input).toContain("Aggregated computed tracker state through current chapter:");
    expect(input).toContain("Ordered computed tracker history through current chapter:");
    expect(input).toContain("Per-entity chapter history timeline through current chapter:");
    expect(input).toContain("Entity progression through current chapter:");
    expect(input).toContain("Entity progression across full book:");
    expect(input).toContain("Aggregated computed tracker state across full book:");
    expect(input).toContain("Per-entity chapter history timeline across full book:");
  });

  it("gives project assistants a full-book snapshot without chapter-only instructions", () => {
    const assistant = ASSISTANTS.find((item) => item.id === "canon_keeper");
    expect(assistant).toBeTruthy();

    const input = buildAssistantInput(assistant!, createBundle());

    expect(input).toContain("Project assistant operating mode:");
    expect(input).toContain("Chapter map across full book:");
    expect(input).toContain("Aggregated computed tracker state across full book:");
    expect(input).not.toContain("Selected chapter assistant operating mode:");
    expect(input).not.toContain("Chapters after selected chapter:");
  });
});
