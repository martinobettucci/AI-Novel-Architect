import type { Chapter, ProjectBundle, TrackedEntityType } from "@/app/domain/models";

export interface ProjectCompanionMessage {
  role: "user" | "assistant";
  text: string;
}

const MAX_FIELD_CHARS = 240;
const MAX_CHAPTER_TEXT_CHARS = 1800;
const MAX_LIST_ITEMS = 14;
const MAX_HISTORY_ITEMS = 8;

function compact(value: string, maxChars = MAX_FIELD_CHARS): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "none";
  return normalized.length > maxChars ? `${normalized.slice(0, maxChars - 1)}...` : normalized;
}

function compactList(values: string[]): string {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join(", ") : "none";
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function chapterLine(chapter: Chapter): string {
  return [
    `${chapter.number}. ${chapter.title.trim() || "Untitled chapter"}`,
    `summary=${compact(chapter.summary)}`,
    `objectives=${compactList(chapter.objectives)}`,
    `hook=${compact(chapter.hook)}`,
  ].join(" | ");
}

function entityLabel(bundle: ProjectBundle, type: TrackedEntityType, entityId: string): string {
  switch (type) {
    case "character":
      return bundle.characters.find((item) => item.id === entityId)?.name || "Unknown character";
    case "location":
      return bundle.locations.find((item) => item.id === entityId)?.name || "Unknown location";
    case "lore":
      return bundle.loreEntries.find((item) => item.id === entityId)?.title || "Unknown lore";
    case "timeline_event":
      return bundle.timeline.find((item) => item.id === entityId)?.label || "Unknown event";
    default:
      return "Unknown";
  }
}

function section(title: string, lines: string[]): string {
  return `${title}\n${lines.length > 0 ? lines.join("\n") : "none"}`;
}

export function buildProjectCompanionContext(
  bundle: ProjectBundle,
  selectedChapterId?: string
): string {
  const chapters = bundle.chapters.slice().sort((a, b) => a.number - b.number);
  const chapterNumberById = new Map(chapters.map((chapter) => [chapter.id, chapter.number]));
  const selectedChapter = selectedChapterId
    ? chapters.find((chapter) => chapter.id === selectedChapterId) ?? null
    : null;
  const selectedIndex = selectedChapter
    ? chapters.findIndex((chapter) => chapter.id === selectedChapter.id)
    : -1;
  const chapterWindow =
    selectedIndex >= 0
      ? [
          ...chapters.slice(Math.max(0, selectedIndex - 2), selectedIndex),
          selectedChapter!,
          ...chapters.slice(selectedIndex + 1, selectedIndex + 3),
        ]
      : chapters.slice(0, MAX_LIST_ITEMS);

  const selectedChapterDraft = selectedChapter
    ? compact(stripHtml(selectedChapter.content), MAX_CHAPTER_TEXT_CHARS)
    : "none";

  const timelineLines = bundle.timeline
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_LIST_ITEMS)
    .map(
      (event) =>
        `${event.order}. ${event.label || "Untitled"} | chapter=${
          event.chapterId ? chapterNumberById.get(event.chapterId) ?? "linked" : "story"
        } | details=${compact(event.details)} | impact=${compact(event.impact)}`
    );

  const relationshipLines = bundle.relationships.slice(0, MAX_LIST_ITEMS).map((relationship) =>
    [
      entityLabel(bundle, relationship.sourceType, relationship.sourceId),
      `-> ${relationship.relationType || "related to"} ->`,
      entityLabel(bundle, relationship.targetType, relationship.targetId),
      `status=${compact(relationship.status)}`,
      `intensity=${relationship.intensity}`,
      `notes=${compact(relationship.notes)}`,
    ].join(" ")
  );

  return [
    "Companion policy:",
    "- You are the author's always-on, project-aware reviewer and brainstorming partner.",
    "- Do not run agents, do not call tools, and do not claim that you executed actions.",
    "- Ground all advice in the canon below and cite chapter numbers when possible.",
    "- If canon is missing, ask one focused follow-up question before making assumptions.",
    "",
    `Project: ${bundle.project.title}`,
    `Genre: ${bundle.project.genre || "unspecified"}`,
    `Audience: ${bundle.project.audience || "unspecified"}`,
    `Tone: ${bundle.project.tone || "unspecified"}`,
    `Synopsis: ${compact(bundle.project.synopsis, 900)}`,
    "",
    section("Story bible", [
      `Premise: ${compact(bundle.bible.premise, 700)}`,
      `Themes: ${compactList(bundle.bible.themes)}`,
      `Stakes: ${compact(bundle.bible.stakes, 500)}`,
      `World rules: ${compact(bundle.bible.worldRules, 700)}`,
    ]),
    "",
    selectedChapter
      ? section("Selected chapter", [
          `Chapter: ${selectedChapter.number}. ${selectedChapter.title || "Untitled chapter"}`,
          `Summary: ${compact(selectedChapter.summary, 600)}`,
          `Objectives: ${compactList(selectedChapter.objectives)}`,
          `Hook: ${compact(selectedChapter.hook, 350)}`,
          `Story so far: ${compact(selectedChapter.storySoFar, 600)}`,
          `Notes: ${compact(selectedChapter.notes, 600)}`,
          `Draft excerpt: ${selectedChapterDraft}`,
        ])
      : "Selected chapter\nnone selected",
    "",
    section(
      "Chapter map",
      chapterWindow.slice(0, MAX_LIST_ITEMS).map((chapter) => chapterLine(chapter))
    ),
    "",
    section(
      "Characters",
      bundle.characters
        .slice(0, MAX_LIST_ITEMS)
        .map(
          (character) =>
            `${character.name || "Unnamed"} | role=${compact(character.role)} | arc=${compact(character.arc)} | notes=${compact(character.notes)}`
        )
    ),
    "",
    section(
      "Locations",
      bundle.locations
        .slice(0, MAX_LIST_ITEMS)
        .map(
          (location) =>
            `${location.name || "Unnamed"} | role=${compact(location.role)} | status=${compact(location.narrativeStatus)} | notes=${compact(location.notes)}`
        )
    ),
    "",
    section(
      "Lore",
      bundle.loreEntries
        .slice(0, MAX_LIST_ITEMS)
        .map(
          (entry) =>
            `${entry.title || "Untitled"} | category=${compact(entry.category)} | status=${compact(entry.status)} | description=${compact(entry.description)}`
        )
    ),
    "",
    section("Timeline", timelineLines),
    "",
    section("Relationships", relationshipLines),
  ].join("\n");
}

export function buildProjectCompanionQuestionInput(
  question: string,
  history: ProjectCompanionMessage[]
): string {
  const trimmed = question.trim();
  const recentHistory = history
    .slice(-MAX_HISTORY_ITEMS)
    .map(
      (message, index) =>
        `${index + 1}. ${message.role.toUpperCase()}: ${compact(message.text, 520)}`
    );

  return [
    "Author question:",
    trimmed,
    "",
    section("Recent conversation", recentHistory),
    "",
    "Response requirements:",
    "- Answer the author directly first.",
    "- Give practical options, tradeoffs, and concrete next writing moves.",
    "- Stay in companion mode only (analysis/advice/opinion).",
  ].join("\n");
}
