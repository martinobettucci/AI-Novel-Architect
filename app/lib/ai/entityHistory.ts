import type {
  EntityHistoryEntry,
  NarrativeRelationship,
  ProjectBundle,
  TrackedEntityType,
} from "@/app/domain/models";

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

export function relationshipLabel(
  bundle: ProjectBundle,
  relationship: Pick<
    NarrativeRelationship,
    "sourceType" | "sourceId" | "targetType" | "targetId" | "relationType"
  >
): string {
  return [
    entityLabel(bundle, relationship.sourceType, relationship.sourceId),
    "->",
    relationship.relationType || "related to",
    "->",
    entityLabel(bundle, relationship.targetType, relationship.targetId),
  ].join(" ");
}

export function historyEntryLabel(
  bundle: ProjectBundle,
  entry: Pick<EntityHistoryEntry, "entityType" | "entityId" | "label">
): string {
  if (entry.entityType === "relationship") {
    const relationship = bundle.relationships.find((item) => item.id === entry.entityId);
    return relationship ? relationshipLabel(bundle, relationship) : entry.label || "Untitled relationship";
  }

  return entry.label || entityLabel(bundle, entry.entityType, entry.entityId);
}

export function filterEntityHistory(bundle: ProjectBundle, chapterNumber?: number): EntityHistoryEntry[] {
  const chapterNumberById = new Map(bundle.chapters.map((chapter) => [chapter.id, chapter.number]));

  return bundle.entityHistory
    .filter((entry) => {
      if (chapterNumber == null) return true;
      const number = chapterNumberById.get(entry.chapterId);
      return number != null && number <= chapterNumber;
    })
    .slice()
    .sort((a, b) => {
      const chapterA = chapterNumberById.get(a.chapterId) ?? Number.MAX_SAFE_INTEGER;
      const chapterB = chapterNumberById.get(b.chapterId) ?? Number.MAX_SAFE_INTEGER;
      if (chapterA !== chapterB) return chapterA - chapterB;
      return historyEntryLabel(bundle, a).localeCompare(historyEntryLabel(bundle, b));
    });
}

export function buildEntityHistorySnapshot(
  bundle: ProjectBundle,
  chapterNumber?: number,
  heading = "Entity chapter history"
): string {
  const chapterNumberById = new Map(bundle.chapters.map((chapter) => [chapter.id, chapter.number]));
  const entries = filterEntityHistory(bundle, chapterNumber);

  if (entries.length === 0) {
    return `${heading}${chapterNumber == null ? " across full book" : " through current chapter"}: none`;
  }

  return `${heading}${chapterNumber == null ? " across full book" : " through current chapter"}:\n${entries
    .map((entry) =>
      [
        `chapter=${chapterNumberById.get(entry.chapterId) ?? "?"}`,
        `entityType=${entry.entityType}`,
        `label=${historyEntryLabel(bundle, entry)}`,
        `note=${entry.note || "none"}`,
      ].join(" | ")
    )
    .join("\n")}`;
}
