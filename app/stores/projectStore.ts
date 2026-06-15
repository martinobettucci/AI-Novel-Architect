"use client";

import { create } from "zustand";
import type {
  Annotation,
  CanonDelta,
  Chapter,
  ChapterTrackerReport,
  CharacterProfile,
  ChecklistItem,
  EntityHistoryEntry,
  EntityProgression,
  LocationProfile,
  LoreEntryRecord,
  Locale,
  NarrativeRelationship,
  Project,
  ProjectBundle,
  RevisionIssue,
  Scene,
  StoryBible,
  TimelineEvent,
  WritingGoal,
} from "@/app/domain/models";
import {
  addChapter,
  addScene,
  approveCanonDelta as approveCanonDeltaRecord,
  archiveProject,
  createProjectFromInput,
  deleteCanonDelta as deleteCanonDeltaRecord,
  rejectCanonDelta as rejectCanonDeltaRecord,
  saveCanonDelta as saveCanonDeltaRecord,
  createRevisionIssue,
  createSnapshot,
  deleteAnnotation,
  deleteChapter,
  deleteCharacterProfile,
  deleteChecklistItem,
  deleteEntityProgression,
  deleteEntityHistoryEntry as deleteEntityHistoryEntryRecord,
  deleteLocationProfile,
  deleteLoreEntry,
  deleteNarrativeRelationship,
  deleteProject,
  deleteRevisionIssue,
  deleteScene,
  deleteTimelineEvent,
  duplicateProject,
  exportProjectAsJson,
  exportProjectAsMarkdown,
  exportProjectBackup,
  getProjectBundle,
  getProjectById,
  importProjectBackup,
  importProjectFromText,
  listProjects,
  reorderChapter,
  reorderScene,
  replaceEntityHistoryForChapter as replaceEntityHistoryEntriesForChapter,
  restoreSnapshot,
  saveAnnotation,
  saveChapter,
  saveChapterTrackerReport,
  saveCharacterProfile,
  saveChecklistItem,
  saveEntityProgression,
  saveEntityHistoryEntry as saveEntityHistoryEntryRecord,
  saveLocationProfile,
  saveLoreEntry,
  saveManuscript,
  saveNarrativeRelationship,
  saveScene,
  saveStoryBible,
  saveTimelineEvent,
  saveWritingGoal,
  toggleChecklistItem,
  updateProjectMeta,
  updateRevisionIssueStatus,
  wordCount,
} from "@/app/lib/repository";

