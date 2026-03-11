import type { AiActionType, ProjectBundle, TrackedEntityType } from "@/app/domain/models";
import { buildEntityHistorySnapshot } from "@/app/lib/ai/entityHistory";
import { computeContinuityConflicts, progressionForEntity } from "@/app/lib/repository";

export type AssistantId =
  | "story_architect"
  | "canon_keeper"
  | "continuity_sentinel"
  | "pov_guardian"
  | "dialogue_doctor"
  | "development_editor"
  | "ghostwriter"
  | "publisher"
  | "launch_strategist";

export interface AssistantProfile {
  id: AssistantId;
  label: string;
  description: string;
  action: AiActionType;
  focus: "project" | "chapter";
  styleProfile?: string;
}

export const ASSISTANTS: AssistantProfile[] = [
  {
    id: "story_architect",
    label: "Story Architect",
    description: "Audits structure, chapter function, hooks, and dramatic progression.",
    action: "plan_audit",
    focus: "project",
  },
  {
    id: "canon_keeper",
    label: "Canon Keeper",
    description: "Reviews entity states, world rules, and chapter-to-chapter canon changes.",
    action: "consistency_check",
    focus: "project",
  },
  {
    id: "continuity_sentinel",
    label: "Continuity Sentinel",
    description: "Checks characters, locations, lore, and timeline links for contradictions.",
    action: "consistency_check",
    focus: "project",
  },
  {
    id: "pov_guardian",
    label: "POV Guardian",
    description: "Audits knowledge, belief, inventory, and viewpoint leakage in scene flow.",
    action: "consistency_check",
    focus: "chapter",
  },
  {
    id: "dialogue_doctor",
    label: "Dialogue Doctor",
    description: "Polishes dialogue, subtext, and voice separation inside the selected chapter.",
    action: "dialogue_polish",
    focus: "chapter",
  },
  {
    id: "development_editor",
    label: "Development Editor",
    description: "Runs a developmental revision pass with concrete fixes.",
    action: "revision_pass",
    focus: "chapter",
  },
  {
    id: "ghostwriter",
    label: "Ghostwriter",
    description: "Applies a guided style transformation through preview-only edits.",
    action: "style_transform",
    focus: "chapter",
    styleProfile: "Deliberate literary fiction with strong scene anchoring",
  },
  {
    id: "publisher",
    label: "Publisher",
    description: "Builds or critiques synopsis, metadata, and export-facing packaging.",
    action: "publish_artifact",
    focus: "project",
  },
  {
    id: "launch_strategist",
    label: "Launch Strategist",
    description: "Generates blurbs, pitches, launch snippets, and marketing positioning.",
    action: "marketing_copy",
    focus: "project",
  },
];

function entityLabel(bundle: ProjectBundle, type: TrackedEntityType, entityId: string): string {
  switch (type) {
    case "character":
      return bundle.characters.find((item) => item.id === entityId)?.name || "Unnamed character";
    case "location":
      return bundle.locations.find((item) => item.id === entityId)?.name || "Unnamed location";
    case "lore":
      return bundle.loreEntries.find((item) => item.id === entityId)?.title || "Untitled lore";
    case "timeline_event":
      return bundle.timeline.find((item) => item.id === entityId)?.label || "Untitled event";
    default:
      return "Unknown";
  }
}

function compactList(values: string[]): string {
  return values.filter(Boolean).join(", ") || "none";
}

function chapterNumberMap(bundle: ProjectBundle): Map<string, number> {
  return new Map(bundle.chapters.map((chapter) => [chapter.id, chapter.number]));
}

