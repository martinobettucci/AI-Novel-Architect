"use client";

import { useEffect, useState } from "react";
import type {
  AiActionType,
  Chapter,
  NarrativeRelationship,
  Scene,
} from "@/app/domain/models";
import {
  createCanonDelta,
  createEntityProgression,
  createId,
  createLocationProfile,
  createLoreEntry,
  createNarrativeRelationship,
} from "@/app/domain/defaults";
import { useI18n } from "@/app/i18n/I18nProvider";
import { buildAssistantInput, type AssistantId } from "@/app/lib/ai/assistants";
import {
  buildChapterTrackerComputationContext,
  buildChapterTrackerComputationInput,
  listChapterTrackerTypes,
  parseChapterTrackerComputation,
} from "@/app/lib/ai/chapterTrackers";
import {
  buildChapterDetailsAutocompleteContext,
  buildChapterDetailsAutocompleteInput,
  parseChapterDetailsSuggestion,
} from "@/app/lib/ai/chapterDetails";
import {
  buildChapterDraftContext,
  buildChapterDraftInput,
} from "@/app/lib/ai/chapterDraft";
import {
  buildSceneCardSuggestionContext,
  buildSceneCardSuggestionInput,
  buildSceneDraftContext,
  buildSceneDraftInput,
  parseSceneCardSuggestions,
} from "@/app/lib/ai/sceneCards";
import {
  buildStoryBibleSuggestionContext,
  buildStoryBibleSuggestionInput,
  parseStoryBibleSuggestion,
} from "@/app/lib/ai/storyBible";
import {
  buildStoryWorldSectionContext,
  buildStoryWorldSuggestionContext,
  buildStoryWorldSuggestionInput,
  parseStoryWorldSuggestion,
  STORY_WORLD_SECTIONS,
  storyWorldSectionLabel,
  type StoryWorldSectionKey,
  type StoryWorldSuggestion,
} from "@/app/lib/ai/storyBibleFollowup";
import { buildPreviewApply, runAiAction } from "@/app/lib/ai/client";
import {
  runAgentPool,
  type AgentStatus,
  type AgentTask,
} from "@/app/lib/ai/agentPool";
import { replaceInHtmlText } from "@/app/lib/html";
import {
  DEFAULT_ORCHESTRATION_POLICY,
  runChapterOrchestration,
  type OrchestratorRunStep,
  type StructuredRunner,
} from "@/app/lib/ai/orchestrator";
import type { DiffChunk } from "@/app/lib/ai/diff";
import {
  logAiAction,
  verifyCanonDelta,
} from "@/app/lib/repository";
import { useProjectStore } from "@/app/stores/projectStore";
import { useSettingsStore } from "@/app/stores/settingsStore";
import {
  chapterLabel,
  downloadArtifacts,
  escapeHtml,
  normalizeLookupKey,
  plainTextToHtml,
  sceneLabel,
  type WorkspaceTab,
} from "./helpers";
import { useEditorBinding } from "./useEditorBinding";
import { useOnlineStatus } from "./useOnlineStatus";
import { useWorkspaceSelectors } from "./useWorkspaceSelectors";

/** Outcome of one scene-drafting agent: the prose it wrote plus its honesty flag. */
interface SceneDraftAgentResult {
  text: string;
  /** The model hit its token ceiling; `text` is an incomplete scene. */
  truncated: boolean;
}