interface ProjectState {
  projects: Project[];
  activeProject: ProjectBundle | null;
  loading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
  openProject: (projectId: string) => Promise<void>;
  createProject: (input: {
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
  }) => Promise<ProjectBundle>;
  duplicateActiveProject: () => Promise<ProjectBundle | null>;
  archiveProjectById: (projectId: string, status: Project["status"]) => Promise<void>;
  deleteProjectById: (projectId: string) => Promise<void>;
  importProjectFile: (filename: string, content: string) => Promise<ProjectBundle>;
  importBackupFile: (file: File) => Promise<ProjectBundle>;
  exportActiveProjectJson: () => Promise<string | null>;
  exportActiveProjectMarkdown: () => Promise<string | null>;
  exportActiveProjectBackup: () => Promise<Blob | null>;
  saveProjectMeta: (patch: Partial<Project>) => Promise<void>;
  saveStoryBible: (bible: StoryBible) => Promise<void>;
  saveChapter: (chapter: Chapter) => Promise<void>;
  saveChapterTrackerReport: (report: ChapterTrackerReport) => Promise<void>;
  addChapter: () => Promise<void>;
  deleteChapter: (chapterId: string) => Promise<void>;
  reorderChapter: (fromNumber: number, toNumber: number) => Promise<void>;
  saveScene: (scene: Scene) => Promise<void>;
  addScene: (chapterId: string) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  reorderScene: (chapterId: string, fromOrder: number, toOrder: number) => Promise<void>;
  saveCharacter: (profile: CharacterProfile) => Promise<void>;
  deleteCharacter: (characterId: string) => Promise<void>;
  saveLocation: (profile: LocationProfile) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;
  saveLoreEntry: (entry: LoreEntryRecord) => Promise<void>;
  deleteLoreEntry: (entryId: string) => Promise<void>;
  saveTimelineEvent: (event: TimelineEvent) => Promise<void>;
  deleteTimelineEvent: (eventId: string) => Promise<void>;
  saveRelationship: (relationship: NarrativeRelationship) => Promise<void>;
  deleteRelationship: (relationshipId: string) => Promise<void>;
  saveEntityProgression: (entry: EntityProgression) => Promise<void>;
  deleteEntityProgression: (entryId: string) => Promise<void>;
  saveEntityHistoryEntry: (entry: EntityHistoryEntry) => Promise<void>;
  deleteEntityHistoryEntry: (entryId: string) => Promise<void>;
  replaceEntityHistoryForChapter: (
    chapterId: string,
    entries: EntityHistoryEntry[]
  ) => Promise<void>;
  createRevisionIssue: (input: {
    chapterId?: string;
    title: string;
    description: string;
    severity: RevisionIssue["severity"];
  }) => Promise<void>;
  updateRevisionIssueStatus: (issueId: string, status: RevisionIssue["status"]) => Promise<void>;
  deleteRevisionIssue: (issueId: string) => Promise<void>;
  saveChecklistItem: (item: ChecklistItem) => Promise<void>;
  toggleChecklistItem: (itemId: string, done: boolean) => Promise<void>;
  deleteChecklistItem: (itemId: string) => Promise<void>;
  saveAnnotation: (annotation: Annotation) => Promise<void>;
  deleteAnnotation: (annotationId: string) => Promise<void>;
  saveGoal: (goal: WritingGoal) => Promise<void>;
  saveDelta: (delta: CanonDelta) => Promise<void>;
  approveDelta: (deltaId: string) => Promise<void>;
  rejectDelta: (deltaId: string) => Promise<void>;
  deleteDelta: (deltaId: string) => Promise<void>;
  saveManuscriptTitle: (title: string, subtitle: string, premise: string) => Promise<void>;
  createSnapshot: (label: string, chapterId?: string, payload?: string) => Promise<void>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
}

type SetState = (partial: Partial<ProjectState>) => void;
type GetState = () => ProjectState;

/** Bundle keys holding entity lists that support generic optimistic upserts. */
type BundleListKey =
  | "chapters"
  | "scenes"
  | "characters"
  | "locations"
  | "loreEntries"
  | "timeline"
  | "relationships"
  | "entityProgression"
  | "entityHistory"
  | "revisionIssues"
  | "checklist"
  | "annotations"
  | "chapterTrackerReports"
  | "canonDeltas";

interface ListItem {
  id: string;
  projectId: string;
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index === -1) return [...list, item];
  const next = list.slice();
  next[index] = item;
  return next;
}

