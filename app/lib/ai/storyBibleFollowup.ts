import type {
  CharacterProfile,
  EntityProgression,
  LocationProfile,
  LoreEntryRecord,
  NarrativeRelationship,
  ProjectBundle,
  TimelineEvent,
  TrackedEntityType,
} from "@/app/domain/models";
import { buildEntityHistorySnapshot } from "@/app/lib/ai/entityHistory";

type StoryWorldSection = "characters" | "locations" | "lore" | "timeline" | "relationships";

export interface StoryWorldSuggestion {
  characters: Array<Pick<CharacterProfile, "name" | "role" | "motivation" | "arc" | "voice" | "relationships" | "notes">>;
  locations: Array<Pick<LocationProfile, "name" | "role" | "narrativeStatus" | "description" | "notes">>;
  lore: Array<Pick<LoreEntryRecord, "title" | "category" | "status" | "description" | "notes">>;
  timeline: Array<Pick<TimelineEvent, "order" | "label" | "details" | "impact"> & { chapterNumber?: number }>;
  relationships: Array<
    Pick<NarrativeRelationship, "sourceType" | "targetType" | "relationType" | "status" | "intensity" | "notes"> & {
      source: string;
      target: string;
    }
  >;
}

function compactList(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(", ") || "none";
}

function normalizeValue(value: string): string {
  return value.trim().replace(/^["']+/, "").replace(/["']+$/, "");
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

function serializeProgression(entry: EntityProgression, bundle: ProjectBundle, chapterNumberById: Map<string, number>): string {
  return [
    `entityType=${entry.entityType}`,
    `label=${entry.label || entityLabel(bundle, entry.entityType, entry.entityId)}`,
    `chapter=${entry.chapterId ? chapterNumberById.get(entry.chapterId) ?? "story" : "story"}`,
    `start=${entry.startState || "none"}`,
    `delta=${entry.validatedDelta || entry.proposedDelta || "none"}`,
    `end=${entry.endState || "none"}`,
    `knowledge=${entry.knowledge || "none"}`,
    `belief=${entry.belief || "none"}`,
    `inventory=${entry.inventory || "none"}`,
    `narration=${entry.narrationStatus || "none"}`,
  ].join(" | ");
}

export function buildStoryWorldSuggestionInput(bundle: ProjectBundle): string {
  const chapters = bundle.chapters.slice().sort((a, b) => a.number - b.number);
  const chapterNumberById = new Map(chapters.map((chapter) => [chapter.id, chapter.number]));

  return [
    `Project title: ${bundle.project.title || "Untitled project"}`,
    `Genre: ${bundle.project.genre || "unspecified"}`,
    `Audience: ${bundle.project.audience || "unspecified"}`,
    `Tone: ${bundle.project.tone || "unspecified"}`,
    `Synopsis: ${bundle.project.synopsis || "none"}`,
    `Premise: ${bundle.bible.premise || "none"}`,
    `Themes: ${compactList(bundle.bible.themes)}`,
    `Stakes: ${bundle.bible.stakes || "none"}`,
    `World rules: ${bundle.bible.worldRules || "none"}`,
    bundle.characters.length > 0
      ? `Characters:\n${bundle.characters
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
      : "Characters: none",
    bundle.locations.length > 0
      ? `Locations:\n${bundle.locations
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
      : "Locations: none",
    bundle.loreEntries.length > 0
      ? `Lore:\n${bundle.loreEntries
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
      : "Lore: none",
    bundle.timeline.length > 0
      ? `Timeline events:\n${bundle.timeline
          .map((event) =>
            [
              `${event.order}. ${event.label || "Untitled event"}`,
              `chapter=${event.chapterId ? chapterNumberById.get(event.chapterId) ?? "linked" : "none"}`,
              `details=${event.details || "none"}`,
              `impact=${event.impact || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Timeline events: none",
    bundle.relationships.length > 0
      ? `Relationships:\n${bundle.relationships
          .map((relationship) =>
            [
              `${entityLabel(bundle, relationship.sourceType, relationship.sourceId)}`,
              `sourceType=${relationship.sourceType}`,
              `relationType=${relationship.relationType || "related to"}`,
              `target=${entityLabel(bundle, relationship.targetType, relationship.targetId)}`,
              `targetType=${relationship.targetType}`,
              `status=${relationship.status || "unspecified"}`,
              `intensity=${relationship.intensity}`,
              `notes=${relationship.notes || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Relationships: none",
    buildEntityHistorySnapshot(bundle, undefined, "Per-entity chapter history timeline"),
    bundle.entityProgression.length > 0
      ? `Entity progression:\n${bundle.entityProgression
          .slice(0, 16)
          .map((entry) => serializeProgression(entry, bundle, chapterNumberById))
          .join("\n")}`
      : "Entity progression: none",
    chapters.length > 0
      ? `Chapter summaries:\n${chapters
          .map((chapter) => `${chapter.number}. ${chapter.title || "Untitled chapter"}: ${chapter.summary || "No summary yet"}`)
          .join("\n")}`
      : "Chapter summaries: none",
  ].join("\n\n");
}

export function buildStoryWorldSuggestionContext(): string {
  return [
    "Suggest a structured story-world scaffold for the story bible.",
    "Use the project synopsis, story bible, chapters, story-wide registries, and per-entity chapter history timeline as canon.",
    "Prefer updating and completing the current structure rather than inventing a disconnected one.",
    "Story-wide registries define baseline canon. Per-entity chapter history explains when those entities or relationships enter, change, or become unavailable chapter by chapter.",
    "Return plain text using exactly this template. Keep the field labels exactly as written and write all values in the requested response language:",
    "Story World Scaffold",
    "[Characters]",
    "- name: ... | role: ... | motivation: ... | arc: ... | voice: ... | relationships: ... | notes: ...",
    "[Locations]",
    "- name: ... | role: ... | narrativeStatus: ... | description: ... | notes: ...",
    "[Lore]",
    "- title: ... | category: ... | status: ... | description: ... | notes: ...",
    "[Timeline]",
    "- order: 1 | chapter: 1 | label: ... | details: ... | impact: ...",
    "[Relationships]",
    "- sourceType: character | source: ... | targetType: location | target: ... | relationType: ... | status: ... | intensity: 3 | notes: ...",
    "Requirements:",
    "- Return at least one line in every section when the story context supports it.",
    "- Keep every item concrete and project-specific.",
    "- Use only these entity types: character, location, lore, timeline_event.",
    "- Relationship intensity must be an integer from 1 to 5.",
    "- If a chapter is unknown for a timeline item, omit the chapter field.",
    "- Do not add commentary before or after the template.",
  ].join("\n");
}

function extractSection(text: string, label: string, nextLabels: string[]): string {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nextPattern = nextLabels
    .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const pattern = new RegExp(`\\[${escapedLabel}\\]\\s*([\\s\\S]*?)(?=\\n\\[(?:${nextPattern})\\]|$)`, "i");
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? "";
}

function parseLine(line: string): Record<string, string> {
  return line
    .replace(/^\s*[-*]\s*/, "")
    .split("|")
    .map((part) => part.trim())
    .reduce<Record<string, string>>((accumulator, part) => {
      const separatorIndex = part.indexOf(":");
      if (separatorIndex === -1) {
        return accumulator;
      }
      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      if (key) {
        accumulator[key] = normalizeValue(value);
      }
      return accumulator;
    }, {});
}

function parseSectionLines(text: string): Array<Record<string, string>> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => parseLine(line))
    .filter((entry) => Object.keys(entry).length > 0);
}

function parseTrackedEntityType(value: string): TrackedEntityType | null {
  if (value === "character" || value === "location" || value === "lore" || value === "timeline_event") {
    return value;
  }
  return null;
}

export function parseStoryWorldSuggestion(text: string): StoryWorldSuggestion {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const sections: Array<{ key: StoryWorldSection; label: string }> = [
    { key: "characters", label: "Characters" },
    { key: "locations", label: "Locations" },
    { key: "lore", label: "Lore" },
    { key: "timeline", label: "Timeline" },
    { key: "relationships", label: "Relationships" },
  ];

  const bodyBySection = Object.fromEntries(
    sections.map((section, index) => [
      section.key,
      extractSection(
        normalized,
        section.label,
        sections.slice(index + 1).map((item) => item.label)
      ),
    ])
  ) as Record<StoryWorldSection, string>;

  const characters = parseSectionLines(bodyBySection.characters)
    .map((entry) => ({
      name: entry.name ?? "",
      role: entry.role ?? "",
      motivation: entry.motivation ?? "",
      arc: entry.arc ?? "",
      voice: entry.voice ?? "",
      relationships: entry.relationships ?? "",
      notes: entry.notes ?? "",
    }))
    .filter((entry) => entry.name);

  const locations = parseSectionLines(bodyBySection.locations)
    .map((entry) => ({
      name: entry.name ?? "",
      role: entry.role ?? "",
      narrativeStatus: entry.narrativeStatus ?? "",
      description: entry.description ?? "",
      notes: entry.notes ?? "",
    }))
    .filter((entry) => entry.name);

  const lore = parseSectionLines(bodyBySection.lore)
    .map((entry) => ({
      title: entry.title ?? "",
      category: entry.category ?? "",
      status: entry.status ?? "",
      description: entry.description ?? "",
      notes: entry.notes ?? "",
    }))
    .filter((entry) => entry.title);

  const timeline = parseSectionLines(bodyBySection.timeline)
    .map((entry) => ({
      order: Number(entry.order) || 0,
      chapterNumber: Number(entry.chapter) || undefined,
      label: entry.label ?? "",
      details: entry.details ?? "",
      impact: entry.impact ?? "",
    }))
    .filter((entry) => entry.label);

  const relationships = parseSectionLines(bodyBySection.relationships)
    .map((entry) => {
      const sourceType = parseTrackedEntityType(entry.sourceType ?? "");
      const targetType = parseTrackedEntityType(entry.targetType ?? "");
      return {
        sourceType,
        source: entry.source ?? "",
        targetType,
        target: entry.target ?? "",
        relationType: entry.relationType ?? "",
        status: entry.status ?? "",
        intensity: Math.min(5, Math.max(1, Number(entry.intensity) || 3)),
        notes: entry.notes ?? "",
      };
    })
    .filter((entry) => entry.sourceType && entry.targetType && entry.source && entry.target)
    .map((entry) => ({
      sourceType: entry.sourceType as TrackedEntityType,
      source: entry.source,
      targetType: entry.targetType as TrackedEntityType,
      target: entry.target,
      relationType: entry.relationType,
      status: entry.status,
      intensity: entry.intensity,
      notes: entry.notes,
    }));

  return {
    characters,
    locations,
    lore,
    timeline,
    relationships,
  };
}
