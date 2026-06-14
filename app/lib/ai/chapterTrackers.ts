import type {
  ChapterTrackerReport,
  ChapterTrackerType,
  EntityHistoryEntry,
  HistoryEntityType,
  ProjectBundle,
  TrackedEntityType,
} from "@/app/domain/models";
import { buildEntityHistorySnapshot, relationshipLabel } from "@/app/lib/ai/entityHistory";
import {
  asRecord,
  asRecordArray,
  asString,
  createJsonResponseFormat,
  parseStructuredJson,
} from "@/app/lib/ai/structuredOutput";

const TRACKER_TYPES: ChapterTrackerType[] = [
  "characters",
  "locations",
  "lore",
  "timelines",
  "relationships",
  "progressions",
];

const STRING_FIELD = { type: "string", maxLength: 420 };

export const CHAPTER_TRACKERS_RESPONSE_FORMAT = createJsonResponseFormat(
  "chapter_trackers",
  {
    type: "object",
    additionalProperties: false,
    properties: {
      reports: {
        type: "array",
        minItems: 6,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            trackerType: {
              type: "string",
              enum: TRACKER_TYPES,
            },
            previousState: STRING_FIELD,
            chapterEvolution: STRING_FIELD,
            finalState: STRING_FIELD,
          },
          required: [
            "trackerType",
            "previousState",
            "chapterEvolution",
            "finalState",
          ],
        },
      },
      entityHistory: {
        type: "array",
        maxItems: 24,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            entityType: {
              type: "string",
              enum: ["character", "location", "lore", "timeline_event", "relationship"],
            },
            entity: STRING_FIELD,
            label: STRING_FIELD,
            sourceType: STRING_FIELD,
            source: STRING_FIELD,
            targetType: STRING_FIELD,
            target: STRING_FIELD,
            relationType: STRING_FIELD,
            note: STRING_FIELD,
          },
          required: [
            "entityType",
            "entity",
            "label",
            "sourceType",
            "source",
            "targetType",
            "target",
            "relationType",
            "note",
          ],
        },
      },
    },
    required: ["reports", "entityHistory"],
  }
);

function compactList(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(", ") || "none";
}