function relationshipSummary(bundle: ProjectBundle): string {
  return bundle.relationships.length > 0
    ? bundle.relationships
        .map((relationship) =>
          [
            `${entityLabel(bundle, relationship.sourceType, relationship.sourceId)}`,
            `-> ${relationship.relationType || "related to"} ->`,
            `${entityLabel(bundle, relationship.targetType, relationship.targetId)}`,
            `[status=${relationship.status || "unspecified"}, intensity=${relationship.intensity}]`,
            relationship.notes ? `notes=${relationship.notes}` : "",
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join("\n")
    : "none";
}

function entityRegistry(bundle: ProjectBundle): string[] {
  return [
    bundle.characters.length > 0
      ? `Story-wide characters registry:\n${bundle.characters
          .map((character) =>
            [
              character.name || "Unnamed character",
              `role=${character.role || "none"}`,
              `motivation=${character.motivation || "none"}`,
              `arc=${character.arc || "none"}`,
              `voice=${character.voice || "none"}`,
              `relationships=${character.relationships || "none"}`,
              `notes=${character.notes || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Story-wide characters registry: none",
    bundle.locations.length > 0
      ? `Story-wide locations registry:\n${bundle.locations
          .map((location) =>
            [
              location.name || "Unnamed location",
              `role=${location.role || "none"}`,
              `status=${location.narrativeStatus || "none"}`,
              `description=${location.description || "none"}`,
              `notes=${location.notes || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Story-wide locations registry: none",
    bundle.loreEntries.length > 0
      ? `Story-wide lore registry:\n${bundle.loreEntries
          .map((entry) =>
            [
              entry.title || "Untitled lore",
              `category=${entry.category || "none"}`,
              `status=${entry.status || "none"}`,
              `description=${entry.description || "none"}`,
              `notes=${entry.notes || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Story-wide lore registry: none",
    `Story-wide relationship registry:\n${relationshipSummary(bundle)}`,
  ];
}

function timelineRegistry(bundle: ProjectBundle): string {
  const chapterNumbers = chapterNumberMap(bundle);
  return bundle.timeline.length > 0
    ? `Timeline registry across full book:\n${bundle.timeline
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((event) =>
          [
            `${event.order}. ${event.label || "Untitled event"}`,
            `chapter=${event.chapterId ? chapterNumbers.get(event.chapterId) ?? "linked" : "story"}`,
            `details=${event.details || "none"}`,
            `impact=${event.impact || "none"}`,
          ].join(" | ")
        )
        .join("\n")}`
    : "Timeline registry across full book: none";
}

function chapterTrackerSnapshot(bundle: ProjectBundle, chapterNumber?: number): string[] {
  const chapterNumbers = chapterNumberMap(bundle);
  const reports = bundle.chapterTrackerReports
    .filter((report) => {
      if (chapterNumber == null) return true;
      const reportNumber = chapterNumbers.get(report.chapterId);
      return reportNumber != null && reportNumber <= chapterNumber;
    })
    .slice()
    .sort((a, b) => {
      const chapterA = chapterNumbers.get(a.chapterId) ?? Number.MAX_SAFE_INTEGER;
      const chapterB = chapterNumbers.get(b.chapterId) ?? Number.MAX_SAFE_INTEGER;
      if (chapterA !== chapterB) return chapterA - chapterB;
      return a.trackerType.localeCompare(b.trackerType);
    });
  const latestState = new Map<string, string>();

  reports.forEach((report) => {
    latestState.set(
      report.trackerType,
      report.finalState || report.chapterEvolution || report.previousState || report.rawResponse
    );
  });

  return [
    latestState.size > 0
      ? `Aggregated computed tracker state${
          chapterNumber == null ? " across full book" : " through current chapter"
        }:\n${Array.from(latestState.entries())
          .map(([trackerType, state]) => `${trackerType}: ${state || "none"}`)
          .join("\n")}`
      : `Aggregated computed tracker state${
          chapterNumber == null ? " across full book" : " through current chapter"
        }: none`,
    reports.length > 0
      ? `Ordered computed tracker history${
          chapterNumber == null ? " across full book" : " through current chapter"
        }:\n${reports
          .map((report) =>
            [
              `chapter=${chapterNumbers.get(report.chapterId) ?? "?"}`,
              `tracker=${report.trackerType}`,
              `previous=${report.previousState || "none"}`,
              `evolution=${report.chapterEvolution || "none"}`,
              `final=${report.finalState || "none"}`,
              `raw=${report.rawResponse || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : `Ordered computed tracker history${
          chapterNumber == null ? " across full book" : " through current chapter"
        }: none`,
  ];
}

function progressionSnapshot(bundle: ProjectBundle, chapterNumber?: number): string {
  const chapterNumbers = chapterNumberMap(bundle);
  const progressions = bundle.entityProgression.filter((entry) => {
    if (chapterNumber == null || !entry.chapterId) return true;
    const number = chapterNumbers.get(entry.chapterId);
    return number != null && number <= chapterNumber;
  });

  return progressions.length > 0
    ? `Entity progression ${
        chapterNumber == null ? "across full book" : "through current chapter"
      }:\n${progressions
        .map((entry) => {
          const number = entry.chapterId ? chapterNumbers.get(entry.chapterId) : undefined;
          const trail = progressionForEntity(bundle, entry.entityType, entry.entityId).length;
          return [
            `${entry.entityType}: ${entry.label || entityLabel(bundle, entry.entityType, entry.entityId)}`,
            `chapter=${number ?? "story"}`,
            `start=${entry.startState || "none"}`,
            `delta=${entry.validatedDelta || entry.proposedDelta || "none"}`,
            `end=${entry.endState || "none"}`,
            `knowledge=${entry.knowledge || "none"}`,
            `belief=${entry.belief || "none"}`,
            `inventory=${entry.inventory || "none"}`,
            `narration=${entry.narrationStatus || "none"}`,
            `confidence=${entry.confidence}`,
            `history=${trail}`,
          ].join(" | ");
        })
        .join("\n")}`
    : `Entity progression ${chapterNumber == null ? "across full book" : "through current chapter"}: none`;
}

function chapterStoryMap(bundle: ProjectBundle, selectedChapterNumber?: number): string[] {
  const sorted = bundle.chapters.slice().sort((a, b) => a.number - b.number);
  const previous = selectedChapterNumber == null
    ? []
    : sorted.filter((chapter) => chapter.number < selectedChapterNumber);
  const current = selectedChapterNumber == null
    ? []
    : sorted.filter((chapter) => chapter.number === selectedChapterNumber);
  const following = selectedChapterNumber == null
    ? []
    : sorted.filter((chapter) => chapter.number > selectedChapterNumber);

  const formatChapter = (chapter: ProjectBundle["chapters"][number]): string =>
    [
      `${chapter.number}. ${chapter.title.trim() || "Untitled chapter"}`,
      `summary=${chapter.summary || "none"}`,
      `objectives=${compactList(chapter.objectives)}`,
      `hook=${chapter.hook || "none"}`,
      `story so far=${chapter.storySoFar || "none"}`,
      `notes=${chapter.notes || "none"}`,
      `content=${chapter.content || "none"}`,
    ].join(" | ");

  if (selectedChapterNumber == null) {
    return [
      sorted.length > 0
        ? `Chapter map across full book:\n${sorted.map(formatChapter).join("\n")}`
        : "Chapter map across full book: none",
    ];
  }

  return [
    previous.length > 0
      ? `Chapters before selected chapter:\n${previous.map(formatChapter).join("\n")}`
      : "Chapters before selected chapter: none",
    current.length > 0
      ? `Selected chapter in book context:\n${current.map(formatChapter).join("\n")}`
      : "Selected chapter in book context: none",
    following.length > 0
      ? `Chapters after selected chapter:\n${following.map(formatChapter).join("\n")}`
      : "Chapters after selected chapter: none",
  ];
}

function selectedChapterSceneContext(bundle: ProjectBundle, chapterId?: string): string {
  if (!chapterId) return "";
  const scenes = bundle.scenes
    .filter((scene) => scene.chapterId === chapterId)
    .sort((a, b) => a.order - b.order);

  return scenes.length > 0
    ? `Selected chapter scenes:\n${scenes
        .map((scene) =>
          [
            `${scene.order}. ${scene.title.trim() || "Untitled scene"}`,
            `location=${scene.location || "none"}`,
            `characters=${compactList(scene.characters)}`,
            `description=${scene.description || "none"}`,
            `notes=${scene.notes || "none"}`,
            `draft=${scene.draftText || "none"}`,
          ].join(" | ")
        )
        .join("\n")}`
    : "Selected chapter scenes: none";
}

export function buildAssistantInput(
  assistant: AssistantProfile,
  bundle: ProjectBundle,
  selectedChapterId?: string
): string {
  const chapter = selectedChapterId
    ? bundle.chapters.find((item) => item.id === selectedChapterId) ?? null
    : null;
  const scenes = chapter
    ? bundle.scenes
        .filter((scene) => scene.chapterId === chapter.id)
        .sort((a, b) => a.order - b.order)
    : [];
  const conflicts = computeContinuityConflicts(bundle).slice(0, 8);
  const selectedChapterNumber = chapter?.number;
  const chapterAwareInstructions =
    assistant.focus === "chapter"
      ? [
          "Selected chapter assistant operating mode:",
          "- Respond about the selected chapter, but treat the full book as canon.",
          "- Use earlier chapters to determine the state entering the selected chapter.",
          "- Use later chapters as downstream constraints and continuity targets.",
          "- If the selected chapter appears inconsistent, note whether it is justified by earlier canon or later payoff.",
          "- Story-wide registries define baseline canon. The per-entity chapter history timeline defines when those entities become active, introduced, altered, constrained, or unavailable chapter by chapter.",
          "- Consider story bible entities, lore, timeline, relationships, entity history, and all computed trackers before proposing edits.",
        ].join("\n")
      : [
          "Project assistant operating mode:",
          "- Treat the full project, story bible, computed trackers, and per-entity chapter history timelines as canon.",
        ].join("\n");

  return [
    `Assistant: ${assistant.label}`,
    `Project: ${bundle.project.title}`,
    `Genre: ${bundle.project.genre || "unspecified"}`,
    `Audience: ${bundle.project.audience || "unspecified"}`,
    `Tone: ${bundle.project.tone || "unspecified"}`,
    `Synopsis: ${bundle.project.synopsis || "none"}`,
    `Premise: ${bundle.bible.premise || "none"}`,
    `Themes: ${compactList(bundle.bible.themes)}`,
    `Stakes: ${bundle.bible.stakes || "none"}`,
    `World rules: ${bundle.bible.worldRules || "none"}`,
    chapterAwareInstructions,
    ...entityRegistry(bundle),
    timelineRegistry(bundle),
    ...chapterStoryMap(bundle, selectedChapterNumber),
    chapter
      ? [
          `Selected chapter: ${chapter.number}. ${chapter.title || "Untitled chapter"}`,
          `Summary: ${chapter.summary || "none"}`,
          `Objectives: ${compactList(chapter.objectives)}`,
          `Hook: ${chapter.hook || "none"}`,
          `Story so far: ${chapter.storySoFar || "none"}`,
          `Notes: ${chapter.notes || "none"}`,
          `Chapter text: ${chapter.content || "none"}`,
          `Scenes: ${
            scenes.map((scene) => `${scene.order}. ${scene.title || "Untitled scene"} (${scene.location || "no location"})`).join("; ") ||
            "none"
          }`,
        ].join("\n")
      : "",
    selectedChapterSceneContext(bundle, chapter?.id),
    ...chapterTrackerSnapshot(bundle, selectedChapterNumber),
    buildEntityHistorySnapshot(bundle, selectedChapterNumber, "Per-entity chapter history timeline"),
    progressionSnapshot(bundle, selectedChapterNumber),
    assistant.focus === "chapter" ? progressionSnapshot(bundle) : "",
    assistant.focus === "chapter"
      ? buildEntityHistorySnapshot(bundle, undefined, "Per-entity chapter history timeline")
      : "",
    assistant.focus === "chapter" ? chapterTrackerSnapshot(bundle).join("\n\n") : "",
    conflicts.length > 0
      ? `Known continuity findings:\n${conflicts.map((item) => `- ${item.message}`).join("\n")}`
      : "Known continuity findings: none",
  ]
    .filter(Boolean)
    .join("\n\n");
}
