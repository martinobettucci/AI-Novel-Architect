import JSZip from "jszip";
import {
  createEntityProgression,
  createEntityHistoryEntry,
  createChapter,
  createDefaultChecklist,
  createId,
  createLocationProfile,
  createLoreEntry,
  createManuscript,
  createNarrativeRelationship,
  createProject,
  createStoryBible,
  createWritingGoal,
  createWritingSession,
  dayKey,
  DEFAULT_SETTINGS,
} from "@/app/domain/defaults";
import type {
  AiAction,
  AiActionStatus,
  AiActionType,
  Annotation,
  AppSettings,
  CanonDelta,
  Chapter,
  ChapterTrackerReport,
  CharacterProfile,
  ChapterTrackerType,
  ChecklistItem,
  ContinuityConflict,
  DeltaLayer,
  DeltaStatus,
  EntityHistoryEntry,
  EntityProgression,
  LocationProfile,
  LoreEntryRecord,
  Locale,
  Manuscript,
  MarketingArtifacts,
  NarrativeRelationship,
  Project,
  ProjectBundle,
  PublishingArtifacts,
  ResolvedSettings,
  RevisionIssue,
  RevisionStatus,
  Scene,
  SettingsProfile,
  Snapshot,
  StoryBible,
  TimelineEvent,
  TrackedEntityType,
  VerifierVerdict,
  WritingGoal,
  WritingSession,
} from "@/app/domain/models";
import { getDb, type NovelArchitectDb } from "@/app/lib/db";
import { sanitizeTextForPreview, simpleChecksum } from "@/app/lib/hash";

const GLOBAL_SETTINGS_STORAGE_KEY = "ai-novel-architect:global-settings";

function now(): string {
  return new Date().toISOString();
}

