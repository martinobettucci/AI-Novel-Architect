"use client";

import { create } from "zustand";
import type {
  Annotation,
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
import type { StarterTemplateId } from "@/app/lib/projectIntake";
import {
  addChapter,
  addScene,
  archiveProject,
  createProjectFromInput,
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
  saveChapters,
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
    templateId?: StarterTemplateId;
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
  saveChapters: (chapters: Chapter[]) => Promise<void>;
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
  saveManuscriptTitle: (title: string, subtitle: string, premise: string) => Promise<void>;
  createSnapshot: (label: string, chapterId?: string, payload?: string) => Promise<void>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
}

async function refreshActive(set: (partial: Partial<ProjectState>) => void, projectId: string) {
  const bundle = await getProjectBundle(projectId);
  if (!bundle) {
    set({ activeProject: null });
    return;
  }
  set({ activeProject: bundle });
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
        error: err instanceof Error ? err.message : "Failed to load projects",
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
        error: err instanceof Error ? err.message : "Failed to open project",
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
    await updateProjectMeta(active.project.id, patch);
    await refreshActive(set, active.project.id);
    const projects = await listProjects();
    set({ projects });
  },
  saveStoryBible: async (bible) => {
    await saveStoryBible(bible);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveChapter: async (chapter) => {
    await saveChapter(chapter);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveChapters: async (chapters) => {
    await saveChapters(chapters);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveChapterTrackerReport: async (report) => {
    await saveChapterTrackerReport(report);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  addChapter: async () => {
    const active = get().activeProject;
    if (!active) return;
    await addChapter(active.project.id);
    await refreshActive(set, active.project.id);
  },
  deleteChapter: async (chapterId) => {
    await deleteChapter(chapterId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  reorderChapter: async (fromNumber, toNumber) => {
    const active = get().activeProject;
    if (!active) return;
    await reorderChapter(active.project.id, fromNumber, toNumber);
    await refreshActive(set, active.project.id);
  },
  saveScene: async (scene) => {
    await saveScene(scene);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  addScene: async (chapterId) => {
    const active = get().activeProject;
    if (!active) return;
    await addScene(active.project.id, chapterId);
    await refreshActive(set, active.project.id);
  },
  deleteScene: async (sceneId) => {
    await deleteScene(sceneId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  reorderScene: async (chapterId, fromOrder, toOrder) => {
    await reorderScene(chapterId, fromOrder, toOrder);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveCharacter: async (profile) => {
    await saveCharacterProfile(profile);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  deleteCharacter: async (characterId) => {
    await deleteCharacterProfile(characterId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveLocation: async (profile) => {
    await saveLocationProfile(profile);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  deleteLocation: async (locationId) => {
    await deleteLocationProfile(locationId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveLoreEntry: async (entry) => {
    await saveLoreEntry(entry);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  deleteLoreEntry: async (entryId) => {
    await deleteLoreEntry(entryId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveTimelineEvent: async (event) => {
    await saveTimelineEvent(event);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  deleteTimelineEvent: async (eventId) => {
    await deleteTimelineEvent(eventId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveRelationship: async (relationship) => {
    await saveNarrativeRelationship(relationship);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  deleteRelationship: async (relationshipId) => {
    await deleteNarrativeRelationship(relationshipId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveEntityProgression: async (entry) => {
    await saveEntityProgression(entry);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  deleteEntityProgression: async (entryId) => {
    await deleteEntityProgression(entryId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveEntityHistoryEntry: async (entry) => {
    await saveEntityHistoryEntryRecord(entry);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  deleteEntityHistoryEntry: async (entryId) => {
    await deleteEntityHistoryEntryRecord(entryId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  replaceEntityHistoryForChapter: async (chapterId, entries) => {
    const active = get().activeProject;
    if (!active) return;
    await replaceEntityHistoryEntriesForChapter(active.project.id, chapterId, entries);
    await refreshActive(set, active.project.id);
  },
  createRevisionIssue: async (input) => {
    const active = get().activeProject;
    if (!active) return;
    await createRevisionIssue({
      projectId: active.project.id,
      chapterId: input.chapterId,
      title: input.title,
      description: input.description,
      severity: input.severity,
    });
    await refreshActive(set, active.project.id);
  },
  updateRevisionIssueStatus: async (issueId, status) => {
    await updateRevisionIssueStatus(issueId, status);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  deleteRevisionIssue: async (issueId) => {
    await deleteRevisionIssue(issueId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveChecklistItem: async (item) => {
    await saveChecklistItem(item);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  toggleChecklistItem: async (itemId, done) => {
    await toggleChecklistItem(itemId, done);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  deleteChecklistItem: async (itemId) => {
    await deleteChecklistItem(itemId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveAnnotation: async (annotation) => {
    await saveAnnotation(annotation);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  deleteAnnotation: async (annotationId) => {
    await deleteAnnotation(annotationId);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveGoal: async (goal) => {
    await saveWritingGoal(goal);
    const active = get().activeProject;
    if (active) await refreshActive(set, active.project.id);
  },
  saveManuscriptTitle: async (title, subtitle, premise) => {
    const active = get().activeProject;
    if (!active) return;

    await saveManuscript({
      ...active.manuscript,
      manuscriptTitle: title,
      subtitle,
      premise,
    });

    await refreshActive(set, active.project.id);
  },
  createSnapshot: async (label, chapterId, payload) => {
    const active = get().activeProject;
    if (!active) return;
    await createSnapshot({
      projectId: active.project.id,
      chapterId,
      label,
      payload: payload ?? "",
    });
    await refreshActive(set, active.project.id);
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
