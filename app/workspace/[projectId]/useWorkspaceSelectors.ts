"use client";

import { useMemo } from "react";
import type {
  ChapterTrackerReport,
  EntityHistoryEntry,
  EntityProgression,
  ProjectBundle,
  ResolvedSettings,
  TrackedEntityType,
} from "@/app/domain/models";
import { ASSISTANTS, type AssistantId } from "@/app/lib/ai/assistants";
import {
  buildGrammarSuggestions,
  buildMarketingArtifacts,
  buildPublishingArtifacts,
  canonDeltasForChapter,
  chapterTrackerReportsForChapter,
  computeChapterQualityScore,
  computeContinuityConflicts,
  entityHistoryForChapter,
  entityHistoryForEntity,
  progressionForEntity,
  wordsWrittenToday,
} from "@/app/lib/repository";

interface SelectorDeps {
  activeProject: ProjectBundle | null;
  selectedChapterId: string;
  selectedHistoryEntityKey: string;
  selectedAssistantId: AssistantId;
  resolved: ResolvedSettings;
}

/** All pure derived state for the workspace, memoized off the active bundle. */
export function useWorkspaceSelectors({
  activeProject,
  selectedChapterId,
  selectedHistoryEntityKey,
  selectedAssistantId,
  resolved,
}: SelectorDeps) {
  const selectedChapter = useMemo(
    () =>
      activeProject?.chapters.find((chapter) => chapter.id === selectedChapterId) ??
      activeProject?.chapters[0] ??
      null,
    [activeProject, selectedChapterId]
  );

  const selectedScenes = useMemo(() => {
    if (!activeProject || !selectedChapter) return [];
    return activeProject.scenes
      .filter((scene) => scene.chapterId === selectedChapter.id)
      .sort((a, b) => a.order - b.order);
  }, [activeProject, selectedChapter]);

  const selectedChapterTrackerReports = useMemo(() => {
    if (!activeProject || !selectedChapter) {
      return [] as ChapterTrackerReport[];
    }
    return chapterTrackerReportsForChapter(activeProject, selectedChapter.id);
  }, [activeProject, selectedChapter]);

  const selectedChapterEntityHistory = useMemo(() => {
    if (!activeProject || !selectedChapter) {
      return [] as EntityHistoryEntry[];
    }
    return entityHistoryForChapter(activeProject, selectedChapter.id);
  }, [activeProject, selectedChapter]);

  const continuityConflicts = useMemo(() => {
    if (!activeProject) return [];
    return computeContinuityConflicts(activeProject);
  }, [activeProject]);

  const publishArtifacts = useMemo(() => {
    if (!activeProject) return null;
    return buildPublishingArtifacts(activeProject);
  }, [activeProject]);

  const marketingArtifacts = useMemo(() => {
    if (!activeProject) return null;
    return buildMarketingArtifacts(activeProject);
  }, [activeProject]);

  const selectedAssistant =
    ASSISTANTS.find((assistant) => assistant.id === selectedAssistantId) ?? ASSISTANTS[0];

  const trackedEntityOptions = useMemo(() => {
    if (!activeProject) return [];
    return [
      ...activeProject.characters.map((item) => ({
        id: item.id,
        type: "character" as const,
        label: item.name.trim() || "Unnamed character",
      })),
      ...activeProject.locations.map((item) => ({
        id: item.id,
        type: "location" as const,
        label: item.name.trim() || "Unnamed location",
      })),
      ...activeProject.loreEntries.map((item) => ({
        id: item.id,
        type: "lore" as const,
        label: item.title.trim() || "Untitled lore",
      })),
      ...activeProject.timeline.map((item) => ({
        id: item.id,
        type: "timeline_event" as const,
        label: item.label.trim() || "Untitled event",
      })),
    ];
  }, [activeProject]);

  const historyEntityOptions = useMemo(() => {
    if (!activeProject) return [] as Array<{
      key: string;
      type: EntityHistoryEntry["entityType"];
      entityId: string;
      label: string;
    }>;

    const relationshipOptions = activeProject.relationships.map((relationship) => {
      const source =
        trackedEntityOptions.find(
          (option) =>
            option.type === relationship.sourceType && option.id === relationship.sourceId
        )?.label ?? "Unknown source";
      const target =
        trackedEntityOptions.find(
          (option) =>
            option.type === relationship.targetType && option.id === relationship.targetId
        )?.label ?? "Unknown target";

      return {
        key: `relationship:${relationship.id}`,
        type: "relationship" as const,
        entityId: relationship.id,
        label: `${source} -> ${relationship.relationType || "related to"} -> ${target}`,
      };
    });

    return [
      ...trackedEntityOptions.map((option) => ({
        key: `${option.type}:${option.id}`,
        type: option.type,
        entityId: option.id,
        label: option.label,
      })),
      ...relationshipOptions,
    ];
  }, [activeProject, trackedEntityOptions]);

  const selectedHistoryEntity = useMemo(
    () =>
      historyEntityOptions.find((item) => item.key === selectedHistoryEntityKey) ??
      historyEntityOptions[0] ??
      null,
    [historyEntityOptions, selectedHistoryEntityKey]
  );

  const selectedHistoryTimeline = useMemo(() => {
    if (!activeProject || !selectedHistoryEntity) {
      return activeProject?.chapters.map((chapter) => ({ chapter, entries: [] as EntityHistoryEntry[] })) ?? [];
    }

    const entries = entityHistoryForEntity(
      activeProject,
      selectedHistoryEntity.type,
      selectedHistoryEntity.entityId
    );
    const entriesByChapter = new Map<string, EntityHistoryEntry[]>();
    entries.forEach((entry) => {
      const list = entriesByChapter.get(entry.chapterId) ?? [];
      list.push(entry);
      entriesByChapter.set(entry.chapterId, list);
    });

    return activeProject.chapters
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((chapter) => ({
        chapter,
        entries: (entriesByChapter.get(chapter.id) ?? []).sort((a, b) => a.label.localeCompare(b.label)),
      }));
  }, [activeProject, selectedHistoryEntity]);

  const progressionByEntity = useMemo(() => {
    if (!activeProject) return [] as Array<{
      key: string;
      type: TrackedEntityType;
      entityId: string;
      label: string;
      entries: EntityProgression[];
    }>;

    return trackedEntityOptions
      .map((option) => ({
        key: `${option.type}:${option.id}`,
        type: option.type,
        entityId: option.id,
        label: option.label,
        entries: progressionForEntity(activeProject, option.type, option.id),
      }))
      .filter((item) => item.entries.length > 0);
  }, [activeProject, trackedEntityOptions]);

  const pendingAiCount = useMemo(() => {
    if (!activeProject) return 0;
    return activeProject.aiActions.filter((action) => action.status === "pending").length;
  }, [activeProject]);

  const manuscriptWordCount = useMemo(() => {
    if (!activeProject) return 0;
    return activeProject.chapters.reduce((sum, chapter) => sum + chapter.wordCountCurrent, 0);
  }, [activeProject]);

  const wordsToday = useMemo(
    () => (activeProject ? wordsWrittenToday(activeProject) : 0),
    [activeProject]
  );

  const selectedChapterDeltas = useMemo(() => {
    if (!activeProject || !selectedChapter) return [];
    return canonDeltasForChapter(activeProject, selectedChapter.id);
  }, [activeProject, selectedChapter]);

  const proposedDeltaCount = useMemo(
    () => (activeProject ? activeProject.canonDeltas.filter((d) => d.status === "proposed").length : 0),
    [activeProject]
  );

  const chapterScore = useMemo(() => {
    if (!selectedChapter) return 0;
    return computeChapterQualityScore(selectedChapter, resolved.settings.qa.rubricWeights);
  }, [resolved.settings.qa.rubricWeights, selectedChapter]);

  const chapterGrammarSuggestions = useMemo(() => {
    if (!selectedChapter) return [];
    return buildGrammarSuggestions(selectedChapter.content);
  }, [selectedChapter]);

  return {
    selectedChapter,
    selectedScenes,
    selectedChapterTrackerReports,
    selectedChapterEntityHistory,
    continuityConflicts,
    publishArtifacts,
    marketingArtifacts,
    selectedAssistant,
    trackedEntityOptions,
    historyEntityOptions,
    selectedHistoryEntity,
    selectedHistoryTimeline,
    progressionByEntity,
    pendingAiCount,
    manuscriptWordCount,
    wordsToday,
    selectedChapterDeltas,
    proposedDeltaCount,
    chapterScore,
    chapterGrammarSuggestions,
  };
}