function plainText(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(input: string): number {
  const trimmed = plainText(input);
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function emptyProjectBundle(project: Project): ProjectBundle {
  return {
    project,
    manuscript: createManuscript(project.id),
    chapters: [],
    scenes: [],
    bible: createStoryBible(project.id),
    characters: [],
    locations: [],
    loreEntries: [],
    timeline: [],
    relationships: [],
    entityProgression: [],
    entityHistory: [],
    revisionIssues: [],
    checklist: createDefaultChecklist(project.id),
    annotations: [],
    goal: createWritingGoal(project.id),
    snapshots: [],
    aiActions: [],
    chapterTrackerReports: [],
    canonDeltas: [],
    writingSessions: [],
  };
}

function clone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

export async function listProjects(includeArchived = false): Promise<Project[]> {
  const db = getDb();
  const projects = includeArchived
    ? await db.projects.toArray()
    : await db.projects.where("status").equals("active").toArray();

  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const db = getDb();
  const project = await db.projects.get(projectId);
  return project ?? null;
}

export async function getProjectBundle(projectId: string): Promise<ProjectBundle | null> {
  const db = getDb();
  const project = await db.projects.get(projectId);
  if (!project) return null;

  const manuscript = (await db.manuscripts.get(projectId)) ?? createManuscript(projectId);
  const [
    chapters,
    scenes,
    bible,
    characters,
    locations,
    loreEntries,
    timeline,
    relationships,
    entityProgression,
    entityHistory,
    revisionIssues,
    checklist,
    annotations,
    goal,
    snapshots,
    aiActions,
    chapterTrackerReports,
    canonDeltas,
    writingSessions,
  ] =
    await Promise.all([
      db.chapters.where("projectId").equals(projectId).sortBy("number"),
      db.scenes.where("projectId").equals(projectId).sortBy("order"),
      db.bibles.where("projectId").equals(projectId).first(),
      db.characters.where("projectId").equals(projectId).toArray(),
      db.locations.where("projectId").equals(projectId).toArray(),
      db.loreEntries.where("projectId").equals(projectId).toArray(),
      db.timelineEvents.where("projectId").equals(projectId).sortBy("order"),
      db.narrativeRelationships.where("projectId").equals(projectId).toArray(),
      db.entityProgression.where("projectId").equals(projectId).toArray(),
      db.entityHistory.where("projectId").equals(projectId).toArray(),
      db.revisionIssues.where("projectId").equals(projectId).toArray(),
      db.checklistItems.where("projectId").equals(projectId).toArray(),
      db.annotations.where("projectId").equals(projectId).toArray(),
      db.writingGoals.where("projectId").equals(projectId).first(),
      db.snapshots.where("projectId").equals(projectId).reverse().sortBy("createdAt"),
      db.aiActions.where("projectId").equals(projectId).reverse().sortBy("createdAt"),
      db.chapterTrackerReports.where("projectId").equals(projectId).toArray(),
      db.canonDeltas.where("projectId").equals(projectId).reverse().sortBy("createdAt"),
      db.writingSessions.where("projectId").equals(projectId).toArray(),
    ]);

  return {
    project,
    manuscript,
    chapters,
    scenes,
    bible: bible ?? createStoryBible(projectId),
    characters,
    locations,
    loreEntries,
    timeline,
    relationships,
    entityProgression,
    entityHistory,
    revisionIssues,
    checklist,
    annotations,
    goal: goal ?? createWritingGoal(projectId),
    snapshots,
    aiActions,
    chapterTrackerReports,
    canonDeltas,
    writingSessions,
  };
}

export async function createProjectFromInput(input: {
  title: string;
  genre: string;
  audience: string;
  tone: string;
  targetWordCount: number;
  language: Locale;
  synopsis: string;
  mode: "idea" | "outline" | "template" | "import";
  chapterCount?: number;
  outlineText?: string;
}): Promise<ProjectBundle> {
  const db = getDb();
  const project = createProject({
    title: input.title,
    genre: input.genre,
    audience: input.audience,
    tone: input.tone,
    targetWordCount: input.targetWordCount,
    language: input.language,
    synopsis: input.synopsis,
  });

  const outlineLines =
    input.mode === "outline" && input.outlineText?.trim()
      ? input.outlineText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : [];

  const chapterCount = Math.max(0, input.chapterCount ?? outlineLines.length);
  const createdAt = now();

  const chapters: Chapter[] = Array.from({ length: chapterCount }, (_, index) =>
    createChapter(project.id, index + 1)
  );

  if (outlineLines.length > 0) {
    outlineLines.slice(0, chapterCount).forEach((line, index) => {
      if (chapters[index]) {
        chapters[index] = {
          ...chapters[index],
          title: line.replace(/^[-*#\d.\s]+/, "").slice(0, 80) || chapters[index].title,
          summary: line,
          updatedAt: createdAt,
        };
      }
    });
  }

  const manuscript = createManuscript(project.id);
  const bible = createStoryBible(project.id);
  const goal = createWritingGoal(project.id);
  const checklist = createDefaultChecklist(project.id);

  await db.transaction(
    "rw",
    [db.projects, db.manuscripts, db.chapters, db.bibles, db.writingGoals, db.checklistItems],
    async () => {
      await db.projects.add(project);
      await db.manuscripts.put(manuscript);
      if (chapters.length > 0) {
        await db.chapters.bulkAdd(chapters);
      }
      await db.bibles.put(bible);
      await db.writingGoals.put(goal);
      await db.checklistItems.bulkAdd(checklist);
    }
  );

  return {
    ...emptyProjectBundle(project),
    manuscript,
    chapters,
    bible,
    goal,
    checklist,
  };
}

export async function updateProjectMeta(projectId: string, patch: Partial<Project>): Promise<Project | null> {
  const db = getDb();
  const current = await db.projects.get(projectId);
  if (!current) return null;

  const next: Project = {
    ...current,
    ...patch,
    id: current.id,
    updatedAt: now(),
  };

  await db.projects.put(next);
  return next;
}

export async function duplicateProject(projectId: string): Promise<ProjectBundle | null> {
  const source = await getProjectBundle(projectId);
  if (!source) return null;

  const duplicated = clone(source);
  const newProjectId = createId("project");
  const timestamp = now();

  duplicated.project = {
    ...duplicated.project,
    id: newProjectId,
    title: `${duplicated.project.title} (Copy)`,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "active",
  };

  duplicated.manuscript = {
    ...duplicated.manuscript,
    projectId: newProjectId,
    updatedAt: timestamp,
  };

  duplicated.chapters = duplicated.chapters.map((chapter) => ({
    ...chapter,
    id: createId("chapter"),
    projectId: newProjectId,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const chapterMap = new Map(
    source.chapters.map((original, index) => [original.id, duplicated.chapters[index].id])
  );

  duplicated.scenes = duplicated.scenes.map((scene) => ({
    ...scene,
    id: createId("scene"),
    projectId: newProjectId,
    chapterId: chapterMap.get(scene.chapterId) ?? scene.chapterId,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  duplicated.bible = {
    ...duplicated.bible,
    id: createId("bible"),
    projectId: newProjectId,
    updatedAt: timestamp,
  };

  duplicated.characters = duplicated.characters.map((character) => ({
    ...character,
    id: createId("char"),
    projectId: newProjectId,
    updatedAt: timestamp,
  }));

  duplicated.locations = duplicated.locations.map((location) => ({
    ...location,
    id: createId("location"),
    projectId: newProjectId,
    updatedAt: timestamp,
  }));

  duplicated.loreEntries = duplicated.loreEntries.map((entry) => ({
    ...entry,
    id: createId("lore"),
    projectId: newProjectId,
    updatedAt: timestamp,
  }));

  const entityMap = new Map<string, string>();
  source.characters.forEach((original, index) => {
    entityMap.set(`character:${original.id}`, duplicated.characters[index].id);
  });
  source.locations.forEach((original, index) => {
    entityMap.set(`location:${original.id}`, duplicated.locations[index].id);
  });
  source.loreEntries.forEach((original, index) => {
    entityMap.set(`lore:${original.id}`, duplicated.loreEntries[index].id);
  });

  duplicated.timeline = duplicated.timeline.map((event) => ({
    ...event,
    id: createId("timeline"),
    projectId: newProjectId,
    chapterId: event.chapterId ? chapterMap.get(event.chapterId) ?? event.chapterId : undefined,
    updatedAt: timestamp,
  }));
  source.timeline.forEach((original, index) => {
    entityMap.set(`timeline_event:${original.id}`, duplicated.timeline[index].id);
  });

  duplicated.relationships = duplicated.relationships.map((relationship) => ({
    ...relationship,
    id: createId("relation"),
    projectId: newProjectId,
    sourceId:
      entityMap.get(`${relationship.sourceType}:${relationship.sourceId}`) ??
      relationship.sourceId,
    targetId:
      entityMap.get(`${relationship.targetType}:${relationship.targetId}`) ??
      relationship.targetId,
    updatedAt: timestamp,
  }));
  source.relationships.forEach((original, index) => {
    entityMap.set(`relationship:${original.id}`, duplicated.relationships[index].id);
  });

  duplicated.entityProgression = duplicated.entityProgression.map((entry) => ({
    ...entry,
    id: createId("progress"),
    projectId: newProjectId,
    chapterId: entry.chapterId ? chapterMap.get(entry.chapterId) ?? entry.chapterId : undefined,
    entityId: entityMap.get(`${entry.entityType}:${entry.entityId}`) ?? entry.entityId,
    updatedAt: timestamp,
  }));

  duplicated.entityHistory = duplicated.entityHistory.map((entry) => ({
    ...entry,
    id: createId("entity-history"),
    projectId: newProjectId,
    chapterId: chapterMap.get(entry.chapterId) ?? entry.chapterId,
    entityId:
      entry.entityType === "relationship"
        ? entityMap.get(`relationship:${entry.entityId}`) ?? entry.entityId
        : entityMap.get(`${entry.entityType}:${entry.entityId}`) ?? entry.entityId,
    updatedAt: timestamp,
  }));

  duplicated.revisionIssues = duplicated.revisionIssues.map((issue) => ({
    ...issue,
    id: createId("issue"),
    projectId: newProjectId,
    chapterId: issue.chapterId ? chapterMap.get(issue.chapterId) ?? issue.chapterId : undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  duplicated.checklist = duplicated.checklist.map((item) => ({
    ...item,
    id: createId("chk"),
    projectId: newProjectId,
    done: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  duplicated.annotations = duplicated.annotations.map((item) => ({
    ...item,
    id: createId("anno"),
    projectId: newProjectId,
    chapterId: chapterMap.get(item.chapterId) ?? item.chapterId,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  duplicated.goal = {
    ...duplicated.goal,
    id: createId("goal"),
    projectId: newProjectId,
    updatedAt: timestamp,
  };

  duplicated.snapshots = [];
  duplicated.aiActions = [];
  duplicated.writingSessions = [];
  duplicated.chapterTrackerReports = duplicated.chapterTrackerReports.map((report) => ({
    ...report,
    id: createId("chapter-tracker"),
    projectId: newProjectId,
    chapterId: chapterMap.get(report.chapterId) ?? report.chapterId,
    updatedAt: timestamp,
  }));
  duplicated.canonDeltas = duplicated.canonDeltas.map((delta) => ({
    ...delta,
    id: createId("delta"),
    projectId: newProjectId,
    chapterId: delta.chapterId ? chapterMap.get(delta.chapterId) ?? delta.chapterId : undefined,
    entityId:
      delta.entityType === "chapter"
        ? chapterMap.get(delta.entityId) ?? delta.entityId
        : entityMap.get(`${delta.entityType}:${delta.entityId}`) ?? delta.entityId,
    updatedAt: timestamp,
  }));

  await insertProjectBundle(duplicated);
  return duplicated;
}

export async function archiveProject(projectId: string, status: Project["status"]): Promise<void> {
  await updateProjectMeta(projectId, { status });
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = getDb();
  await db.transaction(
    "rw",
    [
      db.projects,
      db.manuscripts,
      db.chapters,
      db.scenes,
      db.bibles,
      db.characters,
      db.locations,
      db.loreEntries,
      db.timelineEvents,
      db.narrativeRelationships,
      db.entityProgression,
      db.entityHistory,
      db.revisionIssues,
      db.checklistItems,
      db.annotations,
      db.writingGoals,
      db.snapshots,
      db.aiActions,
      db.chapterTrackerReports,
      db.canonDeltas,
      db.writingSessions,
    ],
    async () => {
      await db.projects.delete(projectId);
      await db.manuscripts.delete(projectId);
      await db.chapters.where("projectId").equals(projectId).delete();
      await db.scenes.where("projectId").equals(projectId).delete();
      await db.bibles.where("projectId").equals(projectId).delete();
      await db.characters.where("projectId").equals(projectId).delete();
      await db.locations.where("projectId").equals(projectId).delete();
      await db.loreEntries.where("projectId").equals(projectId).delete();
      await db.timelineEvents.where("projectId").equals(projectId).delete();
      await db.narrativeRelationships.where("projectId").equals(projectId).delete();
      await db.entityProgression.where("projectId").equals(projectId).delete();
      await db.entityHistory.where("projectId").equals(projectId).delete();
      await db.revisionIssues.where("projectId").equals(projectId).delete();
      await db.checklistItems.where("projectId").equals(projectId).delete();
      await db.annotations.where("projectId").equals(projectId).delete();
      await db.writingGoals.where("projectId").equals(projectId).delete();
      await db.snapshots.where("projectId").equals(projectId).delete();
      await db.aiActions.where("projectId").equals(projectId).delete();
      await db.chapterTrackerReports.where("projectId").equals(projectId).delete();
      await db.canonDeltas.where("projectId").equals(projectId).delete();
      await db.writingSessions.where("projectId").equals(projectId).delete();
    }
  );
}

export async function saveManuscript(manuscript: Manuscript): Promise<void> {
  const db = getDb();
  await db.manuscripts.put({ ...manuscript, updatedAt: now() });
  await updateProjectMeta(manuscript.projectId, {});
}

export async function saveChapter(chapter: Chapter): Promise<Chapter> {
  const db = getDb();
  const previous = await db.chapters.get(chapter.id);
  const nextCount = wordCount(chapter.content);
  const updated: Chapter = {
    ...chapter,
    wordCountCurrent: nextCount,
    updatedAt: now(),
  };
  await db.chapters.put(updated);
  if (previous) {
    const written = nextCount - previous.wordCountCurrent;
    if (written > 0) await recordWritingProgress(chapter.projectId, written);
  }
  await updateProjectMeta(chapter.projectId, {});
  return updated;
}

export async function addChapter(projectId: string): Promise<Chapter> {
  const db = getDb();
  const chapters = await db.chapters.where("projectId").equals(projectId).sortBy("number");
  const chapter = createChapter(projectId, chapters.length + 1);
  await db.chapters.add(chapter);
  await updateProjectMeta(projectId, {});
  return chapter;
}

export async function deleteChapter(chapterId: string): Promise<void> {
  const db = getDb();
  const chapter = await db.chapters.get(chapterId);
  if (!chapter) return;

  const scenes = await db.scenes.where("chapterId").equals(chapterId).toArray();
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const remainingChapters = (await db.chapters.where("projectId").equals(chapter.projectId).sortBy("number"))
    .filter((item) => item.id !== chapterId);
  const timestamp = now();

  await db.transaction(
    "rw",
    [
      db.chapters,
      db.scenes,
      db.annotations,
      db.revisionIssues,
      db.timelineEvents,
      db.entityProgression,
      db.entityHistory,
      db.snapshots,
      db.chapterTrackerReports,
    ],
    async () => {
      await db.chapters.delete(chapterId);
      await db.scenes.where("chapterId").equals(chapterId).delete();
      await db.annotations.where("chapterId").equals(chapterId).delete();
      await db.revisionIssues.where("chapterId").equals(chapterId).delete();
      await db.snapshots.where("chapterId").equals(chapterId).delete();
      await db.chapterTrackerReports.where("chapterId").equals(chapterId).delete();
      await db.entityHistory.where("chapterId").equals(chapterId).delete();

      const timelineEvents = await db.timelineEvents.where("projectId").equals(chapter.projectId).toArray();
      await Promise.all(
        timelineEvents
          .filter((event) => event.chapterId === chapterId)
          .map((event) =>
            db.timelineEvents.put({
              ...event,
              chapterId: undefined,
              updatedAt: timestamp,
            })
          )
      );

      const progressionEntries = await db.entityProgression
        .where("projectId")
        .equals(chapter.projectId)
        .toArray();
      await Promise.all(
        progressionEntries
          .filter(
            (entry) => entry.chapterId === chapterId || (entry.sceneId ? sceneIds.has(entry.sceneId) : false)
          )
          .map((entry) => db.entityProgression.delete(entry.id))
      );

      await Promise.all(
        remainingChapters.map((item, index) =>
          db.chapters.put({
            ...item,
            number: index + 1,
            updatedAt: timestamp,
          })
        )
      );
    }
  );

  await updateProjectMeta(chapter.projectId, {});
}

export async function reorderChapter(projectId: string, fromNumber: number, toNumber: number): Promise<void> {
  const db = getDb();
  const chapters = await db.chapters.where("projectId").equals(projectId).sortBy("number");
  if (fromNumber < 1 || toNumber < 1 || fromNumber > chapters.length || toNumber > chapters.length) {
    return;
  }

  const next = [...chapters];
  const [item] = next.splice(fromNumber - 1, 1);
  next.splice(toNumber - 1, 0, item);

  const timestamp = now();
  await db.transaction("rw", db.chapters, async () => {
    await Promise.all(
      next.map((chapter, index) =>
        db.chapters.put({
          ...chapter,
          number: index + 1,
          updatedAt: timestamp,
        })
      )
    );
  });
  await updateProjectMeta(projectId, {});
}

export async function addScene(projectId: string, chapterId: string): Promise<Scene> {
  const db = getDb();
  const existing = await db.scenes.where("chapterId").equals(chapterId).sortBy("order");
  const timestamp = now();
  const scene: Scene = {
    id: createId("scene"),
    projectId,
    chapterId,
    order: existing.length + 1,
    title: "",
    description: "",
    location: "",
    characters: [],
    notes: "",
    draftText: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.scenes.add(scene);
  await updateProjectMeta(projectId, {});
  return scene;
}

export async function deleteScene(sceneId: string): Promise<void> {
  const db = getDb();
  const scene = await db.scenes.get(sceneId);
  if (!scene) return;

  const remainingScenes = (await db.scenes.where("chapterId").equals(scene.chapterId).sortBy("order"))
    .filter((item) => item.id !== sceneId);
  const timestamp = now();

  await db.transaction("rw", [db.scenes, db.entityProgression], async () => {
    await db.scenes.delete(sceneId);
    await db.entityProgression.where("sceneId").equals(sceneId).delete();

    await Promise.all(
      remainingScenes.map((item, index) =>
        db.scenes.put({
          ...item,
          order: index + 1,
          updatedAt: timestamp,
        })
      )
    );
  });

  await updateProjectMeta(scene.projectId, {});
}

export async function saveScene(scene: Scene): Promise<Scene> {
  const db = getDb();
  const updated = {
    ...scene,
    updatedAt: now(),
  };
  await db.scenes.put(updated);
  await updateProjectMeta(scene.projectId, {});
  return updated;
}

export async function reorderScene(chapterId: string, fromOrder: number, toOrder: number): Promise<void> {
  const db = getDb();
  const scenes = await db.scenes.where("chapterId").equals(chapterId).sortBy("order");
  if (fromOrder < 1 || toOrder < 1 || fromOrder > scenes.length || toOrder > scenes.length) {
    return;
  }

  const next = [...scenes];
  const [item] = next.splice(fromOrder - 1, 1);
  next.splice(toOrder - 1, 0, item);

  const timestamp = now();
  await Promise.all(
    next.map((scene, index) =>
      db.scenes.put({
        ...scene,
        order: index + 1,
        updatedAt: timestamp,
      })
    )
  );

  const projectId = next[0]?.projectId;
  if (projectId) await updateProjectMeta(projectId, {});
}

export async function saveStoryBible(bible: StoryBible): Promise<StoryBible> {
  const db = getDb();
  const updated = { ...bible, updatedAt: now() };
  await db.bibles.put(updated);
  await updateProjectMeta(bible.projectId, {});
  return updated;
}

export async function saveCharacterProfile(profile: CharacterProfile): Promise<CharacterProfile> {
  const db = getDb();
  const updated = {
    ...profile,
    id: profile.id || createId("char"),
    updatedAt: now(),
  };
  await db.characters.put(updated);
  await updateProjectMeta(profile.projectId, {});
  return updated;
}

interface TrackedEntityTable {
  get: (id: string) => Promise<{ projectId: string } | undefined>;
  delete: (id: string) => Promise<void>;
}

/**
 * Delete a tracked entity (character, location, lore, timeline event) and
 * cascade-delete its relationships, progression entries, and history notes.
 */
async function deleteTrackedEntityCascade(
  table: TrackedEntityTable,
  entityType: NarrativeRelationship["sourceType"],
  entityId: string
): Promise<void> {
  const db = getDb();
  const existing = await table.get(entityId);
  if (!existing) return;

  await db.transaction(
    "rw",
    [
      db.characters,
      db.locations,
      db.loreEntries,
      db.timelineEvents,
      db.narrativeRelationships,
      db.entityProgression,
      db.entityHistory,
    ],
    async () => {
      await table.delete(entityId);

      const relationships = await db.narrativeRelationships
        .where("projectId")
        .equals(existing.projectId)
        .toArray();
      await Promise.all(
        relationships
          .filter(
            (item) =>
              (item.sourceType === entityType && item.sourceId === entityId) ||
              (item.targetType === entityType && item.targetId === entityId)
          )
          .map((item) => db.narrativeRelationships.delete(item.id))
      );

      const progressionEntries = await db.entityProgression
        .where("projectId")
        .equals(existing.projectId)
        .toArray();
      await Promise.all(
        progressionEntries
          .filter((item) => item.entityType === entityType && item.entityId === entityId)
          .map((item) => db.entityProgression.delete(item.id))
      );

      const historyEntries = await db.entityHistory
        .where("projectId")
        .equals(existing.projectId)
        .toArray();
      await Promise.all(
        historyEntries
          .filter((item) => item.entityType === entityType && item.entityId === entityId)
          .map((item) => db.entityHistory.delete(item.id))
      );
    }
  );

  await updateProjectMeta(existing.projectId, {});
}

export async function deleteCharacterProfile(characterId: string): Promise<void> {
  await deleteTrackedEntityCascade(getDb().characters, "character", characterId);
}

export async function saveLocationProfile(profile: LocationProfile): Promise<LocationProfile> {
  const db = getDb();
  const updated = {
    ...profile,
    id: profile.id || createLocationProfile(profile.projectId).id,
    updatedAt: now(),
  };
  await db.locations.put(updated);
  await updateProjectMeta(profile.projectId, {});
  return updated;
}

export async function deleteLocationProfile(locationId: string): Promise<void> {
  await deleteTrackedEntityCascade(getDb().locations, "location", locationId);
}

export async function saveLoreEntry(entry: LoreEntryRecord): Promise<LoreEntryRecord> {
  const db = getDb();
  const updated = {
    ...entry,
    id: entry.id || createLoreEntry(entry.projectId).id,
    updatedAt: now(),
  };
  await db.loreEntries.put(updated);
  await updateProjectMeta(entry.projectId, {});
  return updated;
}

export async function deleteLoreEntry(loreId: string): Promise<void> {
  await deleteTrackedEntityCascade(getDb().loreEntries, "lore", loreId);
}

export async function saveTimelineEvent(event: TimelineEvent): Promise<TimelineEvent> {
  const db = getDb();
  const updated = {
    ...event,
    id: event.id || createId("timeline"),
    updatedAt: now(),
  };
  await db.timelineEvents.put(updated);
  await updateProjectMeta(event.projectId, {});
  return updated;
}

export async function deleteTimelineEvent(eventId: string): Promise<void> {
  await deleteTrackedEntityCascade(getDb().timelineEvents, "timeline_event", eventId);
}

export async function saveNarrativeRelationship(
  relationship: NarrativeRelationship
): Promise<NarrativeRelationship> {
  const db = getDb();
  const updated = {
    ...relationship,
    id: relationship.id || createNarrativeRelationship(relationship.projectId).id,
    updatedAt: now(),
  };
  await db.narrativeRelationships.put(updated);
  await updateProjectMeta(relationship.projectId, {});
  return updated;
}

export async function deleteNarrativeRelationship(relationshipId: string): Promise<void> {
  const db = getDb();
  const relationship = await db.narrativeRelationships.get(relationshipId);
  if (!relationship) return;
  await db.transaction("rw", [db.narrativeRelationships, db.entityHistory], async () => {
    await db.narrativeRelationships.delete(relationshipId);
    const historyEntries = await db.entityHistory.where("projectId").equals(relationship.projectId).toArray();
    await Promise.all(
      historyEntries
        .filter((item) => item.entityType === "relationship" && item.entityId === relationshipId)
        .map((item) => db.entityHistory.delete(item.id))
    );
  });
  await updateProjectMeta(relationship.projectId, {});
}

export async function saveEntityProgression(
  entry: EntityProgression
): Promise<EntityProgression> {
  const db = getDb();
  const updated = {
    ...entry,
    id: entry.id || createEntityProgression(entry.projectId).id,
    updatedAt: now(),
  };
  await db.entityProgression.put(updated);
  await updateProjectMeta(entry.projectId, {});
  return updated;
}

export async function saveEntityHistoryEntry(entry: EntityHistoryEntry): Promise<EntityHistoryEntry> {
  const db = getDb();
  const updated = {
    ...entry,
    id: entry.id || createEntityHistoryEntry(entry.projectId, entry.chapterId).id,
    updatedAt: now(),
  };
  await db.entityHistory.put(updated);
  await updateProjectMeta(entry.projectId, {});
  return updated;
}

export async function replaceEntityHistoryForChapter(
  projectId: string,
  chapterId: string,
  entries: EntityHistoryEntry[]
): Promise<void> {
  const db = getDb();
  const timestamp = now();

  await db.transaction("rw", db.entityHistory, async () => {
    await db.entityHistory.where("chapterId").equals(chapterId).delete();
    if (entries.length > 0) {
      await db.entityHistory.bulkPut(
        entries.map((entry) => ({
          ...entry,
          id: entry.id || createEntityHistoryEntry(projectId, chapterId).id,
          projectId,
          chapterId,
          updatedAt: timestamp,
        }))
      );
    }
  });

  await updateProjectMeta(projectId, {});
}

export async function deleteEntityHistoryEntry(entryId: string): Promise<void> {
  const db = getDb();
  const entry = await db.entityHistory.get(entryId);
  if (!entry) return;
  await db.entityHistory.delete(entryId);
  await updateProjectMeta(entry.projectId, {});
}

export async function deleteEntityProgression(entryId: string): Promise<void> {
  const db = getDb();
  const entry = await db.entityProgression.get(entryId);
  if (!entry) return;
  await db.entityProgression.delete(entryId);
  await updateProjectMeta(entry.projectId, {});
}

export async function createRevisionIssue(input: {
  projectId: string;
  chapterId?: string;
  title: string;
  description: string;
  severity: RevisionIssue["severity"];
}): Promise<RevisionIssue> {
  const db = getDb();
  const timestamp = now();
  const issue: RevisionIssue = {
    id: createId("issue"),
    projectId: input.projectId,
    chapterId: input.chapterId,
    title: input.title,
    description: input.description,
    severity: input.severity,
    status: "open",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.revisionIssues.add(issue);
  await updateProjectMeta(input.projectId, {});
  return issue;
}

export async function updateRevisionIssueStatus(issueId: string, status: RevisionStatus): Promise<void> {
  const db = getDb();
  const issue = await db.revisionIssues.get(issueId);
  if (!issue) return;
  await db.revisionIssues.put({ ...issue, status, updatedAt: now() });
  await updateProjectMeta(issue.projectId, {});
}

export async function deleteRevisionIssue(issueId: string): Promise<void> {
  const db = getDb();
  const issue = await db.revisionIssues.get(issueId);
  if (!issue) return;
  await db.revisionIssues.delete(issueId);
  await updateProjectMeta(issue.projectId, {});
}

export async function saveChecklistItem(item: ChecklistItem): Promise<ChecklistItem> {
  const db = getDb();
  const updated = {
    ...item,
    id: item.id || createId("chk"),
    updatedAt: now(),
  };
  await db.checklistItems.put(updated);
  await updateProjectMeta(item.projectId, {});
  return updated;
}

export async function toggleChecklistItem(itemId: string, done: boolean): Promise<void> {
  const db = getDb();
  const item = await db.checklistItems.get(itemId);
  if (!item) return;
  await db.checklistItems.put({ ...item, done, updatedAt: now() });
  await updateProjectMeta(item.projectId, {});
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const db = getDb();
  const item = await db.checklistItems.get(itemId);
  if (!item) return;
  await db.checklistItems.delete(itemId);
  await updateProjectMeta(item.projectId, {});
}

export async function saveAnnotation(annotation: Annotation): Promise<Annotation> {
  const db = getDb();
  const updated = {
    ...annotation,
    id: annotation.id || createId("anno"),
    updatedAt: now(),
  };
  await db.annotations.put(updated);
  await updateProjectMeta(annotation.projectId, {});
  return updated;
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  const db = getDb();
  const annotation = await db.annotations.get(annotationId);
  if (!annotation) return;
  await db.annotations.delete(annotationId);
  await updateProjectMeta(annotation.projectId, {});
}

export async function saveWritingGoal(goal: WritingGoal): Promise<WritingGoal> {
  const db = getDb();
  const updated = { ...goal, updatedAt: now() };
  await db.writingGoals.put(updated);
  await updateProjectMeta(goal.projectId, {});
  return updated;
}

export async function createSnapshot(input: {
  projectId: string;
  chapterId?: string;
  label: string;
  payload: string;
}): Promise<Snapshot> {
  const db = getDb();
  const snapshot: Snapshot = {
    id: createId("snapshot"),
    projectId: input.projectId,
    chapterId: input.chapterId,
    label: input.label,
    payload: input.payload,
    createdAt: now(),
  };

  await db.snapshots.add(snapshot);
  await updateProjectMeta(input.projectId, {});
  return snapshot;
}

export async function restoreSnapshot(snapshotId: string): Promise<Snapshot | null> {
  const db = getDb();
  const snapshot = await db.snapshots.get(snapshotId);
  if (!snapshot) return null;

  if (snapshot.chapterId) {
    const chapter = await db.chapters.get(snapshot.chapterId);
    if (chapter) {
      await saveChapter({ ...chapter, content: snapshot.payload });
    }
  }

  return snapshot;
}

export async function logAiAction(input: {
  projectId: string;
  chapterId?: string;
  action: AiActionType;
  status: AiActionStatus;
  model: string;
  providerBaseUrl: string;
  inputPreview: string;
  outputPreview: string;
  metadata?: Record<string, unknown>;
}): Promise<AiAction> {
  const db = getDb();
  const action: AiAction = {
    id: createId("ai"),
    projectId: input.projectId,
    chapterId: input.chapterId,
    action: input.action,
    status: input.status,
    model: input.model,
    providerBaseUrl: input.providerBaseUrl,
    inputPreview: sanitizeTextForPreview(input.inputPreview),
    outputPreview: sanitizeTextForPreview(input.outputPreview),
    metadata: JSON.stringify(input.metadata ?? {}),
    createdAt: now(),
  };

  await db.aiActions.add(action);
  await updateProjectMeta(input.projectId, {});
  return action;
}

export async function saveChapterTrackerReport(
  report: ChapterTrackerReport
): Promise<ChapterTrackerReport> {
  const db = getDb();
  const updated: ChapterTrackerReport = {
    ...report,
    id: report.id || createId("chapter-tracker"),
    updatedAt: now(),
  };
  await db.chapterTrackerReports.put(updated);
  await updateProjectMeta(report.projectId, {});
  return updated;
}

// --- Canon deltas: the proposed → validated → canon governance loop ---------

const PROGRESSION_LAYERS: DeltaLayer[] = [
  "startState",
  "endState",
  "knowledge",
  "belief",
  "inventory",
  "narrationStatus",
];

type ProgressionLayer =
  | "startState"
  | "endState"
  | "knowledge"
  | "belief"
  | "inventory"
  | "narrationStatus";

function isProgressionLayer(layer: DeltaLayer): layer is ProgressionLayer {
  return (PROGRESSION_LAYERS as string[]).includes(layer);
}

/**
 * Deterministic verifier: a proposed change is only "accepted" when every cited
 * evidence quote is actually present in the supplied chapter text. This enforces
 * the governance rule that canon must never mutate without traceable evidence.
 */
export function verifyCanonDelta(
  delta: Pick<CanonDelta, "after" | "confidence" | "evidence">,
  chapterText: string
): { verdict: VerifierVerdict; reason: string } {
  if (!delta.after.trim()) {
    return { verdict: "rejected", reason: "The proposed value is empty." };
  }

  const haystack = plainText(chapterText).toLocaleLowerCase();
  const quotes = delta.evidence.map((item) => item.quote.trim()).filter(Boolean);

  if (quotes.length === 0) {
    return {
      verdict: "uncertain",
      reason: "No evidence span was provided to support this change.",
    };
  }

  const supported = quotes.filter((quote) =>
    haystack.includes(plainText(quote).toLocaleLowerCase())
  );

  if (supported.length === quotes.length) {
    return {
      verdict: "accepted",
      reason: `All ${quotes.length} evidence span(s) were found in the chapter text.`,
    };
  }
  if (supported.length === 0) {
    return {
      verdict: "rejected",
      reason: "None of the cited evidence spans appear in the chapter text.",
    };
  }
  return {
    verdict: "uncertain",
    reason: `${supported.length}/${quotes.length} evidence spans were found in the chapter text.`,
  };
}

export async function saveCanonDelta(delta: CanonDelta): Promise<CanonDelta> {
  const db = getDb();
  const updated: CanonDelta = {
    ...delta,
    id: delta.id || createId("delta"),
    updatedAt: now(),
  };
  await db.canonDeltas.put(updated);
  await updateProjectMeta(delta.projectId, {});
  return updated;
}

export async function deleteCanonDelta(deltaId: string): Promise<void> {
  const db = getDb();
  const delta = await db.canonDeltas.get(deltaId);
  if (!delta) return;
  await db.canonDeltas.delete(deltaId);
  await updateProjectMeta(delta.projectId, {});
}

function appendNote(existing: string, addition: string): string {
  if (!addition.trim()) return existing;
  return existing.trim() ? `${existing.trim()}\n${addition.trim()}` : addition.trim();
}

async function applyDeltaToCanon(db: NovelArchitectDb, delta: CanonDelta): Promise<void> {
  if (delta.entityType === "chapter" && delta.layer === "summary") {
    const chapter = await db.chapters.get(delta.entityId);
    if (chapter) {
      await db.chapters.put({ ...chapter, summary: delta.after, updatedAt: now() });
    }
    return;
  }

  if (delta.entityType === "relationship" && delta.layer === "relationship") {
    const relationship = await db.narrativeRelationships.get(delta.entityId);
    if (relationship) {
      await db.narrativeRelationships.put({
        ...relationship,
        status: delta.after || relationship.status,
        notes: appendNote(relationship.notes, delta.rationale),
        updatedAt: now(),
      });
    }
    return;
  }

  if (
    isProgressionLayer(delta.layer) &&
    delta.entityType !== "chapter" &&
    delta.entityType !== "relationship"
  ) {
    const entityType = delta.entityType as TrackedEntityType;
    const rows = await db.entityProgression.where("projectId").equals(delta.projectId).toArray();
    const existing = rows.find(
      (row) =>
        row.entityType === entityType &&
        row.entityId === delta.entityId &&
        (row.chapterId ?? "") === (delta.chapterId ?? "")
    );

    const evidenceText = delta.evidence
      .map((item) => item.quote)
      .filter(Boolean)
      .join("\n");

    const base: EntityProgression =
      existing ?? {
        ...createEntityProgression(delta.projectId),
        entityType,
        entityId: delta.entityId,
        label: delta.entityLabel,
        chapterId: delta.chapterId,
      };

    const updated: EntityProgression = {
      ...base,
      label: base.label || delta.entityLabel,
      evidence: evidenceText || base.evidence,
      validatedDelta: delta.after,
      confidence: delta.confidence,
      updatedAt: now(),
    };
    updated[delta.layer] = delta.after;

    await db.entityProgression.put(updated);
  }
}

export async function approveCanonDelta(deltaId: string): Promise<CanonDelta | null> {
  const db = getDb();
  const delta = await db.canonDeltas.get(deltaId);
  if (!delta) return null;

  const timestamp = now();
  await db.transaction(
    "rw",
    [db.canonDeltas, db.chapters, db.narrativeRelationships, db.entityProgression],
    async () => {
      await applyDeltaToCanon(db, delta);
      await db.canonDeltas.put({
        ...delta,
        status: "validated",
        resolvedAt: timestamp,
        updatedAt: timestamp,
      });
    }
  );

  // Provenance: every canon mutation leaves an auditable trace.
  await logAiAction({
    projectId: delta.projectId,
    chapterId: delta.chapterId,
    action: "consistency_check",
    status: "completed",
    model: "(local validation)",
    providerBaseUrl: "(canon)",
    inputPreview: `${delta.entityLabel} · ${delta.layer}: ${delta.before}`,
    outputPreview: delta.after,
    metadata: {
      feature: "canon_delta_validated",
      deltaId: delta.id,
      entityType: delta.entityType,
      layer: delta.layer,
      confidence: delta.confidence,
      verifierVerdict: delta.verifierVerdict,
      evidenceCount: delta.evidence.length,
    },
  });

  await updateProjectMeta(delta.projectId, {});
  return (await db.canonDeltas.get(deltaId)) ?? null;
}

export async function rejectCanonDelta(deltaId: string): Promise<CanonDelta | null> {
  const db = getDb();
  const delta = await db.canonDeltas.get(deltaId);
  if (!delta) return null;
  const timestamp = now();
  const updated: CanonDelta = {
    ...delta,
    status: "rejected" as DeltaStatus,
    resolvedAt: timestamp,
    updatedAt: timestamp,
  };
  await db.canonDeltas.put(updated);
  await updateProjectMeta(delta.projectId, {});
  return updated;
}

export function canonDeltasForChapter(bundle: ProjectBundle, chapterId: string): CanonDelta[] {
  return bundle.canonDeltas.filter((delta) => delta.chapterId === chapterId);
}

// --- POV & knowledge: what a character knows vs. believes, chapter by chapter -

export interface KnowledgeFrame {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  knowledge: string;
  belief: string;
  /** True when the character believes something that diverges from what they know. */
  diverges: boolean;
}

function normalizedEquals(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

/**
 * Reconstruct a character's knowledge/belief across chapters from validated
 * progression rows. A divergence (knows X but believes Y) is the raw material
 * for dramatic irony and unreliable narration, so it is surfaced, not hidden.
 */
export function buildKnowledgeTimeline(
  bundle: ProjectBundle,
  characterId: string
): KnowledgeFrame[] {
  const rows = bundle.entityProgression.filter(
    (row) => row.entityType === "character" && row.entityId === characterId
  );

  return bundle.chapters
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((chapter) => {
      const row = rows.find((item) => item.chapterId === chapter.id);
      const knowledge = row?.knowledge ?? "";
      const belief = row?.belief ?? "";
      return {
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        knowledge,
        belief,
        diverges: Boolean(knowledge.trim() && belief.trim() && !normalizedEquals(knowledge, belief)),
      };
    });
}

/** Chapters where the character's belief diverges from their knowledge. */
export function beliefDivergences(bundle: ProjectBundle, characterId: string): KnowledgeFrame[] {
  return buildKnowledgeTimeline(bundle, characterId).filter((frame) => frame.diverges);
}

// --- Writing sessions: per-day throughput against goals ----------------------

export async function recordWritingProgress(
  projectId: string,
  deltaWords: number
): Promise<WritingSession | null> {
  if (deltaWords <= 0) return null;
  const db = getDb();
  const date = dayKey();
  const id = `${projectId}:${date}`;
  const existing = await db.writingSessions.get(id);
  const session: WritingSession = existing
    ? { ...existing, wordsWritten: existing.wordsWritten + deltaWords, updatedAt: now() }
    : { ...createWritingSession(projectId, date), wordsWritten: deltaWords };
  await db.writingSessions.put(session);
  return session;
}

export function wordsWrittenToday(bundle: ProjectBundle): number {
  const date = dayKey();
  return bundle.writingSessions.find((session) => session.date === date)?.wordsWritten ?? 0;
}

function profileId(scope: SettingsProfile["scope"], projectId?: string, featureKey?: string): string {
  if (scope === "global") return "global";
  if (scope === "project") return `project:${projectId}`;
  return `feature:${projectId}:${featureKey}`;
}

function hasLocalStorage(): boolean {
  try {
    return typeof globalThis !== "undefined" && "localStorage" in globalThis && globalThis.localStorage != null;
  } catch {
    return false;
  }
}

function readGlobalSettingsProfile(): SettingsProfile | null {
  if (!hasLocalStorage()) return null;

  try {
    const raw = globalThis.localStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw) as {
      values?: string;
      updatedAt?: string;
    };

    if (typeof payload.values !== "string") return null;

    return {
      id: profileId("global"),
      scope: "global",
      projectId: undefined,
      featureKey: undefined,
      values: payload.values,
      updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : now(),
    };
  } catch {
    return null;
  }
}

function writeGlobalSettingsProfile(profile: SettingsProfile): void {
  if (!hasLocalStorage()) return;

  try {
    globalThis.localStorage.setItem(
      GLOBAL_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        values: profile.values,
        updatedAt: profile.updatedAt,
      })
    );
  } catch {
    // Ignore storage failures and let callers keep operating with in-memory state.
  }
}

function clearGlobalSettingsProfile(): void {
  if (!hasLocalStorage()) return;

  try {
    globalThis.localStorage.removeItem(GLOBAL_SETTINGS_STORAGE_KEY);
  } catch {
    // Ignore storage failures during reset.
  }
}

function mergeSettingsPatch(base?: Partial<AppSettings>, patch?: Partial<AppSettings>): Partial<AppSettings> {
  if (!base) return patch ?? {};
  if (!patch) return base;

  const llm = base.llm || patch.llm ? { ...base.llm, ...patch.llm } : undefined;
  const prompts = base.prompts || patch.prompts ? { ...base.prompts, ...patch.prompts } : undefined;
  const rubricWeights =
    base.qa?.rubricWeights || patch.qa?.rubricWeights
      ? {
          ...base.qa?.rubricWeights,
          ...patch.qa?.rubricWeights,
        }
      : undefined;
  const qa =
    base.qa || patch.qa
      ? {
          ...base.qa,
          ...patch.qa,
          ...(rubricWeights ? { rubricWeights } : {}),
        }
      : undefined;

  return {
    ...base,
    ...patch,
    ...(llm ? { llm } : {}),
    ...(prompts ? { prompts } : {}),
    ...(qa ? { qa } : {}),
  } as Partial<AppSettings>;
}

export async function getSettingsProfile(scope: SettingsProfile["scope"], projectId?: string, featureKey?: string): Promise<SettingsProfile | null> {
  const id = profileId(scope, projectId, featureKey);

  if (scope === "global") {
    const localProfile = readGlobalSettingsProfile();
    if (localProfile) return localProfile;
  }

  const db = getDb();
  const profile = await db.settingsProfiles.get(id);

  if (scope === "global" && profile) {
    writeGlobalSettingsProfile(profile);
  }

  return profile ?? null;
}

export async function saveSettingsProfile(scope: SettingsProfile["scope"], values: Partial<AppSettings>, projectId?: string, featureKey?: string): Promise<SettingsProfile> {
  const id = profileId(scope, projectId, featureKey);
  const currentValues = parseProfileValues(await getSettingsProfile(scope, projectId, featureKey));
  const profile: SettingsProfile = {
    id,
    scope,
    projectId,
    featureKey,
    values: JSON.stringify(mergeSettingsPatch(currentValues, values)),
    updatedAt: now(),
  };

  if (scope === "global" && hasLocalStorage()) {
    writeGlobalSettingsProfile(profile);
    const db = getDb();
    await db.settingsProfiles.delete(id);
    return profile;
  }

  const db = getDb();
  await db.settingsProfiles.put(profile);
  return profile;
}

function mergeSettings(base: AppSettings, patch?: Partial<AppSettings>): AppSettings {
  if (!patch) return base;

  return {
    ...base,
    ...patch,
    llm: {
      ...base.llm,
      ...patch.llm,
    },
    prompts: {
      ...base.prompts,
      ...patch.prompts,
    },
    qa: {
      ...base.qa,
      ...patch.qa,
      rubricWeights: {
        ...base.qa.rubricWeights,
        ...patch.qa?.rubricWeights,
      },
    },
  };
}

function parseProfileValues(profile: SettingsProfile | null): Partial<AppSettings> | undefined {
  if (!profile) return undefined;
  try {
    return JSON.parse(profile.values) as Partial<AppSettings>;
  } catch {
    return undefined;
  }
}

export async function resolveSettings(projectId?: string, featureKey?: string, runOverride?: Partial<AppSettings>): Promise<ResolvedSettings> {
  const [globalProfile, projectProfile, featureProfile] = await Promise.all([
    getSettingsProfile("global"),
    projectId ? getSettingsProfile("project", projectId) : Promise.resolve(null),
    projectId && featureKey ? getSettingsProfile("feature", projectId, featureKey) : Promise.resolve(null),
  ]);

  let settings = clone(DEFAULT_SETTINGS);
  const order = ["defaults"];

  const globalValues = parseProfileValues(globalProfile);
  if (globalValues) {
    settings = mergeSettings(settings, globalValues);
    order.push("global");
  }

  const projectValues = parseProfileValues(projectProfile);
  if (projectValues) {
    settings = mergeSettings(settings, projectValues);
    order.push("project");
  }

  const featureValues = parseProfileValues(featureProfile);
  if (featureValues) {
    settings = mergeSettings(settings, featureValues);
    order.push("feature");
  }

  if (runOverride) {
    settings = mergeSettings(settings, runOverride);
    order.push("run");
  }

  return { settings, sourceOrder: order };
}

export async function resetSettingsDomain(scope: SettingsProfile["scope"], projectId?: string, featureKey?: string): Promise<void> {
  const db = getDb();
  const id = profileId(scope, projectId, featureKey);

  if (scope === "global") {
    clearGlobalSettingsProfile();
  }

  await db.settingsProfiles.delete(id);
}

export function buildPublishingArtifacts(bundle: ProjectBundle): PublishingArtifacts {
  const chapterManifest = bundle.chapters
    .map((chapter) => `${chapter.number}. ${chapter.title} [${chapter.status}] - ${chapter.wordCountCurrent} words`)
    .join("\n");

  const metadataSheet = [
    `Title: ${bundle.project.title}`,
    `Genre: ${bundle.project.genre}`,
    `Audience: ${bundle.project.audience}`,
    `Tone: ${bundle.project.tone}`,
    `Target words: ${bundle.project.targetWordCount}`,
    `Language: ${bundle.project.language}`,
  ].join("\n");

  return {
    metadataSheet,
    synopsisShort: bundle.project.synopsis.slice(0, 400),
    synopsisLong: [bundle.project.synopsis, bundle.bible.premise, bundle.bible.stakes]
      .filter(Boolean)
      .join("\n\n"),
    chapterManifest,
  };
}

export function buildMarketingArtifacts(bundle: ProjectBundle): MarketingArtifacts {
  const coreHook = bundle.chapters.find((chapter) => chapter.hook)?.hook || bundle.project.synopsis;
  const baseTagline = `${bundle.project.title}: ${coreHook.slice(0, 90)}`;

  return {
    blurb: `${bundle.project.title} is a ${bundle.project.genre.toLowerCase()} novel for ${bundle.project.audience}. ${bundle.project.synopsis}`,
    tagline: baseTagline,
    pitchVariants: [
      `High concept: ${bundle.project.title} explores ${bundle.bible.themes.join(", ") || "identity"}.`,
      `Character-driven: Follow the protagonists through escalating stakes and emotional reversals.`,
      `Market fit: Designed for ${bundle.project.audience} readers who enjoy ${bundle.project.genre}.`,
    ],
    socialSnippets: [
      `${bundle.project.title} is coming. #amwriting #${bundle.project.genre.replace(/\s+/g, "")}`,
      `One hook from chapter one: ${coreHook.slice(0, 120)}`,
      `Draft progress: ${bundle.chapters.reduce((sum, c) => sum + c.wordCountCurrent, 0)} words written.`,
    ],
    emailDraft: `Subject: First look at ${bundle.project.title}\n\nHi,\n\nI am excited to share ${bundle.project.title}, a ${bundle.project.genre.toLowerCase()} project for ${bundle.project.audience}.\n\n${bundle.project.synopsis}\n\nBest,\nAuthor`,
    coverBriefPrompt: `Design a ${bundle.project.tone.toLowerCase()} ${bundle.project.genre.toLowerCase()} cover for "${bundle.project.title}" targeting ${bundle.project.audience}. Emphasize ${bundle.bible.themes.join(", ") || "the central conflict"}.`,
    launchChecklist: [
      "Finalize blurb and tagline",
      "Prepare 5 social snippets",
      "Schedule launch email",
      "Validate metadata before release",
      "Archive final manuscript snapshot",
    ],
  };
}

export function computeContinuityConflicts(bundle: ProjectBundle): ContinuityConflict[] {
  const conflicts: ContinuityConflict[] = [];

  const chapterById = new Map(bundle.chapters.map((chapter) => [chapter.id, chapter]));
  const relationshipById = new Map(bundle.relationships.map((relationship) => [relationship.id, relationship]));
  const knownCharacterNames = new Set(
    bundle.characters.map((character) => character.name.trim()).filter(Boolean)
  );
  const knownLocationNames = new Set(
    bundle.locations.map((location) => location.name.trim()).filter(Boolean)
  );
  const entityExists = (type: EntityProgression["entityType"], entityId: string): boolean => {
    switch (type) {
      case "character":
        return bundle.characters.some((character) => character.id === entityId);
      case "location":
        return bundle.locations.some((location) => location.id === entityId);
      case "lore":
        return bundle.loreEntries.some((entry) => entry.id === entityId);
      case "timeline_event":
        return bundle.timeline.some((event) => event.id === entityId);
      default:
        return false;
    }
  };

  bundle.scenes.forEach((scene) => {
    if (!chapterById.has(scene.chapterId)) {
      conflicts.push({
        id: createId("conflict"),
        type: "timeline",
        message: `Scene "${scene.title}" references a missing chapter.`,
      });
    }

    scene.characters.forEach((name) => {
      const exists = knownCharacterNames.has(name.trim());
      if (!exists) {
        conflicts.push({
          id: createId("conflict"),
          type: "character",
          chapterId: scene.chapterId,
          message: `Scene "${scene.title}" references unknown character "${name}".`,
        });
      }
    });

    if (scene.location.trim() && !knownLocationNames.has(scene.location.trim())) {
      conflicts.push({
        id: createId("conflict"),
        type: "world",
        chapterId: scene.chapterId,
        message: `Scene "${scene.title}" references unknown location "${scene.location}".`,
      });
    }
  });

  bundle.relationships.forEach((relationship) => {
    const sourceExists = entityExists(relationship.sourceType, relationship.sourceId);
    const targetExists = entityExists(relationship.targetType, relationship.targetId);
    if (!sourceExists || !targetExists) {
      conflicts.push({
        id: createId("conflict"),
        type: "timeline",
        message: `Relationship "${relationship.relationType || "untitled"}" references a missing entity.`,
      });
    }
  });

  bundle.entityProgression.forEach((entry) => {
    if (!entityExists(entry.entityType, entry.entityId)) {
      conflicts.push({
        id: createId("conflict"),
        type: "timeline",
        chapterId: entry.chapterId,
        message: `Progression entry "${entry.label || "untitled"}" references a missing entity.`,
      });
    }

    if ((entry.proposedDelta.trim() || entry.validatedDelta.trim()) && !entry.evidence.trim()) {
      conflicts.push({
        id: createId("conflict"),
        type: "world",
        chapterId: entry.chapterId,
        message: `Progression entry "${entry.label || "untitled"}" has a delta without evidence.`,
      });
    }
  });

  bundle.entityHistory.forEach((entry) => {
    if (!chapterById.has(entry.chapterId)) {
      conflicts.push({
        id: createId("conflict"),
        type: "timeline",
        chapterId: entry.chapterId,
        message: `Entity history entry "${entry.label || "untitled"}" references a missing chapter.`,
      });
    }

    if (entry.entityType === "relationship") {
      if (entry.entityId && !relationshipById.has(entry.entityId)) {
        conflicts.push({
          id: createId("conflict"),
          type: "timeline",
          chapterId: entry.chapterId,
          message: `Entity history entry "${entry.label || "untitled"}" references a missing relationship.`,
        });
      }
      return;
    }

    if (entry.entityId && !entityExists(entry.entityType, entry.entityId)) {
      conflicts.push({
        id: createId("conflict"),
        type: "timeline",
        chapterId: entry.chapterId,
        message: `Entity history entry "${entry.label || "untitled"}" references a missing entity.`,
      });
    }
  });

  if (!bundle.bible.worldRules.trim()) {
    conflicts.push({
      id: createId("conflict"),
      type: "world",
      message: "Story bible has no world rules defined.",
    });
  }

  if (bundle.timeline.length === 0) {
    conflicts.push({
      id: createId("conflict"),
      type: "timeline",
      message: "Project has no timeline events.",
    });
  }

  return conflicts;
}

export function progressionForEntity(
  bundle: ProjectBundle,
  entityType: EntityProgression["entityType"],
  entityId: string
): EntityProgression[] {
  const chapterNumberById = new Map(bundle.chapters.map((chapter) => [chapter.id, chapter.number]));
  const sceneOrderById = new Map(bundle.scenes.map((scene) => [scene.id, scene.order]));

  return bundle.entityProgression
    .filter((entry) => entry.entityType === entityType && entry.entityId === entityId)
    .sort((a, b) => {
      const chapterA = a.chapterId ? chapterNumberById.get(a.chapterId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      const chapterB = b.chapterId ? chapterNumberById.get(b.chapterId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      if (chapterA !== chapterB) return chapterA - chapterB;
      const sceneA = a.sceneId ? sceneOrderById.get(a.sceneId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      const sceneB = b.sceneId ? sceneOrderById.get(b.sceneId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
      return sceneA - sceneB;
    });
}

export function entityHistoryForEntity(
  bundle: ProjectBundle,
  entityType: EntityHistoryEntry["entityType"],
  entityId: string
): EntityHistoryEntry[] {
  const chapterNumberById = new Map(bundle.chapters.map((chapter) => [chapter.id, chapter.number]));

  return bundle.entityHistory
    .filter((entry) => entry.entityType === entityType && entry.entityId === entityId)
    .sort((a, b) => {
      const chapterA = chapterNumberById.get(a.chapterId) ?? Number.MAX_SAFE_INTEGER;
      const chapterB = chapterNumberById.get(b.chapterId) ?? Number.MAX_SAFE_INTEGER;
      return chapterA - chapterB;
    });
}

export function entityHistoryForChapter(
  bundle: ProjectBundle,
  chapterId: string
): EntityHistoryEntry[] {
  return bundle.entityHistory
    .filter((entry) => entry.chapterId === chapterId)
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function chapterTrackerReportsForChapter(
  bundle: ProjectBundle,
  chapterId: string
): ChapterTrackerReport[] {
  const order: ChapterTrackerType[] = [
    "characters",
    "locations",
    "lore",
    "timelines",
    "relationships",
    "progressions",
  ];

  return bundle.chapterTrackerReports
    .filter((report) => report.chapterId === chapterId)
    .slice()
    .sort((a, b) => order.indexOf(a.trackerType) - order.indexOf(b.trackerType));
}

export async function exportProjectAsJson(projectId: string): Promise<string> {
  const bundle = await getProjectBundle(projectId);
  if (!bundle) throw new Error("Project not found");
  return JSON.stringify(bundle, null, 2);
}

export async function exportProjectAsMarkdown(projectId: string): Promise<string> {
  const bundle = await getProjectBundle(projectId);
  if (!bundle) throw new Error("Project not found");

  const chapterSections = bundle.chapters
    .map((chapter) => {
      const chapterScenes = bundle.scenes.filter((scene) => scene.chapterId === chapter.id);
      return [
        `## Chapter ${chapter.number}: ${chapter.title}`,
        "",
        `Summary: ${chapter.summary}`,
        "",
        chapter.content || "",
        "",
        "### Scenes",
        ...chapterScenes.map((scene) => `- ${scene.order}. ${scene.title}: ${scene.description}`),
      ].join("\n");
    })
    .join("\n\n");

  return [
    `# ${bundle.project.title}`,
    "",
    `Genre: ${bundle.project.genre}`,
    `Audience: ${bundle.project.audience}`,
    `Tone: ${bundle.project.tone}`,
    "",
    "## Synopsis",
    bundle.project.synopsis,
    "",
    "## Story Bible",
    `Premise: ${bundle.bible.premise}`,
    `Themes: ${bundle.bible.themes.join(", ")}`,
    `Stakes: ${bundle.bible.stakes}`,
    `World Rules: ${bundle.bible.worldRules}`,
    "",
    chapterSections,
  ].join("\n");
}

export async function exportProjectBackup(projectId: string): Promise<Blob> {
  const bundle = await getProjectBundle(projectId);
  if (!bundle) {
    throw new Error("Project not found");
  }

  const json = JSON.stringify(bundle, null, 2);
  const checksum = simpleChecksum(json);
  const manifest = {
    format: "ai-novel-architect-backup",
    version: 1,
    projectId,
    checksum,
    exportedAt: now(),
  };

  const zip = new JSZip();
  zip.file("project.json", json);
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: "blob" });
}

function parseImportedJson(raw: string): ProjectBundle {
  const parsed = JSON.parse(raw) as unknown;
  const bundle = parsed as ProjectBundle;
  if (!bundle?.project?.id || !Array.isArray(bundle.chapters)) {
    throw new Error("Invalid project JSON format");
  }
  bundle.chapterTrackerReports = Array.isArray(bundle.chapterTrackerReports)
    ? bundle.chapterTrackerReports
    : [];
  bundle.entityHistory = Array.isArray(bundle.entityHistory) ? bundle.entityHistory : [];
  bundle.canonDeltas = Array.isArray(bundle.canonDeltas) ? bundle.canonDeltas : [];
  bundle.writingSessions = Array.isArray(bundle.writingSessions) ? bundle.writingSessions : [];
  return bundle;
}

export async function importProjectFromText(input: {
  filename: string;
  content: string;
}): Promise<ProjectBundle> {
  const file = input.filename.toLowerCase();

  if (file.endsWith(".json")) {
    const bundle = parseImportedJson(input.content);
    return importProjectBundle(bundle, true);
  }

  const titleFallback = input.filename.replace(/\.[^.]+$/, "") || "Imported Project";

  if (file.endsWith(".md") || file.endsWith(".markdown")) {
    const firstHeading = input.content.match(/^#\s+(.+)$/m)?.[1] ?? titleFallback;
    const bundle = await createProjectFromInput({
      title: firstHeading,
      genre: "General",
      audience: "Adult",
      tone: "Balanced",
      targetWordCount: 80000,
      language: "fr",
      synopsis: input.content.slice(0, 480),
      mode: "import",
      chapterCount: 1,
    });

    const chapter = bundle.chapters[0];
    if (chapter) {
      await saveChapter({ ...chapter, content: input.content, summary: "Imported from Markdown" });
      bundle.chapters = [(await getProjectBundle(bundle.project.id))?.chapters[0] ?? chapter];
    }

    return (await getProjectBundle(bundle.project.id)) ?? bundle;
  }

  if (file.endsWith(".txt")) {
    const preview = input.content.trim().slice(0, 80) || titleFallback;
    const bundle = await createProjectFromInput({
      title: titleFallback,
      genre: "General",
      audience: "Adult",
      tone: "Balanced",
      targetWordCount: 80000,
      language: "fr",
      synopsis: preview,
      mode: "import",
      chapterCount: 1,
    });

    const chapter = bundle.chapters[0];
    if (chapter) {
      await saveChapter({ ...chapter, content: input.content, summary: "Imported from plain text" });
    }

    return (await getProjectBundle(bundle.project.id)) ?? bundle;
  }

  throw new Error("Unsupported import format. Supported: JSON, Markdown, TXT.");
}

export async function importProjectBackup(file: File): Promise<ProjectBundle> {
  const zip = await JSZip.loadAsync(file);
  const [manifestRaw, projectRaw] = await Promise.all([
    zip.file("manifest.json")?.async("string"),
    zip.file("project.json")?.async("string"),
  ]);

  if (!manifestRaw || !projectRaw) {
    throw new Error("Invalid backup archive");
  }

  const manifest = JSON.parse(manifestRaw) as { checksum?: string };
  const checksum = simpleChecksum(projectRaw);
  if (manifest.checksum !== checksum) {
    throw new Error("Backup checksum mismatch");
  }

  return importProjectBundle(parseImportedJson(projectRaw), true);
}

export async function insertProjectBundle(bundle: ProjectBundle): Promise<void> {
  const db = getDb();
  await db.transaction(
    "rw",
    [
      db.projects,
      db.manuscripts,
      db.chapters,
      db.scenes,
      db.bibles,
      db.characters,
      db.locations,
      db.loreEntries,
      db.timelineEvents,
      db.narrativeRelationships,
      db.entityProgression,
      db.entityHistory,
      db.revisionIssues,
      db.checklistItems,
      db.annotations,
      db.writingGoals,
      db.snapshots,
      db.aiActions,
      db.chapterTrackerReports,
      db.canonDeltas,
      db.writingSessions,
    ],
    async () => {
      await db.projects.put(bundle.project);
      await db.manuscripts.put(bundle.manuscript);
      if (bundle.chapters.length > 0) await db.chapters.bulkPut(bundle.chapters);
      if (bundle.scenes.length > 0) await db.scenes.bulkPut(bundle.scenes);
      await db.bibles.put(bundle.bible);
      if (bundle.characters.length > 0) await db.characters.bulkPut(bundle.characters);
      if (bundle.locations.length > 0) await db.locations.bulkPut(bundle.locations);
      if (bundle.loreEntries.length > 0) await db.loreEntries.bulkPut(bundle.loreEntries);
      if (bundle.timeline.length > 0) await db.timelineEvents.bulkPut(bundle.timeline);
      if (bundle.relationships.length > 0) {
        await db.narrativeRelationships.bulkPut(bundle.relationships);
      }
      if (bundle.entityProgression.length > 0) {
        await db.entityProgression.bulkPut(bundle.entityProgression);
      }
      if (bundle.entityHistory.length > 0) {
        await db.entityHistory.bulkPut(bundle.entityHistory);
      }
      if (bundle.revisionIssues.length > 0) await db.revisionIssues.bulkPut(bundle.revisionIssues);
      if (bundle.checklist.length > 0) await db.checklistItems.bulkPut(bundle.checklist);
      if (bundle.annotations.length > 0) await db.annotations.bulkPut(bundle.annotations);
      await db.writingGoals.put(bundle.goal);
      if (bundle.snapshots.length > 0) await db.snapshots.bulkPut(bundle.snapshots);
      if (bundle.aiActions.length > 0) await db.aiActions.bulkPut(bundle.aiActions);
      if (bundle.chapterTrackerReports.length > 0) {
        await db.chapterTrackerReports.bulkPut(bundle.chapterTrackerReports);
      }
      if (bundle.canonDeltas?.length > 0) await db.canonDeltas.bulkPut(bundle.canonDeltas);
      if (bundle.writingSessions?.length > 0) {
        await db.writingSessions.bulkPut(bundle.writingSessions);
      }
    }
  );
}

export async function importProjectBundle(bundle: ProjectBundle, regenerateIds: boolean): Promise<ProjectBundle> {
  if (!regenerateIds) {
    await insertProjectBundle(bundle);
    return bundle;
  }

  const cloned = clone(bundle);
  const newProjectId = createId("project");
  const timestamp = now();

  const project: Project = {
    ...cloned.project,
    id: newProjectId,
    title: cloned.project.title,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "active",
  };

  const chapterIdMap = new Map<string, string>();
  const entityIdMap = new Map<string, string>();

  const chapters = cloned.chapters
    .sort((a, b) => a.number - b.number)
    .map((chapter) => {
      const id = createId("chapter");
      chapterIdMap.set(chapter.id, id);
      return {
        ...chapter,
        id,
        projectId: newProjectId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    });

  const importedBundle: ProjectBundle = {
    project,
    manuscript: {
      ...cloned.manuscript,
      projectId: newProjectId,
      updatedAt: timestamp,
    },
    chapters,
    scenes: cloned.scenes.map((scene) => ({
      ...scene,
      id: createId("scene"),
      projectId: newProjectId,
      chapterId: chapterIdMap.get(scene.chapterId) ?? scene.chapterId,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    bible: {
      ...cloned.bible,
      id: createId("bible"),
      projectId: newProjectId,
      updatedAt: timestamp,
    },
    characters: cloned.characters.map((character) => ({
      ...character,
      id: createId("char"),
      projectId: newProjectId,
      updatedAt: timestamp,
    })),
    locations: cloned.locations.map((location) => ({
      ...location,
      id: createId("location"),
      projectId: newProjectId,
      updatedAt: timestamp,
    })),
    loreEntries: cloned.loreEntries.map((entry) => ({
      ...entry,
      id: createId("lore"),
      projectId: newProjectId,
      updatedAt: timestamp,
    })),
    timeline: cloned.timeline.map((event) => ({
      ...event,
      id: createId("timeline"),
      projectId: newProjectId,
      chapterId: event.chapterId ? chapterIdMap.get(event.chapterId) ?? event.chapterId : undefined,
      updatedAt: timestamp,
    })),
    relationships: [],
    entityProgression: [],
    entityHistory: [],
    revisionIssues: cloned.revisionIssues.map((issue) => ({
      ...issue,
      id: createId("issue"),
      projectId: newProjectId,
      chapterId: issue.chapterId ? chapterIdMap.get(issue.chapterId) ?? issue.chapterId : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    checklist: cloned.checklist.map((item) => ({
      ...item,
      id: createId("chk"),
      projectId: newProjectId,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    annotations: cloned.annotations.map((annotation) => ({
      ...annotation,
      id: createId("anno"),
      projectId: newProjectId,
      chapterId: chapterIdMap.get(annotation.chapterId) ?? annotation.chapterId,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    goal: {
      ...cloned.goal,
      id: createId("goal"),
      projectId: newProjectId,
      updatedAt: timestamp,
    },
    snapshots: [],
    aiActions: [],
    writingSessions: [],
    canonDeltas: [],
    chapterTrackerReports: (cloned.chapterTrackerReports ?? []).map((report) => ({
      ...report,
      id: createId("chapter-tracker"),
      projectId: newProjectId,
      chapterId: chapterIdMap.get(report.chapterId) ?? report.chapterId,
      updatedAt: timestamp,
    })),
  };

  cloned.characters.forEach((character, index) => {
    entityIdMap.set(`character:${character.id}`, importedBundle.characters[index].id);
  });
  cloned.locations.forEach((location, index) => {
    entityIdMap.set(`location:${location.id}`, importedBundle.locations[index].id);
  });
  cloned.loreEntries.forEach((entry, index) => {
    entityIdMap.set(`lore:${entry.id}`, importedBundle.loreEntries[index].id);
  });
  cloned.timeline.forEach((event, index) => {
    entityIdMap.set(`timeline_event:${event.id}`, importedBundle.timeline[index].id);
  });

  importedBundle.relationships = cloned.relationships.map((relationship) => ({
    ...relationship,
    id: createId("relation"),
    projectId: newProjectId,
    sourceId:
      entityIdMap.get(`${relationship.sourceType}:${relationship.sourceId}`) ??
      relationship.sourceId,
    targetId:
      entityIdMap.get(`${relationship.targetType}:${relationship.targetId}`) ??
      relationship.targetId,
    updatedAt: timestamp,
  }));

  importedBundle.entityProgression = cloned.entityProgression.map((entry) => ({
    ...entry,
    id: createId("progress"),
    projectId: newProjectId,
    chapterId: entry.chapterId ? chapterIdMap.get(entry.chapterId) ?? entry.chapterId : undefined,
    entityId: entityIdMap.get(`${entry.entityType}:${entry.entityId}`) ?? entry.entityId,
    updatedAt: timestamp,
  }));

  cloned.relationships.forEach((relationship, index) => {
    entityIdMap.set(`relationship:${relationship.id}`, importedBundle.relationships[index].id);
  });

  importedBundle.entityHistory = (cloned.entityHistory ?? []).map((entry) => ({
    ...entry,
    id: createId("entity-history"),
    projectId: newProjectId,
    chapterId: chapterIdMap.get(entry.chapterId) ?? entry.chapterId,
    entityId:
      entry.entityType === "relationship"
        ? entityIdMap.get(`relationship:${entry.entityId}`) ?? entry.entityId
        : entityIdMap.get(`${entry.entityType}:${entry.entityId}`) ?? entry.entityId,
    updatedAt: timestamp,
  }));

  importedBundle.canonDeltas = (cloned.canonDeltas ?? []).map((delta) => ({
    ...delta,
    id: createId("delta"),
    projectId: newProjectId,
    chapterId: delta.chapterId ? chapterIdMap.get(delta.chapterId) ?? delta.chapterId : undefined,
    entityId:
      delta.entityType === "chapter"
        ? chapterIdMap.get(delta.entityId) ?? delta.entityId
        : delta.entityType === "relationship"
          ? entityIdMap.get(`relationship:${delta.entityId}`) ?? delta.entityId
          : entityIdMap.get(`${delta.entityType}:${delta.entityId}`) ?? delta.entityId,
    updatedAt: timestamp,
  }));

  await insertProjectBundle(importedBundle);
  return importedBundle;
}

export function checklistCompletion(checklist: ChecklistItem[], scope?: ChecklistItem["scope"]): number {
  const filtered = scope ? checklist.filter((item) => item.scope === scope) : checklist;
  if (filtered.length === 0) return 100;
  const done = filtered.filter((item) => item.done).length;
  return Math.round((done / filtered.length) * 100);
}

export function computeChapterQualityScore(chapter: Chapter, weights: AppSettings["qa"]["rubricWeights"]): number {
  const summary = chapter.summary.trim();
  const storySoFar = chapter.storySoFar.trim();
  const hook = chapter.hook.trim();
  const content = plainText(chapter.content);

  if (!summary && !storySoFar && !hook && !content) {
    return 0;
  }

  const structure = summary ? 8 : 0;
  const character = storySoFar ? 7 : 0;
  const pacing = hook ? 8 : 0;
  const style = content ? 7 : 0;

  const weighted =
    structure * (weights.structure / 100) +
    character * (weights.character / 100) +
    pacing * (weights.pacing / 100) +
    style * (weights.style / 100);

  return Math.round(weighted * 10) / 10;
}

export function buildGrammarSuggestions(text: string): string[] {
  const normalized = plainText(text);
  const suggestions: string[] = [];
  if (!normalized) return suggestions;
  if (/\s{2,}/.test(normalized)) suggestions.push("Replace repeated spaces with single spaces.");
  if (/\bvery\s+very\b/i.test(normalized)) suggestions.push("Avoid duplicated intensifiers for cleaner prose.");
  if (/\b(he|she|they)\s+was\s+like\b/i.test(normalized)) suggestions.push("Consider replacing filler constructions like 'was like'.");
  if (!/[.!?]$/.test(normalized)) suggestions.push("Close the passage with terminal punctuation.");
  return suggestions;
}
