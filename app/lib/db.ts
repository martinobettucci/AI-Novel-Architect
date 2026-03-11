import Dexie, { type EntityTable } from "dexie";
import type {
  AiAction,
  Annotation,
  Chapter,
  ChapterTrackerReport,
  CharacterProfile,
  ChecklistItem,
  EntityHistoryEntry,
  EntityProgression,
  LocationProfile,
  LoreEntryRecord,
  Manuscript,
  NarrativeRelationship,
  Project,
  RevisionIssue,
  Scene,
  SettingsProfile,
  Snapshot,
  StoryBible,
  TimelineEvent,
  WritingGoal,
} from "@/app/domain/models";

const DB_NAME = "ai-novel-architect-v3";

export class NovelArchitectDb extends Dexie {
  projects!: EntityTable<Project, "id">;
  manuscripts!: EntityTable<Manuscript, "projectId">;
  chapters!: EntityTable<Chapter, "id">;
  scenes!: EntityTable<Scene, "id">;
  bibles!: EntityTable<StoryBible, "id">;
  characters!: EntityTable<CharacterProfile, "id">;
  locations!: EntityTable<LocationProfile, "id">;
  loreEntries!: EntityTable<LoreEntryRecord, "id">;
  timelineEvents!: EntityTable<TimelineEvent, "id">;
  narrativeRelationships!: EntityTable<NarrativeRelationship, "id">;
  entityProgression!: EntityTable<EntityProgression, "id">;
  entityHistory!: EntityTable<EntityHistoryEntry, "id">;
  revisionIssues!: EntityTable<RevisionIssue, "id">;
  checklistItems!: EntityTable<ChecklistItem, "id">;
  annotations!: EntityTable<Annotation, "id">;
  writingGoals!: EntityTable<WritingGoal, "id">;
  snapshots!: EntityTable<Snapshot, "id">;
  aiActions!: EntityTable<AiAction, "id">;
  chapterTrackerReports!: EntityTable<ChapterTrackerReport, "id">;
  settingsProfiles!: EntityTable<SettingsProfile, "id">;

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      projects: "id, status, updatedAt",
      manuscripts: "projectId, updatedAt",
      chapters: "id, projectId, number, updatedAt",
      scenes: "id, projectId, chapterId, order, updatedAt",
      bibles: "id, projectId, updatedAt",
      characters: "id, projectId, updatedAt",
      locations: "id, projectId, updatedAt",
      loreEntries: "id, projectId, updatedAt",
      timelineEvents: "id, projectId, order, updatedAt",
      narrativeRelationships: "id, projectId, sourceId, targetId, updatedAt",
      entityProgression: "id, projectId, chapterId, sceneId, entityId, updatedAt",
      revisionIssues: "id, projectId, chapterId, status, updatedAt",
      checklistItems: "id, projectId, scope, done, updatedAt",
      annotations: "id, projectId, chapterId, updatedAt",
      writingGoals: "id, projectId, updatedAt",
      snapshots: "id, projectId, chapterId, createdAt",
      aiActions: "id, projectId, chapterId, status, createdAt",
      settingsProfiles: "id, scope, projectId, featureKey, updatedAt",
    });

    this.version(2).stores({
      projects: "id, status, updatedAt",
      manuscripts: "projectId, updatedAt",
      chapters: "id, projectId, number, updatedAt",
      scenes: "id, projectId, chapterId, order, updatedAt",
      bibles: "id, projectId, updatedAt",
      characters: "id, projectId, updatedAt",
      locations: "id, projectId, updatedAt",
      loreEntries: "id, projectId, updatedAt",
      timelineEvents: "id, projectId, order, updatedAt",
      narrativeRelationships: "id, projectId, sourceId, targetId, updatedAt",
      entityProgression: "id, projectId, chapterId, sceneId, entityId, updatedAt",
      revisionIssues: "id, projectId, chapterId, status, updatedAt",
      checklistItems: "id, projectId, scope, done, updatedAt",
      annotations: "id, projectId, chapterId, updatedAt",
      writingGoals: "id, projectId, updatedAt",
      snapshots: "id, projectId, chapterId, createdAt",
      aiActions: "id, projectId, chapterId, status, createdAt",
      chapterTrackerReports: "id, projectId, chapterId, trackerType, updatedAt",
      settingsProfiles: "id, scope, projectId, featureKey, updatedAt",
    });

    this.version(3).stores({
      projects: "id, status, updatedAt",
      manuscripts: "projectId, updatedAt",
      chapters: "id, projectId, number, updatedAt",
      scenes: "id, projectId, chapterId, order, updatedAt",
      bibles: "id, projectId, updatedAt",
      characters: "id, projectId, updatedAt",
      locations: "id, projectId, updatedAt",
      loreEntries: "id, projectId, updatedAt",
      timelineEvents: "id, projectId, order, updatedAt",
      narrativeRelationships: "id, projectId, sourceId, targetId, updatedAt",
      entityProgression: "id, projectId, chapterId, sceneId, entityId, updatedAt",
      entityHistory: "id, projectId, chapterId, entityType, entityId, updatedAt",
      revisionIssues: "id, projectId, chapterId, status, updatedAt",
      checklistItems: "id, projectId, scope, done, updatedAt",
      annotations: "id, projectId, chapterId, updatedAt",
      writingGoals: "id, projectId, updatedAt",
      snapshots: "id, projectId, chapterId, createdAt",
      aiActions: "id, projectId, chapterId, status, createdAt",
      chapterTrackerReports: "id, projectId, chapterId, trackerType, updatedAt",
      settingsProfiles: "id, scope, projectId, featureKey, updatedAt",
    });
  }
}

let dbInstance: NovelArchitectDb | null = null;

export function getDb(): NovelArchitectDb {
  if (!dbInstance) {
    dbInstance = new NovelArchitectDb();
  }
  return dbInstance;
}

export async function resetDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  await Dexie.delete(DB_NAME);
}