function normalizeValue(value: string): string {
  return value.trim().replace(/^["']+/, "").replace(/["']+$/, "");
}

function normalizeLookupKey(value: string): string {
  return normalizeValue(value).toLocaleLowerCase();
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

function titleCaseTrackerType(type: ChapterTrackerType): string {
  switch (type) {
    case "characters":
      return "Characters";
    case "locations":
      return "Locations";
    case "lore":
      return "Lore";
    case "timelines":
      return "Timelines";
    case "relationships":
      return "Relationships";
    case "progressions":
      return "Progressions";
    default:
      return type;
  }
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

function parseHistoryEntityType(value: string): HistoryEntityType | null {
  if (
    value === "character" ||
    value === "location" ||
    value === "lore" ||
    value === "timeline_event" ||
    value === "relationship"
  ) {
    return value;
  }
  return null;
}

function resolveEntityId(
  bundle: ProjectBundle,
  entityType: HistoryEntityType,
  entry: Record<string, string>
): string {
  if (entityType === "relationship") {
    const sourceType = parseHistoryEntityType(entry.sourceType ?? "");
    const targetType = parseHistoryEntityType(entry.targetType ?? "");
    const relationType = normalizeLookupKey(entry.relationType ?? "");
    const sourceLabel = normalizeLookupKey(entry.source ?? "");
    const targetLabel = normalizeLookupKey(entry.target ?? "");
    const explicitLabel = normalizeLookupKey(entry.label ?? entry.entity ?? "");

    const relationship = bundle.relationships.find((item) => {
      const sourceName = normalizeLookupKey(entityLabel(bundle, item.sourceType, item.sourceId));
      const targetName = normalizeLookupKey(entityLabel(bundle, item.targetType, item.targetId));
      const relationName = normalizeLookupKey(item.relationType || "");
      const fullLabel = normalizeLookupKey(relationshipLabel(bundle, item));

      const structuredMatch =
        sourceType === item.sourceType &&
        targetType === item.targetType &&
        sourceLabel === sourceName &&
        targetLabel === targetName &&
        relationType === relationName;

      return structuredMatch || (explicitLabel && explicitLabel === fullLabel);
    });

    return relationship?.id ?? "";
  }

  const candidateLabel = normalizeLookupKey(entry.entity ?? entry.label ?? "");
  if (!candidateLabel) return "";

  const candidates =
    entityType === "character"
      ? bundle.characters.map((item) => ({ id: item.id, label: item.name }))
      : entityType === "location"
        ? bundle.locations.map((item) => ({ id: item.id, label: item.name }))
        : entityType === "lore"
          ? bundle.loreEntries.map((item) => ({ id: item.id, label: item.title }))
          : bundle.timeline.map((item) => ({ id: item.id, label: item.label }));

  return (
    candidates.find((item) => normalizeLookupKey(item.label) === candidateLabel)?.id ?? ""
  );
}

export function listChapterTrackerTypes(): ChapterTrackerType[] {
  return [...TRACKER_TYPES];
}

export function buildChapterTrackerComputationInput(
  bundle: ProjectBundle,
  chapterId: string
): string {
  const chapter = bundle.chapters.find((item) => item.id === chapterId);
  if (!chapter) return "";

  const chapters = bundle.chapters.slice().sort((a, b) => a.number - b.number);
  const chaptersToCurrent = chapters.filter((item) => item.number <= chapter.number);
  const chaptersBeforeCurrent = chapters.filter((item) => item.number < chapter.number);
  const chapterNumberById = new Map(chaptersToCurrent.map((item) => [item.id, item.number]));

  const currentScenes = bundle.scenes
    .filter((scene) => scene.chapterId === chapter.id)
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

  const priorRelationshipTrail = bundle.relationships
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
    .join("\n");

  const progressionTrail = bundle.entityProgression
    .filter((entry) => {
      if (!entry.chapterId) return true;
      const chapterNumber = chapterNumberById.get(entry.chapterId);
      return chapterNumber != null && chapterNumber <= chapter.number;
    })
    .map((entry) => {
      const chapterNumber = entry.chapterId ? chapterNumberById.get(entry.chapterId) : undefined;
      return [
        `${entry.entityType}: ${entry.label || entityLabel(bundle, entry.entityType, entry.entityId)}`,
        `chapter=${chapterNumber ?? "story"}`,
        `start=${entry.startState || "none"}`,
        `delta=${entry.validatedDelta || entry.proposedDelta || "none"}`,
        `end=${entry.endState || "none"}`,
        `knowledge=${entry.knowledge || "none"}`,
        `belief=${entry.belief || "none"}`,
        `inventory=${entry.inventory || "none"}`,
        `narration=${entry.narrationStatus || "none"}`,
        `confidence=${entry.confidence}`,
      ].join(" | ");
    })
    .join("\n");

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
    `Story Bible premise: ${bundle.bible.premise || "none"}`,
    `Story Bible themes: ${compactList(bundle.bible.themes)}`,
    `Story Bible stakes: ${bundle.bible.stakes || "none"}`,
    `Story Bible world rules: ${bundle.bible.worldRules || "none"}`,
    bundle.characters.length > 0
      ? `Tracked characters:\n${bundle.characters
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
      : "Tracked characters: none",
    bundle.locations.length > 0
      ? `Tracked locations:\n${bundle.locations
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
      : "Tracked locations: none",
    bundle.loreEntries.length > 0
      ? `Tracked lore:\n${bundle.loreEntries
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
      : "Tracked lore: none",
    bundle.timeline.filter((event) => {
        if (!event.chapterId) return true;
        const chapterNumber = chapterNumberById.get(event.chapterId);
        return chapterNumber != null && chapterNumber <= chapter.number;
      }).length > 0
      ? `Tracked timelines:\n${bundle.timeline
          .filter((event) => {
            if (!event.chapterId) return true;
            const chapterNumber = chapterNumberById.get(event.chapterId);
            return chapterNumber != null && chapterNumber <= chapter.number;
          })
          .map((event) =>
            [
              event.label || "Untitled event",
              `chapter=${event.chapterId ? chapterNumberById.get(event.chapterId) ?? "linked" : "none"}`,
              `details=${event.details || "none"}`,
              `impact=${event.impact || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Tracked timelines: none",
    chaptersBeforeCurrent.length > 0
      ? `Previous chapters:\n${chaptersBeforeCurrent
          .map((item) =>
            [
              `${item.number}. ${item.title.trim() || "Untitled chapter"}`,
              `summary=${item.summary || "none"}`,
              `hook=${item.hook || "none"}`,
              `story so far=${item.storySoFar || "none"}`,
              `content=${item.content || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Previous chapters: none",
    currentScenes.length > 0
      ? `Current chapter scenes:\n${currentScenes.join("\n")}`
      : "Current chapter scenes: none",
    priorRelationshipTrail ? `Relationship tracker through current chapter:\n${priorRelationshipTrail}` : "Relationship tracker through current chapter: none",
    progressionTrail ? `Entity progression through current chapter:\n${progressionTrail}` : "Entity progression through current chapter: none",
    buildEntityHistorySnapshot(bundle, chapter.number, "Per-entity chapter history timeline"),
  ].join("\n\n");
}

export function buildChapterTrackerComputationContext(): string {
  return [
    "Compute per-chapter drafting trackers for the selected chapter.",
    "Read the prior chapters as the source of truth for the story state before this chapter starts.",
    "Then infer how the selected chapter draft evolves the story and summarize the final state at the end of the selected chapter.",
    "When a JSON schema is provided, return JSON matching it exactly. Otherwise use the plain-text template below.",
    "For the plain-text fallback, keep the tracker labels exactly as written and write all values in the requested response language:",
    "Chapter Trackers",
    "[Characters]",
    "Previous state: ...",
    "Chapter evolution: ...",
    "End-of-chapter state: ...",
    "",
    "[Locations]",
    "Previous state: ...",
    "Chapter evolution: ...",
    "End-of-chapter state: ...",
    "",
    "[Lore]",
    "Previous state: ...",
    "Chapter evolution: ...",
    "End-of-chapter state: ...",
    "",
    "[Timelines]",
    "Previous state: ...",
    "Chapter evolution: ...",
    "End-of-chapter state: ...",
    "",
    "[Relationships]",
    "Previous state: ...",
    "Chapter evolution: ...",
    "End-of-chapter state: ...",
    "",
    "[Progressions]",
    "Previous state: ...",
    "Chapter evolution: ...",
    "End-of-chapter state: ...",
    "",
    "[Entity History]",
    "- entityType: character | entity: Mira | note: Mira proves the atlas works publicly and ends the chapter exposed.",
    "- entityType: relationship | sourceType: character | source: Mira | targetType: character | target: Jonas | relationType: uneasy alliance | note: Shared risk hardens their brittle alliance.",
    "",
    "Requirements:",
    "- Fill all six tracker sections.",
    "- Ground Previous state in chapters before the selected chapter.",
    "- Ground Chapter evolution in the selected chapter only.",
    "- End-of-chapter state must describe the resulting canon state after this chapter ends.",
    "- Add entity history lines for every character, location, lore item, timeline event, or relationship that is introduced, materially changed, constrained, removed, or newly activated in the selected chapter.",
    "- Story-wide registries remain global. Entity History is the parallel per-entity timeline layer attached to chapters.",
    "- Use only these entity types in Entity History: character, location, lore, timeline_event, relationship.",
    "- Every Entity History line must contain a chapter-specific note.",
    "- Keep each field concise but specific.",
    "- Do not mention chapters after the selected chapter.",
    "- Do not add commentary before or after the template.",
  ].join("\n");
}

export function parseEntityHistorySuggestion(
  text: string,
  bundle: ProjectBundle
): Array<Pick<EntityHistoryEntry, "entityType" | "entityId" | "label" | "note">> {
  const json = asRecord(parseStructuredJson(text));
  const jsonEntries = asRecordArray(json?.entityHistory)
    .map((item) => {
      const entry = Object.fromEntries(
        Object.entries(item).map(([key, value]) => [key, asString(value)])
      );
      const entityType = parseHistoryEntityType(entry.entityType ?? "");
      if (!entityType) return null;

      const label =
        entityType === "relationship"
          ? entry.label ||
            [
              entry.source || "Unknown source",
              "->",
              entry.relationType || "related to",
              "->",
              entry.target || "Unknown target",
            ].join(" ")
          : entry.entity || entry.label || "";

      return {
        entityType,
        entityId: resolveEntityId(bundle, entityType, entry),
        label,
        note: entry.note ?? "",
      };
    })
    .filter(
      (
        entry
      ): entry is Pick<EntityHistoryEntry, "entityType" | "entityId" | "label" | "note"> =>
        entry != null && Boolean(entry.label || entry.note)
    );

  if (jsonEntries.length > 0) {
    return jsonEntries;
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  const sectionMatch = normalized.match(
    /\[Entity History\]\s*([\s\S]*?)(?=\nRequirements:|$)/i
  );
  const sectionBody = sectionMatch?.[1]?.trim() ?? "";

  if (!sectionBody) {
    return [];
  }

  return sectionBody
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => parseLine(line))
    .map((entry) => {
      const entityType = parseHistoryEntityType(entry.entityType ?? "");
      if (!entityType) return null;

      const label =
        entityType === "relationship"
          ? entry.label ||
            [
              entry.source || "Unknown source",
              "->",
              entry.relationType || "related to",
              "->",
              entry.target || "Unknown target",
            ].join(" ")
          : entry.entity || entry.label || "";

      return {
        entityType,
        entityId: resolveEntityId(bundle, entityType, entry),
        label,
        note: entry.note ?? "",
      };
    })
    .filter(
      (
        entry
      ): entry is Pick<EntityHistoryEntry, "entityType" | "entityId" | "label" | "note"> =>
        entry != null && Boolean(entry.label || entry.note)
    );
}

export function parseChapterTrackerComputation(
  text: string,
  bundle: ProjectBundle
): {
  reports: Array<
    Pick<ChapterTrackerReport, "trackerType" | "previousState" | "chapterEvolution" | "finalState">
  >;
  entityHistory: Array<Pick<EntityHistoryEntry, "entityType" | "entityId" | "label" | "note">>;
} {
  return {
    reports: parseChapterTrackerSuggestion(text),
    entityHistory: parseEntityHistorySuggestion(text, bundle),
  };
}

export function parseChapterTrackerSuggestion(
  text: string
): Array<Pick<ChapterTrackerReport, "trackerType" | "previousState" | "chapterEvolution" | "finalState">> {
  const json = asRecord(parseStructuredJson(text));
  const jsonReports = asRecordArray(json?.reports)
    .map((entry) => {
      const trackerType = asString(entry.trackerType) as ChapterTrackerType;
      if (!TRACKER_TYPES.includes(trackerType)) return null;

      return {
        trackerType,
        previousState: asString(entry.previousState),
        chapterEvolution: asString(entry.chapterEvolution),
        finalState: asString(entry.finalState),
      };
    })
    .filter(
      (
        report
      ): report is Pick<
        ChapterTrackerReport,
        "trackerType" | "previousState" | "chapterEvolution" | "finalState"
      > =>
        report != null &&
        Boolean(report.previousState || report.chapterEvolution || report.finalState)
    );

  if (jsonReports.length > 0) {
    return jsonReports;
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  const reports: Array<
    Pick<ChapterTrackerReport, "trackerType" | "previousState" | "chapterEvolution" | "finalState">
  > = [];

  TRACKER_TYPES.forEach((trackerType, index) => {
    const label = titleCaseTrackerType(trackerType);
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nextLabels = TRACKER_TYPES.slice(index + 1)
      .map((value) => titleCaseTrackerType(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const nextSectionLookahead = nextLabels
      ? `\\n\\[(?:${nextLabels}|Entity History)\\]|\\nRequirements:|$`
      : `\\n\\[(?:Entity History)\\]|\\nRequirements:|$`;
    const sectionPattern = new RegExp(
      `\\[${escapedLabel}\\]\\s*([\\s\\S]*?)(?=${nextSectionLookahead}|$)`,
      "i"
    );
    const sectionMatch = normalized.match(sectionPattern);
    if (!sectionMatch) {
      return;
    }

    const sectionBody = sectionMatch[1].trim();
    const previousMatch = sectionBody.match(
      /Previous state:\s*([\s\S]*?)(?=\nChapter evolution:|\nEnd-of-chapter state:|$)/i
    );
    const evolutionMatch = sectionBody.match(
      /Chapter evolution:\s*([\s\S]*?)(?=\nEnd-of-chapter state:|$)/i
    );
    const finalMatch = sectionBody.match(/End-of-chapter state:\s*([\s\S]*)$/i);

    reports.push({
      trackerType,
      previousState: normalizeValue(previousMatch?.[1] ?? ""),
      chapterEvolution: normalizeValue(evolutionMatch?.[1] ?? ""),
      finalState: normalizeValue(finalMatch?.[1] ?? ""),
    });
  });

  return reports.filter(
    (report) => report.previousState || report.chapterEvolution || report.finalState
  );
}
