import type {
  ChapterTrackerReport,
  NarrativeRelationship,
  ProjectBundle,
  Scene,
  TrackedEntityType,
} from "@/app/domain/models";
import { buildEntityHistorySnapshot } from "@/app/lib/ai/entityHistory";

type SceneCardSuggestion = Pick<
  Scene,
  "title" | "description" | "location" | "characters" | "notes" | "draftText"
>;

type SceneCardLabel =
  | "Title"
  | "Description"
  | "Location"
  | "Characters"
  | "Notes"
  | "Draft text";

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

function buildCanonSnapshot(bundle: ProjectBundle, chapterNumber: number): string[] {
  const chaptersToCurrent = bundle.chapters
    .slice()
    .sort((a, b) => a.number - b.number)
    .filter((item) => item.number <= chapterNumber);
  const chapterNumberById = new Map(chaptersToCurrent.map((item) => [item.id, item.number]));
  const trackerReportsToCurrent = bundle.chapterTrackerReports
    .filter((report) => {
      const number = chapterNumberById.get(report.chapterId);
      return number != null && number <= chapterNumber;
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
    latestTrackerStateByType.set(
      report.trackerType,
      report.finalState || report.chapterEvolution || report.previousState || report.rawResponse
    );
  });

  const progressionsToCurrent = bundle.entityProgression
    .filter((entry) => {
      if (!entry.chapterId) return true;
      const number = chapterNumberById.get(entry.chapterId);
      return number != null && number <= chapterNumber;
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
      return number != null && number <= chapterNumber;
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

  return [
    `Story Bible premise: ${bundle.bible.premise || "none"}`,
    `Story Bible themes: ${compactList(bundle.bible.themes)}`,
    `Story Bible stakes: ${bundle.bible.stakes || "none"}`,
    `Story Bible world rules: ${bundle.bible.worldRules || "none"}`,
    `Story-wide characters registry: ${
      bundle.characters.length > 0
        ? bundle.characters
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
            .join("\n")
        : "none"
    }`,
    `Story-wide locations registry: ${
      bundle.locations.length > 0
        ? bundle.locations
            .map((location) =>
              [
                location.name || "Unnamed location",
                `role=${location.role || "none"}`,
                `status=${location.narrativeStatus || "none"}`,
                `description=${location.description || "none"}`,
                `notes=${location.notes || "none"}`,
              ].join(" | ")
            )
            .join("\n")
        : "none"
    }`,
    `Story-wide lore registry: ${
      bundle.loreEntries.length > 0
        ? bundle.loreEntries
            .map((entry) =>
              [
                entry.title || "Untitled lore",
                `category=${entry.category || "none"}`,
                `status=${entry.status || "none"}`,
                `description=${entry.description || "none"}`,
                `notes=${entry.notes || "none"}`,
              ].join(" | ")
            )
            .join("\n")
        : "none"
    }`,
    `Story-wide relationship registry: ${
      bundle.relationships.length > 0
        ? bundle.relationships
            .map((relationship) => relationshipSummary(bundle, relationship))
            .join("\n")
        : "none"
    }`,
    latestTrackerStateByType.size > 0
      ? `Aggregated tracker state through current chapter:\n${Array.from(
          latestTrackerStateByType.entries()
        )
          .map(([trackerType, state]) => `${trackerType}: ${state || "none"}`)
          .join("\n")}`
      : "Aggregated tracker state through current chapter: none",
    trackerReportsToCurrent.length > 0
      ? `Ordered tracker history through current chapter:\n${trackerReportsToCurrent
          .map((report) =>
            [
              `chapter=${chapterNumberById.get(report.chapterId) ?? "?"}`,
              `tracker=${report.trackerType}`,
              `previous=${report.previousState || "none"}`,
              `evolution=${report.chapterEvolution || "none"}`,
              `final=${report.finalState || "none"}`,
              `raw=${report.rawResponse || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Ordered tracker history through current chapter: none",
    buildEntityHistorySnapshot(bundle, chapterNumber, "Per-entity chapter history timeline"),
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
              `notes=${item.notes || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Chapter details through current chapter: none",
  ];
}

function parseCharacters(value: string): string[] {
  return value
    .split(/\n|[|,]/)
    .map((item) => normalizeValue(item))
    .filter(Boolean);
}

function parseSceneCardBlock(block: string): SceneCardSuggestion | null {
  const pattern =
    /(?:^|\n)\s*(?:\*\*)?\s*(Title|Description|Location|Characters|Notes|Draft text)\s*:(?:\*\*)?\s*/gi;
  const matches = Array.from(block.matchAll(pattern));

  if (matches.length === 0) {
    return null;
  }

  const values: Partial<Record<SceneCardLabel, string>> = {};

  matches.forEach((match, index) => {
    const label = match[1] as SceneCardLabel;
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd =
      index < matches.length - 1 ? matches[index + 1].index ?? block.length : block.length;
    values[label] = normalizeValue(block.slice(contentStart, contentEnd));
  });

  const suggestion: SceneCardSuggestion = {
    title: values.Title ?? "",
    description: values.Description ?? "",
    location: values.Location ?? "",
    characters: values.Characters ? parseCharacters(values.Characters) : [],
    notes: values.Notes ?? "",
    draftText: values["Draft text"] ?? "",
  };

  if (!suggestion.title && !suggestion.description && !suggestion.location) {
    return null;
  }

  return suggestion;
}

export function buildSceneCardSuggestionInput(
  bundle: ProjectBundle,
  chapterId: string
): string {
  const chapter = bundle.chapters.find((item) => item.id === chapterId);
  if (!chapter) {
    return "";
  }

  const currentScenes = bundle.scenes
    .filter((scene) => scene.chapterId === chapter.id)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((scene) =>
      [
        `${scene.order}. ${scene.title.trim() || "Untitled scene"}`,
        `location=${scene.location || "none"}`,
        `characters=${compactList(scene.characters)}`,
        `description=${scene.description || "none"}`,
        `notes=${scene.notes || "none"}`,
        `draft=${scene.draftText || "none"}`,
      ].join(" | ")
    );
  const priorChapter = bundle.chapters
    .filter((item) => item.number < chapter.number)
    .slice()
    .sort((a, b) => b.number - a.number)[0];

  return [
    `Project title: ${bundle.project.title || "Untitled project"}`,
    `Genre: ${bundle.project.genre || "unspecified"}`,
    `Audience: ${bundle.project.audience || "unspecified"}`,
    `Tone: ${bundle.project.tone || "unspecified"}`,
    `Synopsis: ${bundle.project.synopsis || "none"}`,
    `Selected chapter number: ${chapter.number}`,
    `Selected chapter title: ${chapter.title || "none"}`,
    `Selected chapter summary: ${chapter.summary || "none"}`,
    `Selected chapter objectives: ${compactList(chapter.objectives)}`,
    `Selected chapter hook: ${chapter.hook || "none"}`,
    `Selected chapter story so far: ${chapter.storySoFar || "none"}`,
    `Selected chapter notes: ${chapter.notes || "none"}`,
    `Selected chapter draft text: ${chapter.content || "none"}`,
    priorChapter
      ? `Previous chapter: ${priorChapter.number}. ${priorChapter.title || "Untitled chapter"} | summary=${
          priorChapter.summary || "none"
        } | hook=${priorChapter.hook || "none"}`
      : "Previous chapter: none",
    ...buildCanonSnapshot(bundle, chapter.number),
    currentScenes.length > 0
      ? `Existing scene cards in selected chapter:\n${currentScenes.join("\n")}`
      : "Existing scene cards in selected chapter: none",
  ].join("\n\n");
}

export function buildSceneCardSuggestionContext(): string {
  return [
    "Suggest scene cards for the selected chapter.",
    "Use computed chapter trackers, entity progression, per-entity chapter history, relationships, locations, lore, timeline, and story bible canon as constraints.",
    "Story-wide registries define baseline canon. Per-entity chapter history defines when those entities or relationships become active or change chapter by chapter.",
    "All suggestions must fit the selected chapter only.",
    "Respect the current chapter summary, objectives, hook, and story-so-far state.",
    "If existing scene cards are present, improve or extend that sequence instead of contradicting it.",
    "Return plain text using exactly this template. Keep the field labels exactly as written and write all values in the requested response language:",
    "Scene Cards",
    "[Scene 1]",
    "Title: ...",
    "Description: ...",
    "Location: ...",
    "Characters: Name A | Name B",
    "Notes: ...",
    "Draft text: ...",
    "",
    "[Scene 2]",
    "Title: ...",
    "Description: ...",
    "Location: ...",
    "Characters: Name A | Name B",
    "Notes: ...",
    "Draft text: ...",
    "Requirements:",
    "- Suggest 3 to 6 scene cards.",
    "- Every scene must advance the selected chapter objectives or hook.",
    "- Use only story-wide entities and facts already present or strongly implied by the provided canon.",
    "- Keep continuity with tracker states and entity progression through the selected chapter.",
    "- Make locations, participating characters, and scene purpose explicit.",
    "- Draft text must be a short prose seed or beat summary, not full scene prose.",
    "- Do not add commentary before or after the template.",
  ].join("\n");
}

export function parseSceneCardSuggestions(text: string): SceneCardSuggestion[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const sectionPattern = /(?:^|\n)\s*(?:\[)?Scene\s+\d+(?:\])?\s*:?\s*/gi;
  const matches = Array.from(normalized.matchAll(sectionPattern));

  if (matches.length === 0) {
    const single = parseSceneCardBlock(normalized);
    return single ? [single] : [];
  }

  return matches
    .map((match, index) => {
      const contentStart = (match.index ?? 0) + match[0].length;
      const contentEnd =
        index < matches.length - 1 ? matches[index + 1].index ?? normalized.length : normalized.length;
      return parseSceneCardBlock(normalized.slice(contentStart, contentEnd));
    })
    .filter((item): item is SceneCardSuggestion => item != null);
}

export function buildSceneDraftInput(
  bundle: ProjectBundle,
  chapterId: string,
  sceneId: string
): string {
  const chapter = bundle.chapters.find((item) => item.id === chapterId);
  const scene = bundle.scenes.find((item) => item.id === sceneId && item.chapterId === chapterId);
  if (!chapter || !scene) {
    return "";
  }

  const currentScenes = bundle.scenes
    .filter((item) => item.chapterId === chapter.id)
    .slice()
    .sort((a, b) => a.order - b.order);
  const previousScene = currentScenes.find((item) => item.order === scene.order - 1) ?? null;

  return [
    `Project title: ${bundle.project.title || "Untitled project"}`,
    `Genre: ${bundle.project.genre || "unspecified"}`,
    `Audience: ${bundle.project.audience || "unspecified"}`,
    `Tone: ${bundle.project.tone || "unspecified"}`,
    `Synopsis: ${bundle.project.synopsis || "none"}`,
    `Selected chapter number: ${chapter.number}`,
    `Selected chapter title: ${chapter.title || "none"}`,
    `Selected chapter summary: ${chapter.summary || "none"}`,
    `Selected chapter objectives: ${compactList(chapter.objectives)}`,
    `Selected chapter hook: ${chapter.hook || "none"}`,
    `Selected chapter story so far: ${chapter.storySoFar || "none"}`,
    `Selected chapter draft text: ${chapter.content || "none"}`,
    ...buildCanonSnapshot(bundle, chapter.number),
    previousScene
      ? `Previous scene in current chapter: ${previousScene.order}. ${
          previousScene.title || "Untitled scene"
        } | location=${previousScene.location || "none"} | characters=${compactList(
          previousScene.characters
        )} | description=${previousScene.description || "none"} | notes=${
          previousScene.notes || "none"
        } | draft=${previousScene.draftText || "none"}`
      : "Previous scene in current chapter: none",
    `Selected scene card: ${scene.order}. ${scene.title || "Untitled scene"} | location=${
      scene.location || "none"
    } | characters=${compactList(scene.characters)} | description=${
      scene.description || "none"
    } | notes=${scene.notes || "none"} | draft seed=${scene.draftText || "none"}`,
  ].join("\n\n");
}

export function buildSceneDraftContext(): string {
  return [
    "Write the selected scene as fiction prose.",
    "Use the selected scene card, selected chapter canon, computed trackers, per-entity chapter history, entity progression, and previous-scene continuity as hard constraints.",
    "If a previous scene exists in the current chapter, continue naturally from it without repeating the same beat.",
    "Respect all story-wide characters, locations, lore, timeline facts, relationships, tracker states, and chapter-linked entity history notes.",
    "Return only the scene prose in plain text.",
    "Requirements:",
    "- Stay inside the selected scene's scope and purpose.",
    "- Keep continuity with the previous scene in the same chapter when one is provided.",
    "- Make chapter-specific objectives and tension visible in the scene.",
    "- Do not add headings, labels, explanations, or markdown.",
  ].join("\n");
}
