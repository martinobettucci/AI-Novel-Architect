import type {
  Chapter,
  ChapterTrackerReport,
  NarrativeRelationship,
  ProjectBundle,
  TrackedEntityType,
} from "@/app/domain/models";
import { buildEntityHistorySnapshot } from "@/app/lib/ai/entityHistory";

type ChapterDetailsSuggestionFields = Pick<
  Chapter,
  "title" | "summary" | "objectives" | "hook" | "storySoFar"
>;

type ChapterDetailsLabel =
  | "Title"
  | "Summary"
  | "Objectives"
  | "Hook"
  | "Story so far";

function compactList(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(", ") || "none";
}

function normalizeValue(value: string): string {
  return value
    .trim()
    .replace(/^["']+/, "")
    .replace(/["']+$/, "");
}

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

function relationshipSummary(
  bundle: ProjectBundle,
  relationship: NarrativeRelationship
): string {
  return [
    entityLabel(bundle, relationship.sourceType, relationship.sourceId),
    `-> ${relationship.relationType || "related to"} ->`,
    entityLabel(bundle, relationship.targetType, relationship.targetId),
    `[status=${relationship.status || "unspecified"}, intensity=${relationship.intensity}]`,
    relationship.notes ? `notes=${relationship.notes}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function parseObjectives(value: string): string[] {
  const bulletLines = value
    .split("\n")
    // Strip one actual list marker only: a greedy digit class would eat the
    // leading numbers of objectives like "3 assassins reach the gate".
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

  if (bulletLines.length > 1) {
    return bulletLines.map((line) => normalizeValue(line));
  }

  const pipeSeparated = value
    .split("|")
    .map((item) => normalizeValue(item))
    .filter(Boolean);

  if (pipeSeparated.length > 1) {
    return pipeSeparated;
  }

  const single = normalizeValue(value);
  return single ? [single] : [];
}

/** Raw model text is a last-resort signal only; cap it so prompts cannot balloon. */
const RAW_FALLBACK_CHARS = 240;

/**
 * The parsed tracker fields already carry the signal. Re-injecting the whole raw
 * response duplicates tens of thousands of tokens across chapters and makes every
 * later call likelier to truncate, so only a short excerpt is used as a fallback.
 */
function trackerState(report: ChapterTrackerReport): string {
  const parsed = report.finalState || report.chapterEvolution || report.previousState;
  if (parsed) return parsed;
  const raw = report.rawResponse.trim();
  if (!raw) return "";
  return raw.length > RAW_FALLBACK_CHARS ? `${raw.slice(0, RAW_FALLBACK_CHARS)}…` : raw;
}

function trackerTypeOrder(report: ChapterTrackerReport): number {
  switch (report.trackerType) {
    case "characters":
      return 0;
    case "locations":
      return 1;
    case "lore":
      return 2;
    case "timelines":
      return 3;
    case "relationships":
      return 4;
    case "progressions":
      return 5;
    default:
      return Number.MAX_SAFE_INTEGER;
  }
}

export function buildChapterDetailsAutocompleteInput(
  bundle: ProjectBundle,
  chapterId: string
): string {
  const chapter = bundle.chapters.find((item) => item.id === chapterId);
  if (!chapter) {
    return "";
  }

  const chaptersToCurrent = bundle.chapters
    .slice()
    .sort((a, b) => a.number - b.number)
    .filter((item) => item.number <= chapter.number);
  const chapterNumberById = new Map(chaptersToCurrent.map((item) => [item.id, item.number]));
  const scenesToCurrent = bundle.scenes
    .filter((scene) => {
      const number = chapterNumberById.get(scene.chapterId);
      return number != null && number <= chapter.number;
    })
    .sort((a, b) => a.order - b.order)
    .map((scene) =>
      [
        `${chapterNumberById.get(scene.chapterId) ?? "?"}.${scene.order}. ${
          scene.title.trim() || "Untitled scene"
        }`,
        `location=${scene.location || "none"}`,
        `characters=${compactList(scene.characters)}`,
        `description=${scene.description || "none"}`,
        `notes=${scene.notes || "none"}`,
        `draft=${scene.draftText || "none"}`,
      ].join(" | ")
    );
  const progressionsToCurrent = bundle.entityProgression
    .filter((entry) => {
      if (!entry.chapterId) return true;
      const number = chapterNumberById.get(entry.chapterId);
      return number != null && number <= chapter.number;
    })
    .map((entry) => {
      const number = entry.chapterId ? chapterNumberById.get(entry.chapterId) : undefined;
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
      ].join(" | ");
    });
  const timelineToCurrent = bundle.timeline
    .filter((event) => {
      if (!event.chapterId) return true;
      const number = chapterNumberById.get(event.chapterId);
      return number != null && number <= chapter.number;
    })
    .sort((a, b) => a.order - b.order)
    .map((event) =>
      [
        `${event.order}. ${event.label || "Untitled event"}`,
        `chapter=${event.chapterId ? chapterNumberById.get(event.chapterId) ?? "?" : "story"}`,
        `details=${event.details || "none"}`,
        `impact=${event.impact || "none"}`,
      ].join(" | ")
    );
  const trackerReportsToCurrent = bundle.chapterTrackerReports
    .filter((report) => {
      const number = chapterNumberById.get(report.chapterId);
      return number != null && number <= chapter.number;
    })
    .slice()
    .sort((a, b) => {
      const chapterA = chapterNumberById.get(a.chapterId) ?? Number.MAX_SAFE_INTEGER;
      const chapterB = chapterNumberById.get(b.chapterId) ?? Number.MAX_SAFE_INTEGER;
      if (chapterA !== chapterB) return chapterA - chapterB;
      return trackerTypeOrder(a) - trackerTypeOrder(b);
    });
  const latestTrackerStateByType = new Map<ChapterTrackerReport["trackerType"], string>();

  trackerReportsToCurrent.forEach((report) => {
    latestTrackerStateByType.set(report.trackerType, trackerState(report));
  });
  const entityRegistry = [
    `Story-wide characters registry: ${compactList(bundle.characters.map((character) => character.name))}`,
    `Story-wide locations registry: ${compactList(bundle.locations.map((location) => location.name))}`,
    `Story-wide lore registry: ${compactList(bundle.loreEntries.map((entry) => entry.title))}`,
    `Story-wide relationship registry: ${
      bundle.relationships.length > 0
        ? bundle.relationships
            .map((relationship) => relationshipSummary(bundle, relationship))
            .join(" || ")
        : "none"
    }`,
  ];

  return [
    `Project title: ${bundle.project.title || "Untitled project"}`,
    `Genre: ${bundle.project.genre || "unspecified"}`,
    `Audience: ${bundle.project.audience || "unspecified"}`,
    `Tone: ${bundle.project.tone || "unspecified"}`,
    `Synopsis: ${bundle.project.synopsis || "none"}`,
    `Selected chapter number: ${chapter.number}`,
    `Current chapter draft title: ${chapter.title || "none"}`,
    `Current chapter summary: ${chapter.summary || "none"}`,
    `Current chapter objectives: ${compactList(chapter.objectives)}`,
    `Current chapter hook: ${chapter.hook || "none"}`,
    `Current chapter story so far: ${chapter.storySoFar || "none"}`,
    `Story Bible premise: ${bundle.bible.premise || "none"}`,
    `Story Bible themes: ${compactList(bundle.bible.themes)}`,
    `Story Bible stakes: ${bundle.bible.stakes || "none"}`,
    `Story Bible world rules: ${bundle.bible.worldRules || "none"}`,
    ...entityRegistry,
    latestTrackerStateByType.size > 0
      ? `Aggregated entity state as of current chapter:\n${Array.from(
          latestTrackerStateByType.entries()
        )
          .map(([trackerType, state]) => `${trackerType}: ${state || "none"}`)
          .join("\n")}`
      : "Aggregated entity state as of current chapter: none",
    trackerReportsToCurrent.length > 0
      ? `Ordered tracker history through current chapter:\n${trackerReportsToCurrent
          .map((report) =>
            [
              `chapter=${chapterNumberById.get(report.chapterId) ?? "?"}`,
              `tracker=${report.trackerType}`,
              `previous=${report.previousState || "none"}`,
              `evolution=${report.chapterEvolution || "none"}`,
              `final=${report.finalState || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Ordered tracker history through current chapter: none",
    buildEntityHistorySnapshot(bundle, chapter.number, "Per-entity chapter history timeline"),
    progressionsToCurrent.length > 0
      ? `Entity progression through current chapter:\n${progressionsToCurrent.join("\n")}`
      : "Entity progression through current chapter: none",
    timelineToCurrent.length > 0
      ? `Timeline through current chapter:\n${timelineToCurrent.join("\n")}`
      : "Timeline through current chapter: none",
    chaptersToCurrent.length > 0
      ? `Chapter details through current chapter:\n${chaptersToCurrent
          .map((item) =>
            [
              `${item.number}. ${item.title.trim() || "Untitled chapter"}`,
              `summary=${item.summary || "none"}`,
              `objectives=${compactList(item.objectives)}`,
              `hook=${item.hook || "none"}`,
              `story so far=${item.storySoFar || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Chapter details through current chapter: none",
    scenesToCurrent.length > 0
      ? `Scenes through current chapter:\n${scenesToCurrent.join("\n")}`
      : "Scenes through current chapter: none",
  ].join("\n\n");
}

export function buildChapterDetailsAutocompleteContext(): string {
  return [
    "Autocomplete the selected chapter details for the current point in story progression.",
    "Use only information available up to and including the selected chapter.",
    "Respect prior chapter details, story bible elements, story-wide registries, relationships, entity progression, and the per-entity chapter history timeline.",
    "Story-wide registries are the baseline canon. The per-entity chapter history timeline tells you when each entity or relationship becomes active, introduced, altered, or unavailable by chapter.",
    "Return plain text using exactly this template. Keep the field labels exactly as written and write all values in the requested response language:",
    "Chapter Details",
    "Title: ...",
    "Summary: ...",
    "Objectives:",
    "- objective 1",
    "- objective 2",
    "- objective 3",
    "Hook: ...",
    "Story so far: ...",
    "Requirements:",
    "- Fill every field.",
    "- Summary should describe only the selected chapter.",
    "- Objectives must be concrete chapter-level beats.",
    "- Hook should create forward momentum at the end of the chapter.",
    "- Story so far should summarize the reader-facing state before this chapter begins.",
    "- Do not spoil chapters after the selected chapter.",
    "- Do not add commentary before or after the template.",
  ].join("\n");
}

export function parseChapterDetailsSuggestion(
  text: string
): Partial<ChapterDetailsSuggestionFields> {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const pattern =
    /(?:^|\n)\s*(?:\*\*)?\s*(Title|Summary|Objectives|Hook|Story so far)\s*:(?:\*\*)?\s*/gi;
  const matches = Array.from(normalized.matchAll(pattern));

  if (matches.length === 0) {
    return {};
  }

  const values: Partial<Record<ChapterDetailsLabel, string>> = {};

  matches.forEach((match, index) => {
    const label = match[1] as ChapterDetailsLabel;
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd =
      index < matches.length - 1
        ? matches[index + 1].index ?? normalized.length
        : normalized.length;
    values[label] = normalizeValue(normalized.slice(contentStart, contentEnd));
  });

  const parsed: Partial<ChapterDetailsSuggestionFields> = {};

  if (values.Title) {
    parsed.title = values.Title;
  }

  if (values.Summary) {
    parsed.summary = values.Summary;
  }

  if (values.Objectives) {
    parsed.objectives = parseObjectives(values.Objectives);
  }

  if (values.Hook) {
    parsed.hook = values.Hook;
  }

  if (values["Story so far"]) {
    parsed.storySoFar = values["Story so far"];
  }

  return parsed;
}