async function refreshActive(set: SetState, projectId: string) {
  const bundle = await getProjectBundle(projectId);
  if (!bundle) {
    set({ activeProject: null });
    return;
  }
  set({ activeProject: bundle });
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Run a repository mutation, surfacing failures in `error` and reloading the
 * canonical state so an optimistic update never silently diverges from disk.
 */
async function persist(set: SetState, get: GetState, write: () => Promise<unknown>) {
  try {
    await write();
  } catch (err) {
    set({ error: errorMessage(err, "Failed to save changes") });
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  }
}

/** Run a repository mutation, then reload the whole bundle (structural changes). */
async function persistAndRefresh(set: SetState, get: GetState, write: () => Promise<unknown>) {
  try {
    await write();
    set({ error: null });
  } catch (err) {
    set({ error: errorMessage(err, "Failed to save changes") });
  }
  const active = get().activeProject;
  if (active) await refreshActive(set, active.project.id);
}

/**
 * Optimistically upsert `item` into the active bundle list before persisting,
 * so text inputs stay responsive (no full-bundle reload per keystroke). Items
 * without an id yet are persisted first, then inserted with their real id.
 */
async function saveListItem<T extends ListItem>(
  set: SetState,
  get: GetState,
  key: BundleListKey,
  item: T,
  write: () => Promise<T | void>
): Promise<void> {
  const active = get().activeProject;
  const optimistic = Boolean(item.id && active && active.project.id === item.projectId);

  if (optimistic && active) {
    set({
      activeProject: {
        ...active,
        [key]: upsertById(active[key] as Array<{ id: string }>, item),
      } as ProjectBundle,
      error: null,
    });
    await persist(set, get, write);
    return;
  }

  try {
    const saved = await write();
    set({ error: null });
    const current = get().activeProject;
    if (saved && current && current.project.id === saved.projectId) {
      set({
        activeProject: {
          ...current,
          [key]: upsertById(current[key] as Array<{ id: string }>, saved),
        } as ProjectBundle,
      });
    }
  } catch (err) {
    set({ error: errorMessage(err, "Failed to save changes") });
  }
}

/** Optimistically remove an item from a bundle list before persisting the delete. */
async function deleteListItem(
  set: SetState,
  get: GetState,
  key: BundleListKey,
  itemId: string,
  write: () => Promise<void>
): Promise<void> {
  const active = get().activeProject;
  if (active) {
    set({
      activeProject: {
        ...active,
        [key]: (active[key] as Array<{ id: string }>).filter((entry) => entry.id !== itemId),
      } as ProjectBundle,
      error: null,
    });
  }
  await persist(set, get, write);
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  loading: false,
  error: null,
  refreshProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await listProjects();
      set({ projects, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: errorMessage(err, "Failed to load projects"),
      });
    }
  },
  openProject: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const bundle = await getProjectBundle(projectId);
      if (!bundle) {
        set({ loading: false, activeProject: null, error: "Project not found" });
        return;
      }
      set({ activeProject: bundle, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: errorMessage(err, "Failed to open project"),
      });
    }
  },
  createProject: async (input) => {
    const bundle = await createProjectFromInput(input);
    const projects = await listProjects();
    set({ projects, activeProject: bundle });
    return bundle;
  },
  duplicateActiveProject: async () => {
    const active = get().activeProject;
    if (!active) return null;
    const duplicated = await duplicateProject(active.project.id);
    if (!duplicated) return null;
    const projects = await listProjects();
    set({ projects, activeProject: duplicated });
    return duplicated;
  },
  archiveProjectById: async (projectId, status) => {
    await archiveProject(projectId, status);
    const projects = await listProjects();
    const active = get().activeProject;
    set({
      projects,
      activeProject:
        active && active.project.id === projectId
          ? {
              ...active,
              project: {
                ...active.project,
                status,
              },
            }
          : active,
    });
  },
  deleteProjectById: async (projectId) => {
    await deleteProject(projectId);
    const projects = await listProjects();
    const active = get().activeProject;
    set({
      projects,
      activeProject: active?.project.id === projectId ? null : active,
    });
  },
  importProjectFile: async (filename, content) => {
    const bundle = await importProjectFromText({ filename, content });
    const projects = await listProjects();
    set({ projects, activeProject: bundle });
    return bundle;
  },
  importBackupFile: async (file) => {
    const bundle = await importProjectBackup(file);
    const projects = await listProjects();
    set({ projects, activeProject: bundle });
    return bundle;
  },
  exportActiveProjectJson: async () => {
    const active = get().activeProject;
    if (!active) return null;
    return exportProjectAsJson(active.project.id);
  },
  exportActiveProjectMarkdown: async () => {
    const active = get().activeProject;
    if (!active) return null;
    return exportProjectAsMarkdown(active.project.id);
  },
  exportActiveProjectBackup: async () => {
    const active = get().activeProject;
    if (!active) return null;
    return exportProjectBackup(active.project.id);
  },
  saveProjectMeta: async (patch) => {
    const active = get().activeProject;
    if (!active) return;
    const project = { ...active.project, ...patch };
    set({
      activeProject: { ...active, project },
      projects: get().projects.map((item) => (item.id === project.id ? project : item)),
      error: null,
    });
    await persist(set, get, () => updateProjectMeta(project.id, patch));
  },
  saveStoryBible: async (bible) => {
    const active = get().activeProject;
    if (active && active.project.id === bible.projectId) {
      set({ activeProject: { ...active, bible }, error: null });
    }
    await persist(set, get, () => saveStoryBible(bible));
  },
  saveChapter: async (chapter) => {
    const withCount = { ...chapter, wordCountCurrent: wordCount(chapter.content) };
    await saveListItem(set, get, "chapters", withCount, () => saveChapter(chapter));
  },
  saveChapterTrackerReport: async (report) => {
    await saveListItem(set, get, "chapterTrackerReports", report, () =>
      saveChapterTrackerReport(report)
    );
  },
  addChapter: async () => {
    const active = get().activeProject;
    if (!active) return;
    try {
      const chapter = await addChapter(active.project.id);
      const current = get().activeProject;
      if (current && current.project.id === chapter.projectId) {
        set({
          activeProject: { ...current, chapters: upsertById(current.chapters, chapter) },
          error: null,
        });
      }
    } catch (err) {
      set({ error: errorMessage(err, "Failed to add chapter") });
    }
  },
  deleteChapter: async (chapterId) => {
    await persistAndRefresh(set, get, () => deleteChapter(chapterId));
  },
  reorderChapter: async (fromNumber, toNumber) => {
    const active = get().activeProject;
    if (!active) return;
    await persistAndRefresh(set, get, () =>
      reorderChapter(active.project.id, fromNumber, toNumber)
    );
  },
  saveScene: async (scene) => {
    await saveListItem(set, get, "scenes", scene, () => saveScene(scene));
  },
  addScene: async (chapterId) => {
    const active = get().activeProject;
    if (!active) return;
    try {
      const scene = await addScene(active.project.id, chapterId);
      const current = get().activeProject;
      if (current && current.project.id === scene.projectId) {
        set({
          activeProject: { ...current, scenes: upsertById(current.scenes, scene) },
          error: null,
        });
      }
    } catch (err) {
      set({ error: errorMessage(err, "Failed to add scene") });
    }
  },
  deleteScene: async (sceneId) => {
    await persistAndRefresh(set, get, () => deleteScene(sceneId));
  },
  reorderScene: async (chapterId, fromOrder, toOrder) => {
    await persistAndRefresh(set, get, () => reorderScene(chapterId, fromOrder, toOrder));
  },
  saveCharacter: async (profile) => {
    await saveListItem(set, get, "characters", profile, () => saveCharacterProfile(profile));
  },
  deleteCharacter: async (characterId) => {
    await persistAndRefresh(set, get, () => deleteCharacterProfile(characterId));
  },
  saveLocation: async (profile) => {
    await saveListItem(set, get, "locations", profile, () => saveLocationProfile(profile));
  },
  deleteLocation: async (locationId) => {
    await persistAndRefresh(set, get, () => deleteLocationProfile(locationId));
  },
  saveLoreEntry: async (entry) => {
    await saveListItem(set, get, "loreEntries", entry, () => saveLoreEntry(entry));
  },
  deleteLoreEntry: async (entryId) => {
    await persistAndRefresh(set, get, () => deleteLoreEntry(entryId));
  },
  saveTimelineEvent: async (event) => {
    await saveListItem(set, get, "timeline", event, () => saveTimelineEvent(event));
  },
  deleteTimelineEvent: async (eventId) => {
    await persistAndRefresh(set, get, () => deleteTimelineEvent(eventId));
  },
  saveRelationship: async (relationship) => {
    await saveListItem(set, get, "relationships", relationship, () =>
      saveNarrativeRelationship(relationship)
    );
  },
  deleteRelationship: async (relationshipId) => {
    await deleteListItem(set, get, "relationships", relationshipId, () =>
      deleteNarrativeRelationship(relationshipId)
    );
  },
  saveEntityProgression: async (entry) => {
    await saveListItem(set, get, "entityProgression", entry, () => saveEntityProgression(entry));
  },
  deleteEntityProgression: async (entryId) => {
    await deleteListItem(set, get, "entityProgression", entryId, () =>
      deleteEntityProgression(entryId)
    );
  },
  saveEntityHistoryEntry: async (entry) => {
    await saveListItem(set, get, "entityHistory", entry, () =>
      saveEntityHistoryEntryRecord(entry)
    );
  },
  deleteEntityHistoryEntry: async (entryId) => {
    await deleteListItem(set, get, "entityHistory", entryId, () =>
      deleteEntityHistoryEntryRecord(entryId)
    );
  },
  replaceEntityHistoryForChapter: async (chapterId, entries) => {
    const active = get().activeProject;
    if (!active) return;
    await persistAndRefresh(set, get, () =>
      replaceEntityHistoryEntriesForChapter(active.project.id, chapterId, entries)
    );
  },
  createRevisionIssue: async (input) => {
    const active = get().activeProject;
    if (!active) return;
    try {
      const issue = await createRevisionIssue({
        projectId: active.project.id,
        chapterId: input.chapterId,
        title: input.title,
        description: input.description,
        severity: input.severity,
      });
      const current = get().activeProject;
      if (current && current.project.id === issue.projectId) {
        set({
          activeProject: {
            ...current,
            revisionIssues: upsertById(current.revisionIssues, issue),
          },
          error: null,
        });
      }
    } catch (err) {
      set({ error: errorMessage(err, "Failed to create issue") });
    }
  },
  updateRevisionIssueStatus: async (issueId, status) => {
    const active = get().activeProject;
    if (active) {
      set({
        activeProject: {
          ...active,
          revisionIssues: active.revisionIssues.map((issue) =>
            issue.id === issueId ? { ...issue, status } : issue
          ),
        },
        error: null,
      });
    }
    await persist(set, get, () => updateRevisionIssueStatus(issueId, status));
  },
  deleteRevisionIssue: async (issueId) => {
    await deleteListItem(set, get, "revisionIssues", issueId, () => deleteRevisionIssue(issueId));
  },
  saveChecklistItem: async (item) => {
    await saveListItem(set, get, "checklist", item, () => saveChecklistItem(item));
  },
  toggleChecklistItem: async (itemId, done) => {
    const active = get().activeProject;
    if (active) {
      set({
        activeProject: {
          ...active,
          checklist: active.checklist.map((item) =>
            item.id === itemId ? { ...item, done } : item
          ),
        },
        error: null,
      });
    }
    await persist(set, get, () => toggleChecklistItem(itemId, done));
  },
  deleteChecklistItem: async (itemId) => {
    await deleteListItem(set, get, "checklist", itemId, () => deleteChecklistItem(itemId));
  },
  saveAnnotation: async (annotation) => {
    await saveListItem(set, get, "annotations", annotation, () => saveAnnotation(annotation));
  },
  deleteAnnotation: async (annotationId) => {
    await deleteListItem(set, get, "annotations", annotationId, () =>
      deleteAnnotation(annotationId)
    );
  },
  saveGoal: async (goal) => {
    const active = get().activeProject;
    if (active && active.project.id === goal.projectId) {
      set({ activeProject: { ...active, goal }, error: null });
    }
    await persist(set, get, () => saveWritingGoal(goal));
  },
  saveDelta: async (delta) => {
    await saveListItem(set, get, "canonDeltas", delta, () => saveCanonDeltaRecord(delta));
  },
  approveDelta: async (deltaId) => {
    // Approval mutates canon entities, so reload the whole bundle.
    await persistAndRefresh(set, get, () => approveCanonDeltaRecord(deltaId));
  },
  rejectDelta: async (deltaId) => {
    const active = get().activeProject;
    if (active) {
      set({
        activeProject: {
          ...active,
          canonDeltas: active.canonDeltas.map((delta) =>
            delta.id === deltaId ? { ...delta, status: "rejected" } : delta
          ),
        },
        error: null,
      });
    }
    await persist(set, get, () => rejectCanonDeltaRecord(deltaId));
  },
  deleteDelta: async (deltaId) => {
    await deleteListItem(set, get, "canonDeltas", deltaId, () => deleteCanonDeltaRecord(deltaId));
  },
  saveManuscriptTitle: async (title, subtitle, premise) => {
    const active = get().activeProject;
    if (!active) return;
    const manuscript = {
      ...active.manuscript,
      manuscriptTitle: title,
      subtitle,
      premise,
    };
    set({ activeProject: { ...active, manuscript }, error: null });
    await persist(set, get, () => saveManuscript(manuscript));
  },
  createSnapshot: async (label, chapterId, payload) => {
    const active = get().activeProject;
    if (!active) return;
    try {
      const snapshot = await createSnapshot({
        projectId: active.project.id,
        chapterId,
        label,
        payload: payload ?? "",
      });
      const current = get().activeProject;
      if (current && current.project.id === snapshot.projectId) {
        set({
          activeProject: {
            ...current,
            snapshots: upsertById(current.snapshots, snapshot),
          },
          error: null,
        });
      }
    } catch (err) {
      set({ error: errorMessage(err, "Failed to create snapshot") });
    }
  },
  restoreSnapshot: async (snapshotId) => {
    const snapshot = await restoreSnapshot(snapshotId);
    if (!snapshot) return;
    await refreshActive(set, snapshot.projectId);
  },
}));

export async function projectExists(projectId: string): Promise<boolean> {
  const project = await getProjectById(projectId);
  return Boolean(project);
}