export function useWorkspaceController(projectId: string) {
  const { t } = useI18n();

  const activeProject = useProjectStore((state) => state.activeProject);
  const storeError = useProjectStore((state) => state.error);
  const openProject = useProjectStore((state) => state.openProject);
  const saveProjectMeta = useProjectStore((state) => state.saveProjectMeta);
  const saveStoryBible = useProjectStore((state) => state.saveStoryBible);
  const saveChapter = useProjectStore((state) => state.saveChapter);
  const saveChapterTrackerReport = useProjectStore((state) => state.saveChapterTrackerReport);
  const addChapter = useProjectStore((state) => state.addChapter);
  const deleteChapter = useProjectStore((state) => state.deleteChapter);
  const reorderChapter = useProjectStore((state) => state.reorderChapter);
  const saveScene = useProjectStore((state) => state.saveScene);
  const addScene = useProjectStore((state) => state.addScene);
  const deleteScene = useProjectStore((state) => state.deleteScene);
  const reorderScene = useProjectStore((state) => state.reorderScene);
  const saveCharacter = useProjectStore((state) => state.saveCharacter);
  const deleteCharacter = useProjectStore((state) => state.deleteCharacter);
  const saveLocation = useProjectStore((state) => state.saveLocation);
  const deleteLocation = useProjectStore((state) => state.deleteLocation);
  const saveLoreEntry = useProjectStore((state) => state.saveLoreEntry);
  const deleteLoreEntry = useProjectStore((state) => state.deleteLoreEntry);
  const saveTimelineEventAction = useProjectStore((state) => state.saveTimelineEvent);
  const deleteTimelineEventAction = useProjectStore((state) => state.deleteTimelineEvent);
  const saveRelationship = useProjectStore((state) => state.saveRelationship);
  const deleteRelationship = useProjectStore((state) => state.deleteRelationship);
  const saveEntityProgressionAction = useProjectStore((state) => state.saveEntityProgression);
  const deleteEntityProgression = useProjectStore((state) => state.deleteEntityProgression);
  const replaceEntityHistoryForChapterAction = useProjectStore(
    (state) => state.replaceEntityHistoryForChapter
  );
  const createRevisionIssue = useProjectStore((state) => state.createRevisionIssue);
  const updateRevisionIssueStatus = useProjectStore((state) => state.updateRevisionIssueStatus);
  const deleteRevisionIssue = useProjectStore((state) => state.deleteRevisionIssue);
  const saveChecklistItem = useProjectStore((state) => state.saveChecklistItem);
  const toggleChecklistItem = useProjectStore((state) => state.toggleChecklistItem);
  const deleteChecklistItem = useProjectStore((state) => state.deleteChecklistItem);
  const saveAnnotation = useProjectStore((state) => state.saveAnnotation);
  const deleteAnnotation = useProjectStore((state) => state.deleteAnnotation);
  const saveGoal = useProjectStore((state) => state.saveGoal);
  const saveDelta = useProjectStore((state) => state.saveDelta);
  const approveDelta = useProjectStore((state) => state.approveDelta);
  const rejectDelta = useProjectStore((state) => state.rejectDelta);
  const deleteDelta = useProjectStore((state) => state.deleteDelta);
  const createSnapshot = useProjectStore((state) => state.createSnapshot);
  const restoreSnapshot = useProjectStore((state) => state.restoreSnapshot);
  const exportActiveProjectJson = useProjectStore((state) => state.exportActiveProjectJson);
  const exportActiveProjectMarkdown = useProjectStore((state) => state.exportActiveProjectMarkdown);
  const exportActiveProjectBackup = useProjectStore((state) => state.exportActiveProjectBackup);

  const resolved = useSettingsStore((state) => state.resolved);
  const loadSettings = useSettingsStore((state) => state.load);
  const saveScope = useSettingsStore((state) => state.saveScope);
  const resetScope = useSettingsStore((state) => state.resetScope);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("plan");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [focusMode, setFocusMode] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [aiAction, setAiAction] = useState<AiActionType>("revision_pass");
  const [selectedAssistantId, setSelectedAssistantId] =
    useState<AssistantId>("development_editor");
  const [aiStatus, setAiStatus] = useState<"idle" | "running" | "error">("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string>("");
  const [aiDiff, setAiDiff] = useState<DiffChunk[]>([]);
  const [aiPromptContext, setAiPromptContext] = useState("");
  const [outlineSearchVisible, setOutlineSearchVisible] = useState(false);
  const [storyBibleAiStatus, setStoryBibleAiStatus] =
    useState<"idle" | "running" | "error">("idle");
  const [storyBibleAiError, setStoryBibleAiError] = useState<string | null>(null);
  const [storyBibleAiMessage, setStoryBibleAiMessage] = useState<string | null>(null);
  const [storyWorldAiStatus, setStoryWorldAiStatus] =
    useState<"idle" | "running" | "error">("idle");
  const [storyWorldAiError, setStoryWorldAiError] = useState<string | null>(null);
  const [storyWorldAiMessage, setStoryWorldAiMessage] = useState<string | null>(null);
  const [chapterDetailsAiStatus, setChapterDetailsAiStatus] =
    useState<"idle" | "running" | "error">("idle");
  const [chapterDetailsAiError, setChapterDetailsAiError] = useState<string | null>(null);
  const [chapterDetailsAiMessage, setChapterDetailsAiMessage] = useState<string | null>(null);
  const [chapterTrackersAiStatus, setChapterTrackersAiStatus] =
    useState<"idle" | "running" | "error">("idle");
  const [chapterTrackersAiError, setChapterTrackersAiError] = useState<string | null>(null);
  const [chapterTrackersAiMessage, setChapterTrackersAiMessage] = useState<string | null>(null);
  const [chapterDraftAiStatus, setChapterDraftAiStatus] =
    useState<"idle" | "running" | "error">("idle");
  const [chapterDraftAiError, setChapterDraftAiError] = useState<string | null>(null);
  const [chapterDraftAiMessage, setChapterDraftAiMessage] = useState<string | null>(null);
  const [chapterDraftPreview, setChapterDraftPreview] = useState<string>("");
  const [chapterDraftConcurrentStatus, setChapterDraftConcurrentStatus] =
    useState<"idle" | "running" | "error">("idle");
  const [sceneAgentRuns, setSceneAgentRuns] = useState<
    Array<{ id: string; label: string; status: AgentStatus; ms?: number; error?: string }>
  >([]);
  const [worldAgentRuns, setWorldAgentRuns] = useState<
    Array<{ id: string; label: string; status: AgentStatus; ms?: number; error?: string }>
  >([]);
  const [selectedHistoryEntityKey, setSelectedHistoryEntityKey] = useState<string>("");
  const [sceneCardsAiStatus, setSceneCardsAiStatus] =
    useState<"idle" | "running" | "error">("idle");
  const [sceneCardsAiError, setSceneCardsAiError] = useState<string | null>(null);
  const [sceneCardsAiMessage, setSceneCardsAiMessage] = useState<string | null>(null);
  const [sceneDraftAiSceneId, setSceneDraftAiSceneId] = useState<string | null>(null);
  const [sceneDraftAiError, setSceneDraftAiError] = useState<string | null>(null);
  const [sceneDraftAiMessage, setSceneDraftAiMessage] = useState<string | null>(null);
  const [searchReplaceMessage, setSearchReplaceMessage] = useState<string | null>(null);
  const [deltaAiStatus, setDeltaAiStatus] =
    useState<"idle" | "running" | "error">("idle");
  const [deltaAiError, setDeltaAiError] = useState<string | null>(null);
  const [deltaAiMessage, setDeltaAiMessage] = useState<string | null>(null);
  const [orchestrationSteps, setOrchestrationSteps] = useState<OrchestratorRunStep[]>([]);
  const [storyBiblePreview, setStoryBiblePreview] = useState<ReturnType<
    typeof parseStoryBibleSuggestion
  > | null>(null);
  const [storyWorldPreview, setStoryWorldPreview] = useState<StoryWorldSuggestion | null>(null);
  const [chapterDetailsPreview, setChapterDetailsPreview] = useState<ReturnType<
    typeof parseChapterDetailsSuggestion
  > | null>(null);
  const [sceneCardsPreview, setSceneCardsPreview] = useState<ReturnType<
    typeof parseSceneCardSuggestions
  > | null>(null);
  const [sceneDraftPreview, setSceneDraftPreview] = useState<{
    sceneId: string;
    text: string;
  } | null>(null);
  const offline = useOnlineStatus();

  useEffect(() => {
    void openProject(projectId);
    void loadSettings(projectId);
  }, [loadSettings, openProject, projectId]);

  const project = activeProject?.project;
  const projectIdValue = project?.id ?? "";

  const {
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
  } = useWorkspaceSelectors({
    activeProject,
    selectedChapterId,
    selectedHistoryEntityKey,
    selectedAssistantId,
    resolved,
  });

  useEffect(() => {
    if (!activeProject) return;
    const chapterIds = new Set(activeProject.chapters.map((chapter) => chapter.id));
    if (selectedChapterId && chapterIds.has(selectedChapterId)) return;
    setSelectedChapterId(activeProject.chapters[0]?.id ?? "");
  }, [activeProject, selectedChapterId]);

  useEffect(() => {
    // Chapter-scoped AI previews must never survive a chapter switch, or a
    // proposal computed for one chapter could be applied to another.
    setChapterDraftPreview("");
    setChapterDraftAiError(null);
    setChapterDraftAiMessage(null);
    setSceneAgentRuns([]);
    setChapterDraftConcurrentStatus("idle");
    setChapterDetailsPreview(null);
    setChapterDetailsAiError(null);
    setChapterDetailsAiMessage(null);
    setSceneCardsPreview(null);
    setSceneCardsAiError(null);
    setSceneCardsAiMessage(null);
    setSceneDraftPreview(null);
    setSceneDraftAiError(null);
    setSceneDraftAiMessage(null);
    setDeltaAiError(null);
    setDeltaAiMessage(null);
  }, [selectedChapter?.id]);

  useEffect(() => {
    if (historyEntityOptions.length === 0) {
      if (selectedHistoryEntityKey) setSelectedHistoryEntityKey("");
      return;
    }
    const exists = historyEntityOptions.some((item) => item.key === selectedHistoryEntityKey);
    if (!exists) setSelectedHistoryEntityKey(historyEntityOptions[0].key);
  }, [historyEntityOptions, selectedHistoryEntityKey]);

  const { editor, setEditorContent, flushPendingEditorSave } = useEditorBinding({
    selectedChapter,
    readingMode,
    saveChapter,
    setOutlineSearchVisible,
    setFocusMode,
  });
  async function applySearchReplace() {
    if (!searchText.trim()) return;
    const bundle = activeProject;
    if (!bundle) return;

    flushPendingEditorSave();
    let replacedCount = 0;
    let chapterCount = 0;

    for (const chapter of bundle.chapters) {
      const source =
        chapter.id === selectedChapter?.id && editor ? editor.getHTML() : chapter.content;
      // Replace only within text content, never inside HTML tags/attributes.
      const { html: nextContent, count } = replaceInHtmlText(source, searchText, replaceText);
      if (count === 0) continue;
      await saveChapter({
        ...chapter,
        content: nextContent,
      });
      if (chapter.id === selectedChapter?.id) {
        setEditorContent(nextContent);
      }
      replacedCount += count;
      chapterCount += 1;
    }

    setSearchReplaceMessage(
      replacedCount === 0
        ? t("drafting.searchNoMatch", { term: searchText })
        : t("drafting.searchReplaced", { count: replacedCount, chapters: chapterCount })
    );
  }

  async function runAiPreview() {
    const bundle = activeProject;
    if (!bundle) return;
    const needsChapterApply = selectedAssistant.focus === "chapter";
    if (needsChapterApply && !selectedChapter) {
      setAiError("Select a chapter before running this assistant.");
      setAiStatus("error");
      return;
    }

    if (needsChapterApply && selectedChapter?.aiLocked) {
      setAiError("This chapter is locked from AI rewrite. Unlock before applying.");
      setAiStatus("error");
      return;
    }

    const assistantContext = buildAssistantInput(selectedAssistant, bundle, selectedChapter?.id);
    const baseContent =
      needsChapterApply && selectedChapter
        ? editor?.getHTML() ?? selectedChapter.content
        : assistantContext;
    setAiStatus("running");
    setAiError(null);

    try {
      const result = await runAiAction({
        action: aiAction,
        input: baseContent,
        context: [assistantContext, aiPromptContext].filter(Boolean).join("\n\n"),
        settings: resolved.settings,
        styleProfile:
          aiAction === "style_transform"
            ? selectedAssistant.styleProfile ?? "Selected ghostwriter style"
            : undefined,
      });

      if (needsChapterApply) {
        const preview = buildPreviewApply(baseContent, result.text);
        setAiDraft(preview.updatedText);
        setAiDiff(preview.diff);
      } else {
        setAiDraft(result.text);
        setAiDiff([]);
      }

      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter?.id,
        action: result.action,
        status: "completed",
        model: result.model,
        providerBaseUrl: result.baseUrl,
        inputPreview: baseContent,
        outputPreview: result.text,
        metadata: {
          assistant: selectedAssistant.id,
          context: aiPromptContext,
        },
      });

      await openProject(projectIdValue);
      setAiStatus("idle");
    } catch (error) {
      setAiStatus("error");
      setAiError(error instanceof Error ? error.message : "AI action failed");
      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter?.id,
        action: aiAction,
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: baseContent,
        outputPreview: "",
        metadata: {
          assistant: selectedAssistant.id,
          error: error instanceof Error ? error.message : "unknown",
        },
      });
      await openProject(projectIdValue);
    }
  }

  async function applyAiDraft() {
    if (!selectedChapter || !aiDraft) return;
    flushPendingEditorSave();
    if (selectedChapter.content.trim()) {
      await createSnapshot(
        `Before AI apply ${new Date().toLocaleTimeString()}`,
        selectedChapter.id,
        editor?.getHTML() ?? selectedChapter.content
      );
    }
    setEditorContent(aiDraft);
    await saveChapter({
      ...selectedChapter,
      content: aiDraft,
    });
    setAiDiff([]);
    setAiDraft("");
  }

  async function appendSceneToDraft(scene: Scene) {
    if (!selectedChapter) return;
    flushPendingEditorSave();
    const base = editor?.getHTML() ?? selectedChapter.content;
    const section = `<p><strong>${escapeHtml(sceneLabel(scene))}</strong></p><p>${escapeHtml(scene.draftText || scene.description)}</p>`;
    const next = `${base}${section}`;
    setEditorContent(next);
    await saveChapter({ ...selectedChapter, content: next });
  }

  async function createManualScene(chapterId: string) {
    setSelectedChapterId(chapterId);
    await addScene(chapterId);
  }

  async function confirmDeleteChapter(chapter: Chapter) {
    const confirmed = window.confirm(
      `Delete ${chapterLabel(chapter)}? Its scenes, annotations, and snapshots are removed too. This cannot be undone.`
    );
    if (!confirmed) return;
    await deleteChapter(chapter.id);
  }

  async function createIssueFromGrammar(suggestion: string) {
    if (!selectedChapter) return;
    await createRevisionIssue({
      chapterId: selectedChapter.id,
      title: "Grammar/style suggestion",
      description: suggestion,
      severity: "medium",
    });
  }

  function addBlankLocation() {
    void saveLocation(createLocationProfile(projectIdValue));
  }

  function addBlankLoreEntry() {
    void saveLoreEntry(createLoreEntry(projectIdValue));
  }

  function addBlankRelationship() {
    void saveRelationship(createNarrativeRelationship(projectIdValue));
  }

  function addBlankProgression() {
    const entry = createEntityProgression(projectIdValue);
    if (selectedChapter) {
      entry.chapterId = selectedChapter.id;
    }
    const fallbackEntity = trackedEntityOptions[0];
    if (fallbackEntity) {
      entry.entityType = fallbackEntity.type;
      entry.entityId = fallbackEntity.id;
      entry.label = fallbackEntity.label;
    }
    void saveEntityProgressionAction(entry);
  }

  function exportPublishArtifacts() {
    if (!publishArtifacts) return;
    downloadArtifacts(projectIdValue, {
      metadata: publishArtifacts.metadataSheet,
      synopsis_short: publishArtifacts.synopsisShort,
      synopsis_long: publishArtifacts.synopsisLong,
      chapter_manifest: publishArtifacts.chapterManifest,
    });
  }

  function exportMarketingArtifacts() {
    if (!marketingArtifacts) return;
    downloadArtifacts(projectIdValue, {
      blurb: marketingArtifacts.blurb,
      tagline: marketingArtifacts.tagline,
      pitch: marketingArtifacts.pitchVariants.join("\n"),
      social: marketingArtifacts.socialSnippets.join("\n"),
      email: marketingArtifacts.emailDraft,
      cover: marketingArtifacts.coverBriefPrompt,
      checklist: marketingArtifacts.launchChecklist.join("\n"),
    });
  }

  async function suggestStoryBible() {
    const bundle = activeProject;
    if (!bundle) return;

    const input = buildStoryBibleSuggestionInput(bundle);
    const context = buildStoryBibleSuggestionContext();
    setStoryBibleAiStatus("running");
    setStoryBibleAiError(null);
    setStoryBibleAiMessage(null);
    setStoryBiblePreview(null);

    try {
      const result = await runAiAction({
        action: "brainstorm",
        input,
        context,
        settings: resolved.settings,
      });
      const parsed = parseStoryBibleSuggestion(result.text);

      if (
        !parsed.premise &&
        !parsed.themes?.length &&
        !parsed.stakes &&
        !parsed.worldRules
      ) {
        throw new Error("AI response could not be mapped to the Story Bible fields.");
      }

      await logAiAction({
        projectId: projectIdValue,
        action: result.action,
        status: "completed",
        model: result.model,
        providerBaseUrl: result.baseUrl,
        inputPreview: input,
        outputPreview: result.text,
        metadata: {
          feature: "story_bible_suggestion",
        },
      });

      setStoryBiblePreview(parsed);
      setStoryBibleAiStatus("idle");
      setStoryBibleAiMessage(
        "Suggestion ready. Review the proposed fields below, then apply or discard."
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Story bible suggestion failed";
      setStoryBibleAiStatus("error");
      setStoryBibleAiError(errorMessage);
      await logAiAction({
        projectId: projectIdValue,
        action: "brainstorm",
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: input,
        outputPreview: "",
        metadata: {
          feature: "story_bible_suggestion",
          error: errorMessage,
        },
      });
      await openProject(projectIdValue);
    }
  }

  async function applyStoryBibleSuggestion() {
    const bundle = activeProject;
    if (!bundle || !storyBiblePreview) return;

    await saveStoryBible({
      ...bundle.bible,
      premise: storyBiblePreview.premise ?? bundle.bible.premise,
      themes: storyBiblePreview.themes ?? bundle.bible.themes,
      stakes: storyBiblePreview.stakes ?? bundle.bible.stakes,
      worldRules: storyBiblePreview.worldRules ?? bundle.bible.worldRules,
    });

    setStoryBiblePreview(null);
    setStoryBibleAiMessage("Suggestion applied to the story bible fields.");
  }

  function discardStoryBibleSuggestion() {
    setStoryBiblePreview(null);
    setStoryBibleAiMessage("Suggestion discarded. The story bible was not changed.");
  }

  /** Concurrent multi-agent world scaffold: one small agent per bible section. */
  async function suggestStoryWorldScaffoldConcurrent() {
    const bundle = activeProject;
    if (!bundle) return;

    const input = buildStoryWorldSuggestionInput(bundle);
    setStoryWorldAiStatus("running");
    setStoryWorldAiError(null);
    setStoryWorldAiMessage(null);
    setStoryWorldPreview(null);
    setWorldAgentRuns(
      STORY_WORLD_SECTIONS.map((section) => ({
        id: section,
        label: storyWorldSectionLabel(section),
        status: "pending" as AgentStatus,
      }))
    );

    const tasks: AgentTask<StoryWorldSuggestion>[] = STORY_WORLD_SECTIONS.map((section) => ({
      id: section,
      label: storyWorldSectionLabel(section),
      run: async () => {
        const result = await runAiAction({
          action: "brainstorm",
          input,
          context: buildStoryWorldSectionContext(section as StoryWorldSectionKey),
          settings: resolved.settings,
        });
        await logAiAction({
          projectId: projectIdValue,
          action: result.action,
          status: "completed",
          model: result.model,
          providerBaseUrl: result.baseUrl,
          inputPreview: input,
          outputPreview: result.text,
          metadata: { feature: "story_world_section_agent", section },
        });
        return parseStoryWorldSuggestion(result.text);
      },
    }));

    const outcomes = await runAgentPool(tasks, {
      // The gateway serializes generations, so a wider pool buys no throughput
      // and only stretches the tail latency of the slowest section.
      concurrency: 1,
      onStart: ({ id }) =>
        setWorldAgentRuns((prev) =>
          prev.map((run) => (run.id === id ? { ...run, status: "running" } : run))
        ),
      onSettle: (outcome) =>
        setWorldAgentRuns((prev) =>
          prev.map((run) =>
            run.id === outcome.id
              ? { id: outcome.id, label: outcome.label, status: outcome.status, ms: outcome.ms, error: outcome.error }
              : run
          )
        ),
    });

    // Generation: merge the per-section checkpoints into one reviewable proposal.
    const merged: StoryWorldSuggestion = {
      characters: [],
      locations: [],
      lore: [],
      timeline: [],
      relationships: [],
    };
    for (const outcome of outcomes) {
      if (outcome.status !== "ok" || !outcome.data) continue;
      merged.characters.push(...outcome.data.characters);
      merged.locations.push(...outcome.data.locations);
      merged.lore.push(...outcome.data.lore);
      merged.timeline.push(...outcome.data.timeline);
      merged.relationships.push(...outcome.data.relationships);
    }

    const total =
      merged.characters.length +
      merged.locations.length +
      merged.lore.length +
      merged.timeline.length +
      merged.relationships.length;
    const okCount = outcomes.filter((outcome) => outcome.status === "ok").length;
    const failedOutcomes = outcomes.filter((outcome) => outcome.status !== "ok");

    // Each failed section agent gets its own provenance row, like every other
    // AI feature; without it this path left no trace in `ai_actions` at all.
    for (const outcome of failedOutcomes) {
      await logAiAction({
        projectId: projectIdValue,
        action: "brainstorm",
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: input,
        outputPreview: "",
        metadata: {
          feature: "story_world_section_agent",
          section: outcome.id,
          error: outcome.error ?? "unknown",
        },
      });
    }
    if (failedOutcomes.length > 0) {
      await openProject(projectIdValue);
    }

    if (total === 0) {
      // Surface the real failure instead of only the generic "no entities" line.
      const firstError = failedOutcomes.find((outcome) => outcome.error)?.error;
      setStoryWorldAiStatus("error");
      setStoryWorldAiError(
        firstError ? `${t("bible.worldAgentsEmpty")} ${firstError}` : t("bible.worldAgentsEmpty")
      );
      return;
    }

    setStoryWorldPreview(merged);
    setStoryWorldAiStatus(okCount < outcomes.length ? "error" : "idle");
    setStoryWorldAiMessage(t("bible.worldAgentsDone", { ok: okCount, total: outcomes.length }));
  }

  async function suggestStoryWorldScaffold() {
    const bundle = activeProject;
    if (!bundle) return;

    const input = buildStoryWorldSuggestionInput(bundle);
    const context = buildStoryWorldSuggestionContext();
    setStoryWorldAiStatus("running");
    setStoryWorldAiError(null);
    setStoryWorldAiMessage(null);
    setStoryWorldPreview(null);

    try {
      const result = await runAiAction({
        action: "brainstorm",
        input,
        context,
        settings: resolved.settings,
      });
      const parsed = parseStoryWorldSuggestion(result.text);

      if (
        parsed.characters.length === 0 &&
        parsed.locations.length === 0 &&
        parsed.lore.length === 0 &&
        parsed.timeline.length === 0 &&
        parsed.relationships.length === 0
      ) {
        throw new Error("AI response could not be mapped to story bible entities.");
      }

      await logAiAction({
        projectId: projectIdValue,
        action: result.action,
        status: "completed",
        model: result.model,
        providerBaseUrl: result.baseUrl,
        inputPreview: input,
        outputPreview: result.text,
        metadata: {
          feature: "story_world_scaffold",
          characters: parsed.characters.length,
          locations: parsed.locations.length,
          lore: parsed.lore.length,
          timeline: parsed.timeline.length,
          relationships: parsed.relationships.length,
        },
      });

      setStoryWorldPreview(parsed);
      setStoryWorldAiStatus("idle");
      setStoryWorldAiMessage(
        "World scaffold ready. Review the proposed entities below, then apply or discard."
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Story world suggestion failed";
      setStoryWorldAiStatus("error");
      setStoryWorldAiError(errorMessage);
      await logAiAction({
        projectId: projectIdValue,
        action: "brainstorm",
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: input,
        outputPreview: "",
        metadata: {
          feature: "story_world_scaffold",
          error: errorMessage,
        },
      });
      await openProject(projectIdValue);
    }
  }

  async function applyStoryWorldSuggestion() {
    const bundle = activeProject;
    const parsed = storyWorldPreview;
    if (!bundle || !parsed) return;

    const characterIdsByName = new Map(
      bundle.characters.map((character) => [normalizeLookupKey(character.name), character.id])
    );
    const locationIdsByName = new Map(
      bundle.locations.map((location) => [normalizeLookupKey(location.name), location.id])
    );
    const loreIdsByTitle = new Map(
      bundle.loreEntries.map((entry) => [normalizeLookupKey(entry.title), entry.id])
    );
    const timelineIdsByLabel = new Map(
      bundle.timeline.map((event) => [normalizeLookupKey(event.label), event.id])
    );
    const chapterIdByNumber = new Map(
      bundle.chapters.map((chapter) => [chapter.number, chapter.id])
    );

    for (const character of parsed.characters) {
      const lookupKey = normalizeLookupKey(character.name);
      const existing =
        bundle.characters.find((item) => normalizeLookupKey(item.name) === lookupKey) ?? null;
      const id = existing?.id ?? createId("char");

      await saveCharacter({
        id,
        projectId: projectIdValue,
        name: character.name,
        role: character.role || existing?.role || "",
        motivation: character.motivation || existing?.motivation || "",
        arc: character.arc || existing?.arc || "",
        voice: character.voice || existing?.voice || "",
        relationships: character.relationships || existing?.relationships || "",
        notes: character.notes || existing?.notes || "",
        updatedAt: existing?.updatedAt ?? new Date().toISOString(),
      });
      characterIdsByName.set(lookupKey, id);
    }

    for (const location of parsed.locations) {
      const lookupKey = normalizeLookupKey(location.name);
      const existing =
        bundle.locations.find((item) => normalizeLookupKey(item.name) === lookupKey) ?? null;
      const id = existing?.id ?? createId("location");

      await saveLocation({
        id,
        projectId: projectIdValue,
        name: location.name,
        role: location.role || existing?.role || "",
        narrativeStatus: location.narrativeStatus || existing?.narrativeStatus || "",
        description: location.description || existing?.description || "",
        notes: location.notes || existing?.notes || "",
        updatedAt: existing?.updatedAt ?? new Date().toISOString(),
      });
      locationIdsByName.set(lookupKey, id);
    }

    for (const entry of parsed.lore) {
      const lookupKey = normalizeLookupKey(entry.title);
      const existing =
        bundle.loreEntries.find((item) => normalizeLookupKey(item.title) === lookupKey) ?? null;
      const id = existing?.id ?? createId("lore");

      await saveLoreEntry({
        id,
        projectId: projectIdValue,
        title: entry.title,
        category: entry.category || existing?.category || "",
        status: entry.status || existing?.status || "",
        description: entry.description || existing?.description || "",
        notes: entry.notes || existing?.notes || "",
        updatedAt: existing?.updatedAt ?? new Date().toISOString(),
      });
      loreIdsByTitle.set(lookupKey, id);
    }

    for (const event of parsed.timeline) {
      const lookupKey = normalizeLookupKey(event.label);
      const existing =
        bundle.timeline.find((item) => normalizeLookupKey(item.label) === lookupKey) ?? null;
      const id = existing?.id ?? createId("timeline");

      await saveTimelineEventAction({
        id,
        projectId: projectIdValue,
        order:
          event.order > 0
            ? event.order
            : existing?.order ?? bundle.timeline.length + 1,
        chapterId:
          (event.chapterNumber != null && chapterIdByNumber.get(event.chapterNumber)) ||
          existing?.chapterId,
        label: event.label,
        details: event.details || existing?.details || "",
        impact: event.impact || existing?.impact || "",
        updatedAt: existing?.updatedAt ?? new Date().toISOString(),
      });
      timelineIdsByLabel.set(lookupKey, id);
    }

    const resolveEntityId = (type: NarrativeRelationship["sourceType"], label: string): string => {
      const lookupKey = normalizeLookupKey(label);
      switch (type) {
        case "character":
          return characterIdsByName.get(lookupKey) ?? "";
        case "location":
          return locationIdsByName.get(lookupKey) ?? "";
        case "lore":
          return loreIdsByTitle.get(lookupKey) ?? "";
        case "timeline_event":
          return timelineIdsByLabel.get(lookupKey) ?? "";
        default:
          return "";
      }
    };

    const relationshipKey = (relationship: NarrativeRelationship): string =>
      [
        relationship.sourceType,
        relationship.sourceId,
        relationship.targetType,
        relationship.targetId,
        normalizeLookupKey(relationship.relationType),
      ].join("|");

    const existingRelationshipsByKey = new Map(
      bundle.relationships.map((relationship) => [relationshipKey(relationship), relationship])
    );

    for (const relationship of parsed.relationships) {
      const sourceId = resolveEntityId(relationship.sourceType, relationship.source);
      const targetId = resolveEntityId(relationship.targetType, relationship.target);
      if (!sourceId || !targetId) {
        continue;
      }

      const candidateKey = [
        relationship.sourceType,
        sourceId,
        relationship.targetType,
        targetId,
        normalizeLookupKey(relationship.relationType),
      ].join("|");
      const existing = existingRelationshipsByKey.get(candidateKey) ?? null;

      await saveRelationship({
        id: existing?.id ?? createId("relation"),
        projectId: projectIdValue,
        sourceType: relationship.sourceType,
        sourceId,
        targetType: relationship.targetType,
        targetId,
        relationType: relationship.relationType,
        status: relationship.status || existing?.status || "",
        intensity: relationship.intensity || existing?.intensity || 3,
        notes: relationship.notes || existing?.notes || "",
        updatedAt: existing?.updatedAt ?? new Date().toISOString(),
      });
    }

    setStoryWorldPreview(null);
    setStoryWorldAiMessage(
      "Tracked entities and relationships were applied. Review them before drafting forward."
    );
  }

  function discardStoryWorldSuggestion() {
    setStoryWorldPreview(null);
    setStoryWorldAiMessage("World scaffold discarded. No entities were changed.");
  }

  async function autocompleteSelectedChapterDetails() {
    if (!activeProject || !selectedChapter) return;

    const input = buildChapterDetailsAutocompleteInput(activeProject, selectedChapter.id);
    const context = buildChapterDetailsAutocompleteContext();
    setChapterDetailsAiStatus("running");
    setChapterDetailsAiError(null);
    setChapterDetailsAiMessage(null);
    setChapterDetailsPreview(null);

    try {
      const result = await runAiAction({
        action: "brainstorm",
        input,
        context,
        settings: resolved.settings,
      });
      const parsed = parseChapterDetailsSuggestion(result.text);

      if (
        !parsed.title &&
        !parsed.summary &&
        !parsed.objectives?.length &&
        !parsed.hook &&
        !parsed.storySoFar
      ) {
        throw new Error("AI response could not be mapped to the selected chapter fields.");
      }

      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter.id,
        action: result.action,
        status: "completed",
        model: result.model,
        providerBaseUrl: result.baseUrl,
        inputPreview: input,
        outputPreview: result.text,
        metadata: {
          feature: "chapter_details_autocomplete",
          chapterNumber: selectedChapter.number,
        },
      });

      setChapterDetailsPreview(parsed);
      setChapterDetailsAiStatus("idle");
      setChapterDetailsAiMessage(
        "Autocomplete ready. Review the proposed chapter details, then apply or discard."
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Selected chapter autocomplete failed";
      setChapterDetailsAiStatus("error");
      setChapterDetailsAiError(errorMessage);
      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter.id,
        action: "brainstorm",
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: input,
        outputPreview: "",
        metadata: {
          feature: "chapter_details_autocomplete",
          chapterNumber: selectedChapter.number,
          error: errorMessage,
        },
      });
      await openProject(projectIdValue);
    }
  }

  async function applyChapterDetailsSuggestion() {
    if (!selectedChapter || !chapterDetailsPreview) return;

    await saveChapter({
      ...selectedChapter,
      title: chapterDetailsPreview.title ?? selectedChapter.title,
      summary: chapterDetailsPreview.summary ?? selectedChapter.summary,
      objectives: chapterDetailsPreview.objectives ?? selectedChapter.objectives,
      hook: chapterDetailsPreview.hook ?? selectedChapter.hook,
      storySoFar: chapterDetailsPreview.storySoFar ?? selectedChapter.storySoFar,
    });

    setChapterDetailsPreview(null);
    setChapterDetailsAiMessage("Autocomplete applied to the selected chapter details.");
  }

  function discardChapterDetailsSuggestion() {
    setChapterDetailsPreview(null);
    setChapterDetailsAiMessage("Autocomplete discarded. Chapter details were not changed.");
  }

  async function computeSelectedChapterTrackers() {
    if (!activeProject || !selectedChapter) return;

    const input = buildChapterTrackerComputationInput(activeProject, selectedChapter.id);
    const context = buildChapterTrackerComputationContext();
    setChapterTrackersAiStatus("running");
    setChapterTrackersAiError(null);
    setChapterTrackersAiMessage(null);

    try {
      const result = await runAiAction({
        action: "consistency_check",
        input,
        context,
        settings: resolved.settings,
      });
      const parsed = parseChapterTrackerComputation(result.text, activeProject);

      if (parsed.reports.length === 0) {
        throw new Error("AI response could not be mapped to the chapter tracker fields.");
      }

      const existingByType = new Map(
        selectedChapterTrackerReports.map((report) => [report.trackerType, report])
      );

      for (const trackerType of listChapterTrackerTypes()) {
        const suggestion = parsed.reports.find((item) => item.trackerType === trackerType);
        if (!suggestion) continue;

        const existing = existingByType.get(trackerType);
        await saveChapterTrackerReport({
          id: existing?.id ?? "",
          projectId: projectIdValue,
          chapterId: selectedChapter.id,
          trackerType,
          previousState: suggestion.previousState,
          chapterEvolution: suggestion.chapterEvolution,
          finalState: suggestion.finalState,
          rawResponse: result.text,
          updatedAt: existing?.updatedAt ?? new Date().toISOString(),
        });
      }

      // `replaceEntityHistoryForChapter` deletes every existing row for the
      // chapter before writing the parsed set, so it is only safe on a complete
      // answer: a response cut off before the `[Entity History]` section parses
      // to `[]` and would destroy curated history behind a success toast.
      const historyReplaced = !result.truncated && parsed.entityHistory.length > 0;

      if (historyReplaced) {
        await replaceEntityHistoryForChapterAction(
          selectedChapter.id,
          parsed.entityHistory.map((entry) => ({
            id: "",
            projectId: projectIdValue,
            chapterId: selectedChapter.id,
            entityType: entry.entityType,
            entityId: entry.entityId,
            label: entry.label,
            note: entry.note,
            updatedAt: new Date().toISOString(),
          }))
        );
      }

      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter.id,
        action: result.action,
        status: "completed",
        model: result.model,
        providerBaseUrl: result.baseUrl,
        inputPreview: input,
        outputPreview: result.text,
        metadata: {
          feature: "chapter_tracker_computation",
          chapterNumber: selectedChapter.number,
          truncated: result.truncated ?? false,
          entityHistoryReplaced: historyReplaced,
          entityHistoryEntries: parsed.entityHistory.length,
        },
      });

      await openProject(projectIdValue);
      setChapterTrackersAiStatus("idle");
      setChapterTrackersAiMessage(
        historyReplaced
          ? "Per-chapter trackers and entity history timelines were recomputed from prior chapters and the current draft."
          : result.truncated
            ? "Per-chapter trackers were updated, but the model response was cut off before the entity history section. The existing entity history timelines were kept unchanged — re-run with a higher token limit to refresh them."
            : "Per-chapter trackers were updated, but the response contained no entity history entries. The existing entity history timelines were kept unchanged."
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Chapter tracker computation failed";
      setChapterTrackersAiStatus("error");
      setChapterTrackersAiError(errorMessage);
      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter.id,
        action: "consistency_check",
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: input,
        outputPreview: "",
        metadata: {
          feature: "chapter_tracker_computation",
          chapterNumber: selectedChapter.number,
          error: errorMessage,
        },
      });
      await openProject(projectIdValue);
    }
  }

  /** Resolve AI proposals to canon ids, run the deterministic verifier, persist as proposed deltas. */
  async function persistDeltaProposals(
    bundle: NonNullable<typeof activeProject>,
    chapter: NonNullable<typeof selectedChapter>,
    proposals: Awaited<ReturnType<typeof runChapterOrchestration>>["proposals"]
  ): Promise<{ created: number; skipped: number }> {
    const idByKey = new Map<string, string>();
    bundle.characters.forEach((item) =>
      idByKey.set(`character:${normalizeLookupKey(item.name)}`, item.id)
    );
    bundle.locations.forEach((item) =>
      idByKey.set(`location:${normalizeLookupKey(item.name)}`, item.id)
    );
    bundle.loreEntries.forEach((item) =>
      idByKey.set(`lore:${normalizeLookupKey(item.title)}`, item.id)
    );
    bundle.timeline.forEach((item) =>
      idByKey.set(`timeline_event:${normalizeLookupKey(item.label)}`, item.id)
    );

    let created = 0;
    let skipped = 0;

    for (const proposal of proposals) {
      let entityId = "";
      let entityLabel = proposal.entityName;

      if (proposal.entityType === "chapter") {
        entityId = chapter.id;
        entityLabel = chapterLabel(chapter);
      } else if (proposal.entityType === "relationship") {
        skipped += 1;
        continue;
      } else {
        const resolvedId = idByKey.get(
          `${proposal.entityType}:${normalizeLookupKey(proposal.entityName)}`
        );
        if (!resolvedId) {
          skipped += 1;
          continue;
        }
        entityId = resolvedId;
      }

      const verdict = verifyCanonDelta(
        { after: proposal.after, confidence: proposal.confidence, evidence: proposal.evidence },
        chapter.content
      );

      await saveDelta(
        createCanonDelta(projectIdValue, {
          chapterId: chapter.id,
          entityType: proposal.entityType,
          entityId,
          entityLabel,
          layer: proposal.layer,
          before: proposal.before,
          after: proposal.after,
          confidence: proposal.confidence,
          rationale: proposal.rationale,
          evidence: proposal.evidence,
          status: "proposed",
          source: "ai",
          verifierVerdict: verdict.verdict,
          verifierReason: verdict.reason,
        })
      );
      created += 1;
    }

    return { created, skipped };
  }

  async function analyzeChapterForDeltas() {
    const bundle = activeProject;
    if (!bundle || !selectedChapter) return;
    const chapter = selectedChapter;

    setDeltaAiStatus("running");
    setDeltaAiError(null);
    setDeltaAiMessage(null);
    setOrchestrationSteps([]);

    const runner: StructuredRunner = async (req) => {
      const result = await runAiAction({
        action: req.action,
        input: req.input,
        context: req.context,
        settings: resolved.settings,
        responseFormat: "json",
      });
      return result.text;
    };

    try {
      const orchestration = await runChapterOrchestration(
        bundle,
        chapter.id,
        DEFAULT_ORCHESTRATION_POLICY,
        runner
      );

      const { created, skipped } = await persistDeltaProposals(
        bundle,
        chapter,
        orchestration.proposals
      );

      // Audit findings become tracked revision issues (domain + severity + message).
      for (const diagnostic of orchestration.diagnostics) {
        await createRevisionIssue({
          chapterId: chapter.id,
          title: `${diagnostic.domain === "pov" ? "POV" : "Continuité"} · ${diagnostic.severity}`,
          description: diagnostic.message,
          severity: diagnostic.severity,
        });
      }

      setOrchestrationSteps(orchestration.steps);

      await logAiAction({
        projectId: projectIdValue,
        chapterId: chapter.id,
        action: "consistency_check",
        status: "completed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: orchestration.steps.map((step) => `${step.id}:${step.status}`).join(" → "),
        outputPreview: JSON.stringify(orchestration.steps),
        metadata: {
          feature: "chapter_orchestration",
          steps: orchestration.steps.map((step) => step.id),
          proposed: orchestration.proposals.length,
          created,
          skipped,
          diagnostics: orchestration.diagnostics.length,
        },
      });

      const anyFailed = orchestration.steps.some((step) => step.status === "failed");
      setDeltaAiStatus(anyFailed ? "error" : "idle");
      if (anyFailed) {
        setDeltaAiError("Certaines étapes de l'orchestration ont échoué (voir le journal de pipeline).");
      }
      setDeltaAiMessage(
        `${created} delta(s) proposé(s)${skipped > 0 ? `, ${skipped} ignoré(s)` : ""} · ` +
          `${orchestration.diagnostics.length} diagnostic(s) ajouté(s) aux problèmes de révision.`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Chapter orchestration failed";
      setDeltaAiStatus("error");
      setDeltaAiError(errorMessage);
      await logAiAction({
        projectId: projectIdValue,
        chapterId: chapter.id,
        action: "consistency_check",
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: "chapter_orchestration",
        outputPreview: "",
        metadata: { feature: "chapter_orchestration", error: errorMessage },
      });
    }
  }

  async function generateChapterDraft() {
    if (!activeProject || !selectedChapter) return;

    if (selectedChapter.aiLocked) {
      setChapterDraftAiStatus("error");
      setChapterDraftAiError(
        "This chapter is locked from AI rewrite. Unlock it in the Plan tab first."
      );
      return;
    }

    const input = buildChapterDraftInput(activeProject, selectedChapter.id);
    const context = buildChapterDraftContext();
    setChapterDraftAiStatus("running");
    setChapterDraftAiError(null);
    setChapterDraftAiMessage(null);

    try {
      const result = await runAiAction({
        action: "continue",
        input,
        context,
        styleProfile: "Manuscript-ready chapter prose with clean scene transitions",
        settings: resolved.settings,
      });

      setChapterDraftPreview(result.text.trim());
      setChapterDraftAiStatus("idle");
      setChapterDraftAiMessage(
        "Full chapter draft generated from the story bible, chapter details, scene cards, and trackers."
      );

      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter.id,
        action: result.action,
        status: "completed",
        model: result.model,
        providerBaseUrl: result.baseUrl,
        inputPreview: input,
        outputPreview: result.text,
        metadata: {
          feature: "chapter_draft_generation",
          chapterNumber: selectedChapter.number,
          usedSceneCards: selectedScenes.length,
        },
      });

      await openProject(projectIdValue);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Chapter draft generation failed";
      setChapterDraftAiStatus("error");
      setChapterDraftAiError(errorMessage);

      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter.id,
        action: "continue",
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: input,
        outputPreview: "",
        metadata: {
          feature: "chapter_draft_generation",
          chapterNumber: selectedChapter.number,
          error: errorMessage,
        },
      });

      await openProject(projectIdValue);
    }
  }

  async function applyGeneratedChapterDraft() {
    if (!selectedChapter || !chapterDraftPreview.trim() || selectedChapter.aiLocked) return;

    flushPendingEditorSave();
    if (selectedChapter.content.trim()) {
      await createSnapshot(
        `Before AI chapter draft ${new Date().toLocaleTimeString()}`,
        selectedChapter.id,
        editor?.getHTML() ?? selectedChapter.content
      );
    }

    const nextContent = plainTextToHtml(chapterDraftPreview);
    setEditorContent(nextContent);
    await saveChapter({
      ...selectedChapter,
      content: nextContent,
    });

    setChapterDraftPreview("");
    setChapterDraftAiMessage("Generated chapter draft inserted into the editor.");
  }

  /** Deterministic generation step: assemble the chapter preview from scene checkpoints. */
  function assembleChapterFromScenes() {
    const assembled = selectedScenes
      .map((scene) =>
        scene.draftText.trim() ? `${sceneLabel(scene)}\n\n${scene.draftText.trim()}` : ""
      )
      .filter(Boolean)
      .join("\n\n");
    setChapterDraftPreview(assembled);
    setChapterDraftAiMessage(t("draft.assembledFromScenes"));
  }

  async function runSceneDraftAgent(scene: Scene): Promise<SceneDraftAgentResult> {
    const bundle = activeProject;
    if (!bundle || !selectedChapter) return { text: "", truncated: false };
    const input = buildSceneDraftInput(bundle, selectedChapter.id, scene.id);
    const context = buildSceneDraftContext();
    const result = await runAiAction({
      action: "continue",
      input,
      context,
      settings: resolved.settings,
    });

    const existingProse = scene.draftText.trim();
    const generated = result.text.trim();

    // This agent writes straight to the scene card with no preview, so it must
    // never trade authored prose for an unusable answer: a cut-off or empty
    // response is reported as a failed checkpoint and the card is left alone.
    if (existingProse && (result.truncated || !generated)) {
      throw new Error(
        result.truncated
          ? "The model response was cut off; the existing scene draft was kept."
          : "The model returned no prose; the existing scene draft was kept."
      );
    }

    if (existingProse) {
      // Safety copy before an unattended overwrite, mirroring `applyAiDraft`.
      // Deliberately not tied to the chapter: `restoreSnapshot` writes a
      // snapshot payload into `chapter.content`, and a single scene's prose
      // would clobber the whole chapter on restore.
      await createSnapshot(
        `Before AI scene agent ${sceneLabel(scene)} ${new Date().toLocaleTimeString()}`,
        undefined,
        scene.draftText
      );
    }

    await saveScene({ ...scene, draftText: result.text });
    await logAiAction({
      projectId: projectIdValue,
      chapterId: selectedChapter.id,
      action: result.action,
      status: "completed",
      model: result.model,
      providerBaseUrl: result.baseUrl,
      inputPreview: input,
      outputPreview: result.text,
      metadata: {
        feature: "scene_draft_agent",
        chapterNumber: selectedChapter.number,
        sceneOrder: scene.order,
        truncated: result.truncated ?? false,
      },
    });
    return { text: result.text, truncated: result.truncated ?? false };
  }

  /** Concurrent multi-agent drafting: one small agent per scene, each a persisted checkpoint. */
  async function generateChapterDraftConcurrent() {
    const bundle = activeProject;
    if (!bundle || !selectedChapter) return;

    if (selectedChapter.aiLocked) {
      setChapterDraftConcurrentStatus("error");
      setChapterDraftAiError(t("draft.locked"));
      return;
    }

    const scenes = selectedScenes;
    if (scenes.length === 0) {
      setChapterDraftConcurrentStatus("error");
      setChapterDraftAiError(t("draft.noScenes"));
      return;
    }

    setChapterDraftConcurrentStatus("running");
    setChapterDraftAiError(null);
    setChapterDraftAiMessage(null);
    setSceneAgentRuns(
      scenes.map((scene) => ({ id: scene.id, label: sceneLabel(scene), status: "pending" as AgentStatus }))
    );

    const tasks: AgentTask<SceneDraftAgentResult>[] = scenes.map((scene) => ({
      id: scene.id,
      label: sceneLabel(scene),
      run: () => runSceneDraftAgent(scene),
    }));

    const outcomes = await runAgentPool(tasks, {
      // The gateway serializes generations, so a wider pool buys no throughput
      // and only stretches the tail latency of the slowest scene.
      concurrency: 1,
      onStart: ({ id }) =>
        setSceneAgentRuns((prev) =>
          prev.map((run) => (run.id === id ? { ...run, status: "running" } : run))
        ),
      onSettle: (outcome) =>
        setSceneAgentRuns((prev) =>
          prev.map((run) =>
            run.id === outcome.id
              ? { id: outcome.id, label: outcome.label, status: outcome.status, ms: outcome.ms, error: outcome.error }
              : run
          )
        ),
    });

    const okCount = outcomes.filter((outcome) => outcome.status === "ok").length;
    let truncatedCount = 0;

    // Assembly is honest about gaps: silently falling back to the seed text made
    // a chapter of three failed agents read as a finished draft.
    const assembled = scenes
      .map((scene) => {
        const outcome = outcomes.find((item) => item.id === scene.id);

        if (!outcome || outcome.status !== "ok" || !outcome.data) {
          const reason = outcome?.error ?? "the agent did not run";
          const kept = scene.draftText.trim();
          const marker = `[SCENE NOT GENERATED — ${reason}]`;
          return kept
            ? `${sceneLabel(scene)}\n\n${marker}\n${kept}`
            : `${sceneLabel(scene)}\n\n${marker}`;
        }

        const text = outcome.data.text.trim();
        if (!text) return "";
        if (outcome.data.truncated) {
          truncatedCount += 1;
          return `${sceneLabel(scene)}\n\n[SCENE INCOMPLETE — the model hit its token limit]\n${text}`;
        }
        return `${sceneLabel(scene)}\n\n${text}`;
      })
      .filter(Boolean)
      .join("\n\n");

    setChapterDraftPreview(assembled);
    const failed = outcomes.length - okCount;
    setChapterDraftConcurrentStatus(failed > 0 ? "error" : "idle");
    const summary = t("draft.concurrentDone", { ok: okCount, total: scenes.length });
    const notes: string[] = [];
    if (failed > 0) {
      notes.push(
        `${failed} scene${failed > 1 ? "s" : ""} failed and ${failed > 1 ? "are" : "is"} marked in the preview; their existing card text was left untouched.`
      );
    }
    if (truncatedCount > 0) {
      notes.push(`${truncatedCount} scene${truncatedCount > 1 ? "s were" : " was"} cut off by the token limit.`);
    }
    setChapterDraftAiMessage([summary, ...notes].join(" "));
  }

  /** Re-run a single failed/edited scene agent (checkpoint recovery). */
  async function retrySceneAgent(scene: Scene) {
    setSceneAgentRuns((prev) =>
      prev.some((run) => run.id === scene.id)
        ? prev.map((run) => (run.id === scene.id ? { ...run, status: "running" } : run))
        : [...prev, { id: scene.id, label: sceneLabel(scene), status: "running" as AgentStatus }]
    );
    const start = Date.now();
    try {
      await runSceneDraftAgent(scene);
      setSceneAgentRuns((prev) =>
        prev.map((run) =>
          run.id === scene.id ? { ...run, status: "ok", ms: Date.now() - start, error: undefined } : run
        )
      );
    } catch (error) {
      setSceneAgentRuns((prev) =>
        prev.map((run) =>
          run.id === scene.id
            ? {
                ...run,
                status: "failed",
                ms: Date.now() - start,
                error: error instanceof Error ? error.message : "failed",
              }
            : run
        )
      );
    }
  }

  async function suggestSceneCards() {
    if (!activeProject || !selectedChapter) return;

    const input = buildSceneCardSuggestionInput(activeProject, selectedChapter.id);
    const context = buildSceneCardSuggestionContext();
    setSceneCardsAiStatus("running");
    setSceneCardsAiError(null);
    setSceneCardsAiMessage(null);
    setSceneCardsPreview(null);

    try {
      const result = await runAiAction({
        action: "brainstorm",
        input,
        context,
        settings: resolved.settings,
      });
      const parsed = parseSceneCardSuggestions(result.text);

      if (parsed.length === 0) {
        throw new Error("AI response could not be mapped to scene cards.");
      }

      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter.id,
        action: result.action,
        status: "completed",
        model: result.model,
        providerBaseUrl: result.baseUrl,
        inputPreview: input,
        outputPreview: result.text,
        metadata: {
          feature: "scene_card_suggestion",
          chapterNumber: selectedChapter.number,
          scenesSuggested: parsed.length,
        },
      });

      setSceneCardsPreview(parsed);
      setSceneCardsAiStatus("idle");
      setSceneCardsAiMessage(
        `${parsed.length} scene card${parsed.length > 1 ? "s" : ""} proposed. Review below, then apply or discard.`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Scene card suggestion failed";
      setSceneCardsAiStatus("error");
      setSceneCardsAiError(errorMessage);
      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter?.id,
        action: "brainstorm",
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: input,
        outputPreview: "",
        metadata: {
          feature: "scene_card_suggestion",
          chapterNumber: selectedChapter.number,
          error: errorMessage,
        },
      });
      await openProject(projectIdValue);
    }
  }

  async function applySceneCardSuggestions() {
    if (!selectedChapter || !sceneCardsPreview || sceneCardsPreview.length === 0) return;

    const existingScenes = selectedScenes.slice().sort((a, b) => a.order - b.order);

    // Match on a stable identity (normalized title) instead of array position:
    // a short or reordered model response used to slide every suggestion onto
    // the wrong card and overwrite finished prose with beat seeds.
    const byTitle = new Map<string, Scene>();
    for (const scene of existingScenes) {
      const key = normalizeLookupKey(scene.title);
      if (key && !byTitle.has(key)) byTitle.set(key, scene);
    }

    const claimed = new Set<string>();
    let nextOrder = existingScenes.reduce((max, scene) => Math.max(max, scene.order), 0);
    let updated = 0;
    let created = 0;
    let keptDrafts = 0;

    for (const suggestion of sceneCardsPreview) {
      const key = normalizeLookupKey(suggestion.title);
      const match = key ? byTitle.get(key) : undefined;
      const existing = match && !claimed.has(match.id) ? match : undefined;
      const timestamp = new Date().toISOString();

      if (existing) {
        claimed.add(existing.id);
        updated += 1;
      } else {
        created += 1;
        nextOrder += 1;
      }

      // A card suggestion carries beat-level seed text; it must never replace
      // prose the author (or a scene agent) already wrote.
      const existingDraft = existing?.draftText ?? "";
      if (existingDraft.trim() && suggestion.draftText && suggestion.draftText !== existingDraft) {
        keptDrafts += 1;
      }

      await saveScene({
        id: existing?.id ?? createId("scene"),
        projectId: projectIdValue,
        chapterId: selectedChapter.id,
        order: existing?.order ?? nextOrder,
        title: suggestion.title || existing?.title || "",
        description: suggestion.description || existing?.description || "",
        location: suggestion.location || existing?.location || "",
        characters:
          suggestion.characters.length > 0 ? suggestion.characters : existing?.characters || [],
        notes: suggestion.notes || existing?.notes || "",
        draftText: existingDraft.trim() ? existingDraft : suggestion.draftText || existingDraft,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: existing?.updatedAt ?? timestamp,
      });
    }

    setSceneCardsPreview(null);
    setSceneCardsAiMessage(
      `${created} scene card${created === 1 ? "" : "s"} created and ${updated} matched by title and updated.` +
        (keptDrafts > 0
          ? ` ${keptDrafts} existing scene draft${keptDrafts === 1 ? " was" : "s were"} kept instead of the proposed seed text.`
          : "")
    );
  }

  function discardSceneCardSuggestions() {
    setSceneCardsPreview(null);
    setSceneCardsAiMessage("Scene card proposal discarded. Existing cards were not changed.");
  }

  async function generateSceneDraft(scene: Scene) {
    if (!activeProject || !selectedChapter) return;

    const input = buildSceneDraftInput(activeProject, selectedChapter.id, scene.id);
    const context = buildSceneDraftContext();
    setSceneDraftAiSceneId(scene.id);
    setSceneDraftAiError(null);
    setSceneDraftAiMessage(null);
    setSceneDraftPreview(null);

    try {
      const result = await runAiAction({
        action: "continue",
        input,
        context,
        settings: resolved.settings,
      });

      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter.id,
        action: result.action,
        status: "completed",
        model: result.model,
        providerBaseUrl: result.baseUrl,
        inputPreview: input,
        outputPreview: result.text,
        metadata: {
          feature: "scene_draft_generation",
          chapterNumber: selectedChapter.number,
          sceneOrder: scene.order,
        },
      });

      setSceneDraftPreview({ sceneId: scene.id, text: result.text });
      setSceneDraftAiSceneId(null);
      setSceneDraftAiMessage(
        `Draft proposed for scene ${scene.order}. Review below, then apply or discard.`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Scene draft generation failed";
      setSceneDraftAiSceneId(null);
      setSceneDraftAiError(errorMessage);
      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter.id,
        action: "continue",
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: input,
        outputPreview: "",
        metadata: {
          feature: "scene_draft_generation",
          chapterNumber: selectedChapter.number,
          sceneOrder: scene.order,
          error: errorMessage,
        },
      });
      await openProject(projectIdValue);
    }
  }

  async function applySceneDraftPreview() {
    if (!sceneDraftPreview) return;
    const scene = selectedScenes.find((item) => item.id === sceneDraftPreview.sceneId);
    if (!scene) {
      setSceneDraftPreview(null);
      return;
    }

    await saveScene({
      ...scene,
      draftText: sceneDraftPreview.text,
    });

    setSceneDraftPreview(null);
    setSceneDraftAiMessage(`Scene ${scene.order} draft text was updated from the proposal.`);
  }

  function discardSceneDraftPreview() {
    setSceneDraftPreview(null);
    setSceneDraftAiMessage("Scene draft proposal discarded.");
  }

  const mainClass = focusMode
    ? "grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]"
    : "grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]";

  return {
    t,
    activeProject,
    storeError,
    openProject,
    saveProjectMeta,
    saveStoryBible,
    saveChapter,
    saveChapterTrackerReport,
    addChapter,
    deleteChapter,
    reorderChapter,
    saveScene,
    addScene,
    deleteScene,
    reorderScene,
    saveCharacter,
    deleteCharacter,
    saveLocation,
    deleteLocation,
    saveLoreEntry,
    deleteLoreEntry,
    saveTimelineEventAction,
    deleteTimelineEventAction,
    saveRelationship,
    deleteRelationship,
    saveEntityProgressionAction,
    deleteEntityProgression,
    replaceEntityHistoryForChapterAction,
    createRevisionIssue,
    updateRevisionIssueStatus,
    deleteRevisionIssue,
    saveChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    saveAnnotation,
    deleteAnnotation,
    saveGoal,
    createSnapshot,
    restoreSnapshot,
    exportActiveProjectJson,
    exportActiveProjectMarkdown,
    exportActiveProjectBackup,
    resolved,
    saveScope,
    resetScope,
    activeTab,
    setActiveTab,
    selectedChapterId,
    setSelectedChapterId,
    focusMode,
    setFocusMode,
    readingMode,
    setReadingMode,
    searchText,
    setSearchText,
    replaceText,
    setReplaceText,
    aiAction,
    setAiAction,
    selectedAssistantId,
    setSelectedAssistantId,
    aiStatus,
    aiError,
    aiDraft,
    setAiDraft,
    aiDiff,
    setAiDiff,
    aiPromptContext,
    setAiPromptContext,
    outlineSearchVisible,
    setOutlineSearchVisible,
    storyBibleAiStatus,
    storyBibleAiError,
    storyBibleAiMessage,
    storyWorldAiStatus,
    storyWorldAiError,
    storyWorldAiMessage,
    chapterDetailsAiStatus,
    chapterDetailsAiError,
    chapterDetailsAiMessage,
    chapterTrackersAiStatus,
    chapterTrackersAiError,
    chapterTrackersAiMessage,
    chapterDraftAiStatus,
    chapterDraftAiError,
    chapterDraftAiMessage,
    chapterDraftPreview,
    setChapterDraftPreview,
    selectedHistoryEntityKey,
    setSelectedHistoryEntityKey,
    sceneCardsAiStatus,
    sceneCardsAiError,
    sceneCardsAiMessage,
    sceneDraftAiSceneId,
    sceneDraftAiError,
    sceneDraftAiMessage,
    searchReplaceMessage,
    deltaAiStatus,
    deltaAiError,
    deltaAiMessage,
    orchestrationSteps,
    storyBiblePreview,
    storyWorldPreview,
    chapterDetailsPreview,
    sceneCardsPreview,
    sceneDraftPreview,
    offline,
    project,
    projectIdValue,
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
    editor,
    setEditorContent,
    flushPendingEditorSave,
    mainClass,
    applySearchReplace,
    runAiPreview,
    applyAiDraft,
    appendSceneToDraft,
    createManualScene,
    confirmDeleteChapter,
    createIssueFromGrammar,
    addBlankLocation,
    addBlankLoreEntry,
    addBlankRelationship,
    addBlankProgression,
    exportPublishArtifacts,
    exportMarketingArtifacts,
    suggestStoryBible,
    applyStoryBibleSuggestion,
    discardStoryBibleSuggestion,
    suggestStoryWorldScaffold,
    suggestStoryWorldScaffoldConcurrent,
    worldAgentRuns,
    applyStoryWorldSuggestion,
    discardStoryWorldSuggestion,
    autocompleteSelectedChapterDetails,
    applyChapterDetailsSuggestion,
    discardChapterDetailsSuggestion,
    computeSelectedChapterTrackers,
    analyzeChapterForDeltas,
    approveDelta,
    rejectDelta,
    deleteDelta,
    generateChapterDraft,
    applyGeneratedChapterDraft,
    generateChapterDraftConcurrent,
    retrySceneAgent,
    assembleChapterFromScenes,
    chapterDraftConcurrentStatus,
    sceneAgentRuns,
    suggestSceneCards,
    applySceneCardSuggestions,
    discardSceneCardSuggestions,
    generateSceneDraft,
    applySceneDraftPreview,
    discardSceneDraftPreview,
  };
}

export type WorkspaceController = ReturnType<typeof useWorkspaceController>;
