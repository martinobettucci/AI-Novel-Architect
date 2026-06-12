"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import TopNav from "@/app/components/TopNav";
import type {
  AiActionType,
  Chapter,
  EntityHistoryEntry,
  ChapterTrackerReport,
  ChapterTrackerType,
  EntityProgression,
  NarrativeRelationship,
  RevisionIssue,
  Scene,
  TrackedEntityType,
} from "@/app/domain/models";
import {
  createEntityProgression,
  createId,
  createLocationProfile,
  createLoreEntry,
  createNarrativeRelationship,
} from "@/app/domain/defaults";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  ASSISTANTS,
  buildAssistantInput,
  type AssistantId,
} from "@/app/lib/ai/assistants";
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
  buildStoryWorldSuggestionContext,
  buildStoryWorldSuggestionInput,
  parseStoryWorldSuggestion,
  type StoryWorldSuggestion,
} from "@/app/lib/ai/storyBibleFollowup";
import { buildPreviewApply, runAiAction } from "@/app/lib/ai/client";
import type { DiffChunk } from "@/app/lib/ai/diff";
import { downloadBlob, downloadText } from "@/app/lib/download";
import {
  buildGrammarSuggestions,
  buildMarketingArtifacts,
  buildPublishingArtifacts,
  chapterTrackerReportsForChapter,
  checklistCompletion,
  computeChapterQualityScore,
  computeContinuityConflicts,
  entityHistoryForChapter,
  entityHistoryForEntity,
  logAiAction,
  progressionForEntity,
} from "@/app/lib/repository";
import { useProjectStore } from "@/app/stores/projectStore";
import { useSettingsStore } from "@/app/stores/settingsStore";

type WorkspaceTab =
  | "plan"
  | "bible"
  | "drafting"
  | "revision"
  | "publish"
  | "marketing"
  | "settings";

const TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "plan", label: "Plan" },
  { id: "bible", label: "Story Bible" },
  { id: "drafting", label: "Drafting" },
  { id: "revision", label: "Revision" },
  { id: "publish", label: "Publish" },
  { id: "marketing", label: "Marketing" },
  { id: "settings", label: "Settings" },
];

function tabClass(active: boolean): string {
  return active
    ? "rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
    : "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100";
}

function chapterLabel(chapter: Chapter): string {
  return `Ch.${chapter.number} ${chapter.title.trim() || "Untitled chapter"}`;
}

function sceneLabel(scene: Scene): string {
  return scene.title.trim() || `Untitled scene ${scene.order}`;
}

function entityTypeLabel(type: TrackedEntityType): string {
  return type.replace(/_/g, " ");
}

function historyEntityTypeLabel(type: EntityHistoryEntry["entityType"]): string {
  return type === "relationship" ? "relationship" : entityTypeLabel(type);
}

function chapterTrackerLabel(type: ChapterTrackerType): string {
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

function asProjectLanguage(value: string): "fr" | "en" {
  return value === "en" ? "en" : "fr";
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function downloadArtifacts(prefix: string, content: Record<string, string>) {
  Object.entries(content).forEach(([name, value]) => {
    const extension = name.endsWith("checklist") ? "txt" : "md";
    downloadText(`${prefix}-${name}.${extension}`, value);
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainTextToHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .split(/\n\s*\n/)
    .map((paragraph) =>
      `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`
    )
    .join("");
}

function plainTextWordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const SCENE_FIELD_HELP = {
  title: "Short working label for the scene. Use the dramatic turn or key event.",
  description:
    "What happens in the scene from start to finish. Focus on action, conflict, and outcome.",
  location:
    "Primary setting for the scene. Use a consistent place name to help continuity checks.",
  characters:
    "List the characters present in the scene, separated by commas.",
  notes:
    "Continuity anchors, subtext, props, reveals, POV constraints, or reminders for later scenes.",
  draftText:
    "A prose seed or beat outline that can be expanded into full scene draft text.",
} as const;

export default function WorkspaceClient({ projectId }: { projectId: string }) {
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
  const [selectedHistoryEntityKey, setSelectedHistoryEntityKey] = useState<string>("");
  const [sceneCardsAiStatus, setSceneCardsAiStatus] =
    useState<"idle" | "running" | "error">("idle");
  const [sceneCardsAiError, setSceneCardsAiError] = useState<string | null>(null);
  const [sceneCardsAiMessage, setSceneCardsAiMessage] = useState<string | null>(null);
  const [sceneDraftAiSceneId, setSceneDraftAiSceneId] = useState<string | null>(null);
  const [sceneDraftAiError, setSceneDraftAiError] = useState<string | null>(null);
  const [sceneDraftAiMessage, setSceneDraftAiMessage] = useState<string | null>(null);
  const [searchReplaceMessage, setSearchReplaceMessage] = useState<string | null>(null);
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
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    void openProject(projectId);
    void loadSettings(projectId);
  }, [loadSettings, openProject, projectId]);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const project = activeProject?.project;
  const projectIdValue = project?.id ?? "";

  const selectedChapter = useMemo(
    () =>
      activeProject?.chapters.find((chapter) => chapter.id === selectedChapterId) ??
      activeProject?.chapters[0] ??
      null,
    [activeProject, selectedChapterId]
  );

  useEffect(() => {
    if (!activeProject) return;

    const chapterIds = new Set(activeProject.chapters.map((chapter) => chapter.id));
    if (selectedChapterId && chapterIds.has(selectedChapterId)) {
      return;
    }

    setSelectedChapterId(activeProject.chapters[0]?.id ?? "");
  }, [activeProject, selectedChapterId]);

  useEffect(() => {
    // Chapter-scoped AI previews must never survive a chapter switch, or a
    // proposal computed for one chapter could be applied to another.
    setChapterDraftPreview("");
    setChapterDraftAiError(null);
    setChapterDraftAiMessage(null);
    setChapterDetailsPreview(null);
    setChapterDetailsAiError(null);
    setChapterDetailsAiMessage(null);
    setSceneCardsPreview(null);
    setSceneCardsAiError(null);
    setSceneCardsAiMessage(null);
    setSceneDraftPreview(null);
    setSceneDraftAiError(null);
    setSceneDraftAiMessage(null);
  }, [selectedChapter?.id]);

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

  useEffect(() => {
    if (historyEntityOptions.length === 0) {
      if (selectedHistoryEntityKey) {
        setSelectedHistoryEntityKey("");
      }
      return;
    }

    const exists = historyEntityOptions.some((item) => item.key === selectedHistoryEntityKey);
    if (!exists) {
      setSelectedHistoryEntityKey(historyEntityOptions[0].key);
    }
  }, [historyEntityOptions, selectedHistoryEntityKey]);

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

  const chapterScore = useMemo(() => {
    if (!selectedChapter) return 0;
    return computeChapterQualityScore(
      selectedChapter,
      resolved.settings.qa.rubricWeights
    );
  }, [resolved.settings.qa.rubricWeights, selectedChapter]);

  const chapterGrammarSuggestions = useMemo(() => {
    if (!selectedChapter) return [];
    return buildGrammarSuggestions(selectedChapter.content);
  }, [selectedChapter]);

  // The editor save flow is ref-based: TipTap's onUpdate closure is created
  // once, so reading selectedChapter directly would save typed content into
  // whichever chapter was selected when the editor mounted.
  const selectedChapterRef = useRef<Chapter | null>(null);
  selectedChapterRef.current = selectedChapter;
  const editorChapterIdRef = useRef<string | null>(null);
  const pendingEditorSaveRef = useRef<{ chapter: Chapter; content: string } | null>(null);
  const editorSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingEditorSave = useCallback(() => {
    if (editorSaveTimerRef.current) {
      clearTimeout(editorSaveTimerRef.current);
      editorSaveTimerRef.current = null;
    }
    const pending = pendingEditorSaveRef.current;
    pendingEditorSaveRef.current = null;
    if (pending) {
      void saveChapter({ ...pending.chapter, content: pending.content });
    }
  }, [saveChapter]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder:
          "Start writing. AI actions always apply through preview mode in this workspace.",
      }),
    ],
    content: selectedChapter?.content ?? "",
    editable: !readingMode,
    onUpdate: ({ editor: instance }) => {
      const chapter = selectedChapterRef.current;
      if (!chapter || !instance.isEditable) return;
      pendingEditorSaveRef.current = { chapter, content: instance.getHTML() };
      if (editorSaveTimerRef.current) clearTimeout(editorSaveTimerRef.current);
      editorSaveTimerRef.current = setTimeout(flushPendingEditorSave, 500);
    },
  });

  const setEditorContent = useCallback(
    (content: string) => {
      if (!editor) return;
      editor.commands.setContent(content || "", { emitUpdate: false });
    },
    [editor]
  );

  useEffect(() => {
    if (!editor || !selectedChapter) return;
    if (editorChapterIdRef.current !== selectedChapter.id) {
      // Save any pending edits of the previous chapter before loading the new
      // one, so fast chapter switches never mix contents.
      flushPendingEditorSave();
      editorChapterIdRef.current = selectedChapter.id;
      setEditorContent(selectedChapter.content);
    } else if (
      !pendingEditorSaveRef.current &&
      editor.getHTML() !== selectedChapter.content &&
      !editor.isFocused
    ) {
      // External content change (AI apply, snapshot restore, search/replace).
      setEditorContent(selectedChapter.content);
    }
    editor.setEditable(!readingMode);
  }, [editor, flushPendingEditorSave, readingMode, selectedChapter, setEditorContent]);

  // Persist any pending edit when the workspace unmounts.
  useEffect(() => flushPendingEditorSave, [flushPendingEditorSave]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const command = event.metaKey || event.ctrlKey;
      const chapter = selectedChapterRef.current;
      if (!command || !chapter) return;

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!editor) return;
        pendingEditorSaveRef.current = null;
        if (editorSaveTimerRef.current) clearTimeout(editorSaveTimerRef.current);
        void saveChapter({ ...chapter, content: editor.getHTML() });
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        setOutlineSearchVisible(true);
      }

      if (event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFocusMode((current) => !current);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor, saveChapter]);

  if (!project || !activeProject) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-slate-600">Loading workspace…</main>
      </div>
    );
  }

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
      if (!source.includes(searchText)) continue;
      const occurrences = source.split(searchText).length - 1;
      const nextContent = source.split(searchText).join(replaceText);
      await saveChapter({
        ...chapter,
        content: nextContent,
      });
      if (chapter.id === selectedChapter?.id) {
        setEditorContent(nextContent);
      }
      replacedCount += occurrences;
      chapterCount += 1;
    }

    setSearchReplaceMessage(
      replacedCount === 0
        ? `No match found for "${searchText}".`
        : `Replaced ${replacedCount} occurrence${replacedCount > 1 ? "s" : ""} in ${chapterCount} chapter${chapterCount > 1 ? "s" : ""}.`
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
        },
      });

      await openProject(projectIdValue);
      setChapterTrackersAiStatus("idle");
      setChapterTrackersAiMessage(
        "Per-chapter trackers and entity history timelines were recomputed from prior chapters and the current draft."
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

  async function generateChapterDraft() {
    if (!activeProject || !selectedChapter) return;

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
    if (!selectedChapter || !chapterDraftPreview.trim()) return;

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

    for (const [index, suggestion] of sceneCardsPreview.entries()) {
      const existing = existingScenes[index];
      const timestamp = new Date().toISOString();

      await saveScene({
        id: existing?.id ?? createId("scene"),
        projectId: projectIdValue,
        chapterId: selectedChapter.id,
        order: index + 1,
        title: suggestion.title || existing?.title || "",
        description: suggestion.description || existing?.description || "",
        location: suggestion.location || existing?.location || "",
        characters:
          suggestion.characters.length > 0 ? suggestion.characters : existing?.characters || [],
        notes: suggestion.notes || existing?.notes || "",
        draftText: suggestion.draftText || existing?.draftText || "",
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: existing?.updatedAt ?? timestamp,
      });
    }

    setSceneCardsPreview(null);
    setSceneCardsAiMessage("Proposed scene cards were applied to this chapter.");
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

  function renderSelectedChapterDetails(options?: {
    containerClassName?: string;
    showOpenInDraftingButton?: boolean;
  }) {
    const {
      containerClassName = "rounded-xl border border-slate-200 bg-slate-50 p-4",
      showOpenInDraftingButton = false,
    } = options ?? {};

    return (
      <div className={containerClassName}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Selected chapter details</h3>
          <button
            onClick={() => void autocompleteSelectedChapterDetails()}
            disabled={!selectedChapter || chapterDetailsAiStatus === "running"}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {chapterDetailsAiStatus === "running" ? "Autocompleting..." : "AI autocomplete"}
          </button>
        </div>
        {chapterDetailsAiMessage && (
          <p className="mt-3 text-sm text-emerald-700">{chapterDetailsAiMessage}</p>
        )}
        {chapterDetailsAiError && (
          <p className="mt-3 text-sm text-rose-700">{chapterDetailsAiError}</p>
        )}
        {chapterDetailsPreview && selectedChapter && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              AI proposal — not applied yet
            </p>
            <dl className="mt-2 space-y-2 text-sm text-slate-800">
              {chapterDetailsPreview.title && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</dt>
                  <dd>{chapterDetailsPreview.title}</dd>
                </div>
              )}
              {chapterDetailsPreview.summary && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</dt>
                  <dd className="whitespace-pre-wrap">{chapterDetailsPreview.summary}</dd>
                </div>
              )}
              {chapterDetailsPreview.objectives && chapterDetailsPreview.objectives.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Objectives</dt>
                  <dd>{chapterDetailsPreview.objectives.join(", ")}</dd>
                </div>
              )}
              {chapterDetailsPreview.hook && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hook</dt>
                  <dd className="whitespace-pre-wrap">{chapterDetailsPreview.hook}</dd>
                </div>
              )}
              {chapterDetailsPreview.storySoFar && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Story so far</dt>
                  <dd className="whitespace-pre-wrap">{chapterDetailsPreview.storySoFar}</dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => void applyChapterDetailsSuggestion()}
                className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Apply proposal
              </button>
              <button
                onClick={discardChapterDetailsSuggestion}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
              >
                Discard
              </button>
            </div>
          </div>
        )}
        {selectedChapter ? (
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm text-slate-700">
              Title
              <input
                value={selectedChapter.title}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    title: event.target.value,
                  })
                }
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              Summary
              <textarea
                rows={3}
                value={selectedChapter.summary}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    summary: event.target.value,
                  })
                }
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              Objectives (comma separated)
              <input
                value={selectedChapter.objectives.join(", ")}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    objectives: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              Hook
              <textarea
                rows={2}
                value={selectedChapter.hook}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    hook: event.target.value,
                  })
                }
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              Story so far
              <textarea
                rows={2}
                value={selectedChapter.storySoFar}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    storySoFar: event.target.value,
                  })
                }
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-700">
                Status
                <select
                  value={selectedChapter.status}
                  onChange={(event) =>
                    void saveChapter({
                      ...selectedChapter,
                      status: event.target.value as Chapter["status"],
                    })
                  }
                  className="rounded border border-slate-300 px-2 py-1"
                >
                  <option value="draft">Draft</option>
                  <option value="in-progress">In progress</option>
                  <option value="revision">Revision</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Word target
                <input
                  type="number"
                  min={0}
                  value={selectedChapter.wordCountTarget}
                  onChange={(event) =>
                    void saveChapter({
                      ...selectedChapter,
                      wordCountTarget: Number(event.target.value) || 0,
                    })
                  }
                  className="rounded border border-slate-300 px-2 py-1"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {showOpenInDraftingButton && (
                <button
                  onClick={() => setActiveTab("drafting")}
                  className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Open in drafting
                </button>
              )}
              <button
                onClick={() => void deleteChapter(selectedChapter.id)}
                className="rounded border border-rose-300 px-3 py-2 text-sm text-rose-700"
              >
                Delete chapter
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Select a chapter to edit its summary, objective, hook, and completion state.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <TopNav />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {storeError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            Save failed: {storeError}. The view was reloaded from the last persisted state.
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("nav.workspace")}</p>
            <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
            <p className="text-sm text-slate-600">
              {project.genre} · {project.audience} · {project.targetWordCount.toLocaleString()} words target
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-1 font-semibold ${offline ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              {offline ? "Offline" : "Online"}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
              Queued AI tasks: {pendingAiCount}
            </span>
            <Link href="/" className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50">
              Back to dashboard
            </Link>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={tabClass(activeTab === tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "plan" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">Project metadata</h2>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-sm text-slate-700">
                  Title
                  <input
                    value={project.title}
                    onChange={(event) =>
                      void saveProjectMeta({
                        title: event.target.value,
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  Synopsis
                  <textarea
                    rows={4}
                    value={project.synopsis}
                    onChange={(event) =>
                      void saveProjectMeta({
                        synopsis: event.target.value,
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">Continuity conflicts</h2>
              {continuityConflicts.length === 0 ? (
                <p className="mt-3 text-sm text-emerald-700">No continuity conflicts detected.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {continuityConflicts.map((conflict) => (
                    <li key={conflict.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase">
                        {conflict.type}
                      </span>
                      {conflict.message}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Chapter structure</h2>
                <button
                  onClick={() => void addChapter()}
                  className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
                >
                  Add chapter
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div className="space-y-3">
                  {activeProject.chapters.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                      This project starts with an empty structure. Add chapters only where you need them.
                    </div>
                  )}

                  {activeProject.chapters
                    .sort((a, b) => a.number - b.number)
                    .map((chapter) => {
                      const scenes = activeProject.scenes.filter((scene) => scene.chapterId === chapter.id);
                      const selected = selectedChapter?.id === chapter.id;
                      return (
                        <div
                          key={chapter.id}
                          className={`rounded-xl border p-4 ${
                            selected ? "border-teal-300 bg-teal-50/60" : "border-slate-200"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <button
                              onClick={() => setSelectedChapterId(chapter.id)}
                              className="min-w-0 text-left"
                            >
                              <p className="text-sm font-semibold text-slate-900">{chapterLabel(chapter)}</p>
                              <p className="text-xs text-slate-600">
                                {chapter.summary || "No summary yet"}
                              </p>
                            </button>

                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                onClick={() => void reorderChapter(chapter.number, chapter.number - 1)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs"
                              >
                                Up
                              </button>
                              <button
                                onClick={() => void reorderChapter(chapter.number, chapter.number + 1)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs"
                              >
                                Down
                              </button>
                              <button
                                onClick={() =>
                                  void saveChapter({
                                    ...chapter,
                                    aiLocked: !chapter.aiLocked,
                                  })
                                }
                                className={`rounded px-2 py-1 text-xs ${
                                  chapter.aiLocked
                                    ? "border border-rose-300 bg-rose-50 text-rose-700"
                                    : "border border-slate-300 text-slate-700"
                                }`}
                              >
                                {chapter.aiLocked ? "AI Locked" : "AI Unlocked"}
                              </button>
                              <button
                                onClick={() => void createManualScene(chapter.id)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs"
                                title="Create a blank scene card in this chapter and open it in the editor."
                              >
                                Add scene
                              </button>
                              <button
                                onClick={() => void deleteChapter(chapter.id)}
                                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 pl-3">
                            {scenes.length === 0 && (
                              <p className="text-xs text-slate-500">No scenes in this chapter yet.</p>
                            )}
                            {scenes
                              .sort((a, b) => a.order - b.order)
                              .map((scene) => (
                                <div
                                  key={scene.id}
                                  className="flex items-center justify-between gap-2 text-xs text-slate-600"
                                >
                                  <span>
                                    {scene.order}. {sceneLabel(scene)}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => void reorderScene(chapter.id, scene.order, scene.order - 1)}
                                      className="rounded border border-slate-300 px-1.5 py-0.5"
                                    >
                                      Up
                                    </button>
                                    <button
                                      onClick={() => void reorderScene(chapter.id, scene.order, scene.order + 1)}
                                      className="rounded border border-slate-300 px-1.5 py-0.5"
                                    >
                                      Down
                                    </button>
                                    <button
                                      onClick={() => void deleteScene(scene.id)}
                                      className="rounded border border-rose-300 px-1.5 py-0.5 text-rose-700"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {renderSelectedChapterDetails({
                  containerClassName: "rounded-xl border border-slate-200 bg-slate-50 p-4",
                  showOpenInDraftingButton: true,
                })}
              </div>
            </article>
          </section>
        )}

        {activeTab === "bible" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900">Story Bible</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void suggestStoryBible()}
                    disabled={storyBibleAiStatus === "running"}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {storyBibleAiStatus === "running" ? "Suggesting..." : "AI suggest core"}
                  </button>
                  <button
                    onClick={() => void suggestStoryWorldScaffold()}
                    disabled={storyWorldAiStatus === "running"}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-40"
                  >
                    {storyWorldAiStatus === "running" ? "Scaffolding..." : "AI suggest world"}
                  </button>
                </div>
              </div>
              {storyBibleAiMessage && (
                <p className="mt-3 text-sm text-emerald-700">{storyBibleAiMessage}</p>
              )}
              {storyBibleAiError && (
                <p className="mt-3 text-sm text-rose-700">{storyBibleAiError}</p>
              )}
              {storyWorldAiMessage && (
                <p className="mt-3 text-sm text-emerald-700">{storyWorldAiMessage}</p>
              )}
              {storyWorldAiError && (
                <p className="mt-3 text-sm text-rose-700">{storyWorldAiError}</p>
              )}
              {storyBiblePreview && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    AI proposal — not applied yet
                  </p>
                  <dl className="mt-2 space-y-2 text-sm text-slate-800">
                    {storyBiblePreview.premise && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Premise</dt>
                        <dd className="whitespace-pre-wrap">{storyBiblePreview.premise}</dd>
                      </div>
                    )}
                    {storyBiblePreview.themes && storyBiblePreview.themes.length > 0 && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Themes</dt>
                        <dd>{storyBiblePreview.themes.join(", ")}</dd>
                      </div>
                    )}
                    {storyBiblePreview.stakes && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stakes</dt>
                        <dd className="whitespace-pre-wrap">{storyBiblePreview.stakes}</dd>
                      </div>
                    )}
                    {storyBiblePreview.worldRules && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">World rules</dt>
                        <dd className="whitespace-pre-wrap">{storyBiblePreview.worldRules}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void applyStoryBibleSuggestion()}
                      className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Apply proposal
                    </button>
                    <button
                      onClick={discardStoryBibleSuggestion}
                      className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
              {storyWorldPreview && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    AI world scaffold proposal — not applied yet
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-800">
                    {storyWorldPreview.characters.length > 0 && (
                      <li>
                        <span className="font-semibold">Characters ({storyWorldPreview.characters.length}):</span>{" "}
                        {storyWorldPreview.characters.map((item) => item.name).join(", ")}
                      </li>
                    )}
                    {storyWorldPreview.locations.length > 0 && (
                      <li>
                        <span className="font-semibold">Locations ({storyWorldPreview.locations.length}):</span>{" "}
                        {storyWorldPreview.locations.map((item) => item.name).join(", ")}
                      </li>
                    )}
                    {storyWorldPreview.lore.length > 0 && (
                      <li>
                        <span className="font-semibold">Lore ({storyWorldPreview.lore.length}):</span>{" "}
                        {storyWorldPreview.lore.map((item) => item.title).join(", ")}
                      </li>
                    )}
                    {storyWorldPreview.timeline.length > 0 && (
                      <li>
                        <span className="font-semibold">Timeline ({storyWorldPreview.timeline.length}):</span>{" "}
                        {storyWorldPreview.timeline.map((item) => item.label).join(", ")}
                      </li>
                    )}
                    {storyWorldPreview.relationships.length > 0 && (
                      <li>
                        <span className="font-semibold">Relationships ({storyWorldPreview.relationships.length}):</span>{" "}
                        {storyWorldPreview.relationships
                          .map((item) => `${item.source} → ${item.relationType} → ${item.target}`)
                          .join(" · ")}
                      </li>
                    )}
                  </ul>
                  <p className="mt-2 text-xs text-slate-600">
                    Existing entities with the same name are updated, new ones are created. Nothing is deleted.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void applyStoryWorldSuggestion()}
                      className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Apply scaffold
                    </button>
                    <button
                      onClick={discardStoryWorldSuggestion}
                      className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-3 text-sm text-slate-600">
                Use the core suggestion to fill premise, themes, stakes, and world rules. Use the world suggestion to scaffold characters, locations, lore, timeline, and relationships from the same canon.
              </p>
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1 text-sm text-slate-700">
                  Premise
                  <textarea
                    rows={3}
                    value={activeProject.bible.premise}
                    onChange={(event) =>
                      void saveStoryBible({
                        ...activeProject.bible,
                        premise: event.target.value,
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  Themes (comma separated)
                  <input
                    value={activeProject.bible.themes.join(", ")}
                    onChange={(event) =>
                      void saveStoryBible({
                        ...activeProject.bible,
                        themes: event.target.value
                          .split(",")
                          .map((entry) => entry.trim())
                          .filter(Boolean),
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  Stakes
                  <textarea
                    rows={2}
                    value={activeProject.bible.stakes}
                    onChange={(event) =>
                      void saveStoryBible({
                        ...activeProject.bible,
                        stakes: event.target.value,
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  World rules
                  <textarea
                    rows={4}
                    value={activeProject.bible.worldRules}
                    onChange={(event) =>
                      void saveStoryBible({
                        ...activeProject.bible,
                        worldRules: event.target.value,
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Entity history timelines</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Story-wide entities stay global here. Their chapter-by-chapter history is tracked in a parallel timeline store and visualized below.
                  </p>
                </div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Compute from Drafting
                </p>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
                <label className="grid gap-1 text-sm text-slate-700">
                  Story-wide entity or relationship
                  <select
                    value={selectedHistoryEntity?.key ?? ""}
                    onChange={(event) => setSelectedHistoryEntityKey(event.target.value)}
                    className="rounded border border-slate-300 px-3 py-2"
                  >
                    {historyEntityOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {selectedHistoryEntity ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Story-wide record
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {selectedHistoryEntity.label}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] uppercase tracking-wide text-slate-500">
                          {historyEntityTypeLabel(selectedHistoryEntity.type)}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {selectedHistoryTimeline.map(({ chapter, entries }) => (
                          <div
                            key={chapter.id}
                            className="rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {chapterLabel(chapter)}
                              </p>
                              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                                {entries.length > 0 ? `${entries.length} note${entries.length > 1 ? "s" : ""}` : "no change"}
                              </span>
                            </div>
                            {entries.length > 0 ? (
                              <div className="mt-2 space-y-2">
                                {entries.map((entry) => (
                                  <p key={entry.id} className="text-sm text-slate-700">
                                    {entry.note || "No history note recorded."}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-slate-500">
                                No chapter-linked history recorded for this entity in this chapter.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Add story-wide entities or relationships to start building a chapter timeline.
                    </p>
                  )}
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">Characters</h2>
              <button
                onClick={() =>
                  void saveCharacter({
                    id: createId("char"),
                    projectId: projectIdValue,
                    name: "",
                    role: "",
                    motivation: "",
                    arc: "",
                    voice: "",
                    relationships: "",
                    notes: "",
                    updatedAt: new Date().toISOString(),
                  })
                }
                className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                Add character
              </button>
              <div className="mt-3 space-y-3">
                {activeProject.characters.map((character) => (
                  <div key={character.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <input
                        value={character.name}
                        onChange={(event) =>
                          void saveCharacter({
                            ...character,
                            name: event.target.value,
                          })
                        }
                        placeholder="Character name"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void deleteCharacter(character.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={character.arc}
                      onChange={(event) =>
                        void saveCharacter({
                          ...character,
                          arc: event.target.value,
                        })
                      }
                      placeholder="Arc"
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Locations</h2>
                <button
                  onClick={addBlankLocation}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Add location
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {activeProject.locations.map((location) => (
                  <div key={location.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        value={location.name}
                        onChange={(event) =>
                          void saveLocation({
                            ...location,
                            name: event.target.value,
                          })
                        }
                        placeholder="Location name"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void deleteLocation(location.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={location.role}
                        onChange={(event) =>
                          void saveLocation({
                            ...location,
                            role: event.target.value,
                          })
                        }
                        placeholder="Role"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={location.narrativeStatus}
                        onChange={(event) =>
                          void saveLocation({
                            ...location,
                            narrativeStatus: event.target.value,
                          })
                        }
                        placeholder="Narration status"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={location.description}
                      onChange={(event) =>
                        void saveLocation({
                          ...location,
                          description: event.target.value,
                        })
                      }
                      placeholder="Description"
                      className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Lore</h2>
                <button
                  onClick={addBlankLoreEntry}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Add lore item
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {activeProject.loreEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        value={entry.title}
                        onChange={(event) =>
                          void saveLoreEntry({
                            ...entry,
                            title: event.target.value,
                          })
                        }
                        placeholder="Lore title"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void deleteLoreEntry(entry.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={entry.category}
                        onChange={(event) =>
                          void saveLoreEntry({
                            ...entry,
                            category: event.target.value,
                          })
                        }
                        placeholder="Category"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={entry.status}
                        onChange={(event) =>
                          void saveLoreEntry({
                            ...entry,
                            status: event.target.value,
                          })
                        }
                        placeholder="Status"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={entry.description}
                      onChange={(event) =>
                        void saveLoreEntry({
                          ...entry,
                          description: event.target.value,
                        })
                      }
                      placeholder="Description"
                      className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Timeline</h2>
                <button
                  onClick={() =>
                    void saveTimelineEventAction({
                      id: createId("timeline"),
                      projectId: projectIdValue,
                      order: activeProject.timeline.length + 1,
                      chapterId: selectedChapter?.id,
                      label: "",
                      details: "",
                      impact: "",
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Add timeline event
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {activeProject.timeline
                  .sort((a, b) => a.order - b.order)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="grid gap-2 rounded-lg border border-slate-200 p-3 lg:grid-cols-[140px_minmax(0,1fr)_120px_auto]"
                    >
                      <input
                        value={event.label}
                        onChange={(e) =>
                          void saveTimelineEventAction({
                            ...event,
                            label: e.target.value,
                          })
                        }
                        placeholder="Event label"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={event.details}
                        onChange={(e) =>
                          void saveTimelineEventAction({
                            ...event,
                            details: e.target.value,
                          })
                        }
                        placeholder="Details"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={event.impact}
                        onChange={(e) =>
                          void saveTimelineEventAction({
                            ...event,
                            impact: e.target.value,
                          })
                        }
                        placeholder="Impact"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void deleteTimelineEventAction(event.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Relationships</h2>
                <button
                  onClick={addBlankRelationship}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Add relationship
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {activeProject.relationships.map((relationship) => (
                  <div key={relationship.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="grid gap-2 lg:grid-cols-[150px_1fr_150px_1fr_140px_100px_auto]">
                      <select
                        value={relationship.sourceType}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            sourceType: event.target.value as NarrativeRelationship["sourceType"],
                            sourceId: "",
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="character">Character</option>
                        <option value="location">Location</option>
                        <option value="lore">Lore</option>
                        <option value="timeline_event">Timeline</option>
                      </select>
                      <select
                        value={relationship.sourceId}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            sourceId: event.target.value,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">Select source</option>
                        {trackedEntityOptions
                          .filter((option) => option.type === relationship.sourceType)
                          .map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                      </select>
                      <select
                        value={relationship.targetType}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            targetType: event.target.value as NarrativeRelationship["targetType"],
                            targetId: "",
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="character">Character</option>
                        <option value="location">Location</option>
                        <option value="lore">Lore</option>
                        <option value="timeline_event">Timeline</option>
                      </select>
                      <select
                        value={relationship.targetId}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            targetId: event.target.value,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">Select target</option>
                        {trackedEntityOptions
                          .filter((option) => option.type === relationship.targetType)
                          .map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                      </select>
                      <input
                        value={relationship.relationType}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            relationType: event.target.value,
                          })
                        }
                        placeholder="Relation type"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={relationship.intensity}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            intensity: Number(event.target.value) || 1,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void deleteRelationship(relationship.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <input
                        value={relationship.status}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            status: event.target.value,
                          })
                        }
                        placeholder="Status"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={relationship.notes}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            notes: event.target.value,
                          })
                        }
                        placeholder="Evolution notes"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Entity progression tracker</h2>
                <button
                  onClick={addBlankProgression}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Add progression entry
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Track start state, evidence, delta, end state, knowledge, belief, inventory, and narration status chapter by chapter.
              </p>
              <div className="mt-3 space-y-3">
                {activeProject.entityProgression.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="grid gap-2 lg:grid-cols-[140px_1fr_140px_1fr_auto]">
                      <select
                        value={entry.entityType}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            entityType: event.target.value as EntityProgression["entityType"],
                            entityId: "",
                            label: "",
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="character">Character</option>
                        <option value="location">Location</option>
                        <option value="lore">Lore</option>
                        <option value="timeline_event">Timeline</option>
                      </select>
                      <select
                        value={entry.entityId}
                        onChange={(event) => {
                          const option = trackedEntityOptions.find((item) => item.id === event.target.value);
                          void saveEntityProgressionAction({
                            ...entry,
                            entityId: event.target.value,
                            label: option?.label ?? entry.label,
                          });
                        }}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">Select entity</option>
                        {trackedEntityOptions
                          .filter((option) => option.type === entry.entityType)
                          .map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                      </select>
                      <select
                        value={entry.chapterId ?? ""}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            chapterId: event.target.value || undefined,
                            sceneId: undefined,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">Story-level</option>
                        {activeProject.chapters.map((chapter) => (
                          <option key={chapter.id} value={chapter.id}>
                            {chapterLabel(chapter)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={entry.sceneId ?? ""}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            sceneId: event.target.value || undefined,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">No scene</option>
                        {activeProject.scenes
                          .filter((scene) => !entry.chapterId || scene.chapterId === entry.chapterId)
                          .map((scene) => (
                            <option key={scene.id} value={scene.id}>
                              {sceneLabel(scene)}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => void deleteEntityProgression(entry.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 lg:grid-cols-2">
                      <textarea
                        rows={2}
                        value={entry.startState}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            startState: event.target.value,
                          })
                        }
                        placeholder="Start state"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <textarea
                        rows={2}
                        value={entry.endState}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            endState: event.target.value,
                          })
                        }
                        placeholder="End state"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <textarea
                        rows={2}
                        value={entry.evidence}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            evidence: event.target.value,
                          })
                        }
                        placeholder="Evidence"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <textarea
                        rows={2}
                        value={entry.proposedDelta}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            proposedDelta: event.target.value,
                          })
                        }
                        placeholder="Proposed delta"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <textarea
                        rows={2}
                        value={entry.validatedDelta}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            validatedDelta: event.target.value,
                          })
                        }
                        placeholder="Validated delta"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <textarea
                        rows={2}
                        value={entry.aiSuggestion}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            aiSuggestion: event.target.value,
                          })
                        }
                        placeholder="AI fix suggestion"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={entry.knowledge}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            knowledge: event.target.value,
                          })
                        }
                        placeholder="Knowledge"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={entry.belief}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            belief: event.target.value,
                          })
                        }
                        placeholder="Belief"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={entry.inventory}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            inventory: event.target.value,
                          })
                        }
                        placeholder="Inventory"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                        <input
                          value={entry.narrationStatus}
                          onChange={(event) =>
                            void saveEntityProgressionAction({
                              ...entry,
                              narrationStatus: event.target.value,
                            })
                          }
                          placeholder="Narration status"
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <select
                          value={entry.confidence}
                          onChange={(event) =>
                            void saveEntityProgressionAction({
                              ...entry,
                              confidence: event.target.value as EntityProgression["confidence"],
                            })
                          }
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                        >
                          <option value="explicit">Explicit</option>
                          <option value="strong_inference">Strong inference</option>
                          <option value="weak_inference">Weak inference</option>
                          <option value="conflict">Conflict</option>
                          <option value="insufficient_evidence">Insufficient evidence</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">Progression overview</h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {progressionByEntity.map((group) => (
                  <div key={group.key} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {group.label}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        ({entityTypeLabel(group.type)})
                      </span>
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {group.entries.slice(-4).map((entry) => (
                        <li key={entry.id}>
                          {(entry.chapterId &&
                            activeProject.chapters.find((chapter) => chapter.id === entry.chapterId)?.number) ||
                            "Story"}
                          : {entry.endState || entry.validatedDelta || entry.proposedDelta || "No end state yet"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {progressionByEntity.length === 0 && (
                  <p className="text-sm text-slate-600">
                    No progression history yet. Add entries to track canon changes chapter by chapter.
                  </p>
                )}
              </div>
            </article>
          </section>
        )}

        {activeTab === "drafting" && (
          <section className={mainClass}>
            <aside className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <h2 className="text-lg font-semibold text-slate-900">Outline</h2>
              <button
                onClick={() => setOutlineSearchVisible((current) => !current)}
                className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs"
              >
                {outlineSearchVisible ? "Hide" : "Show"} search/replace
              </button>

              {outlineSearchVisible && (
                <div className="mt-3 grid gap-2">
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search"
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <input
                    value={replaceText}
                    onChange={(event) => setReplaceText(event.target.value)}
                    placeholder="Replace"
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => void applySearchReplace()}
                    disabled={!searchText.trim()}
                    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Apply globally
                  </button>
                  {searchReplaceMessage && (
                    <p className="text-xs text-slate-600">{searchReplaceMessage}</p>
                  )}
                </div>
              )}

              {activeProject.chapters.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                  No chapters yet.
                  <button
                    onClick={() => void addChapter()}
                    className="mt-2 block rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    Add first chapter
                  </button>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {activeProject.chapters
                    .sort((a, b) => a.number - b.number)
                    .map((chapter) => (
                      <li key={chapter.id}>
                        <button
                          onClick={() => setSelectedChapterId(chapter.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                            selectedChapter?.id === chapter.id
                              ? "border-teal-600 bg-teal-50"
                              : "border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <p className="font-semibold text-slate-900">{chapterLabel(chapter)}</p>
                          <p className="text-xs text-slate-600">{chapter.status}</p>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </aside>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              {selectedChapter ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{chapterLabel(selectedChapter)}</h2>
                      <p className="text-xs text-slate-600">
                        Chapter quality score: {chapterScore}/10 · Suggestions: {chapterGrammarSuggestions.length}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFocusMode((current) => !current)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {focusMode ? "Exit focus" : "Focus mode"}
                      </button>
                      <button
                        onClick={() => setReadingMode((current) => !current)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {readingMode ? "Edit mode" : "Reading mode"}
                      </button>
                      <button
                        onClick={() =>
                          void createSnapshot(
                            `Manual snapshot ${new Date().toLocaleTimeString()}`,
                            selectedChapter.id,
                            editor?.getHTML() ?? selectedChapter.content
                          )
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        Snapshot
                      </button>
                    </div>
                  </div>

                  {renderSelectedChapterDetails({
                    containerClassName: "mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4",
                  })}

                  <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Per-chapter trackers
                        </h3>
                        <p className="text-sm text-slate-600">
                          Compute chapter-specific states for characters, locations, lore,
                          timelines, relationships, and progressions from all prior chapters plus
                          the current draft.
                        </p>
                      </div>
                      <button
                        onClick={() => void computeSelectedChapterTrackers()}
                        disabled={chapterTrackersAiStatus === "running"}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        {chapterTrackersAiStatus === "running"
                          ? "Computing..."
                          : "Compute chapter trackers"}
                      </button>
                    </div>

                    {chapterTrackersAiMessage && (
                      <p className="mt-3 text-sm text-emerald-700">{chapterTrackersAiMessage}</p>
                    )}
                    {chapterTrackersAiError && (
                      <p className="mt-3 text-sm text-rose-700">{chapterTrackersAiError}</p>
                    )}

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {listChapterTrackerTypes().map((trackerType) => {
                        const report = selectedChapterTrackerReports.find(
                          (item) => item.trackerType === trackerType
                        );

                        return (
                          <article
                            key={trackerType}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold text-slate-900">
                                {chapterTrackerLabel(trackerType)}
                              </h4>
                              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                                {report ? "computed" : "pending"}
                              </span>
                            </div>

                            {report ? (
                              <div className="mt-3 space-y-3 text-sm text-slate-700">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Previous state
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap">
                                    {report.previousState || "None captured."}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Chapter evolution
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap">
                                    {report.chapterEvolution || "No evolution captured."}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    End-of-chapter state
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap">
                                    {report.finalState || "No final state captured."}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-slate-600">
                                No chapter report yet. Run the AI computation to derive this
                                tracker for the selected chapter.
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Chapter-linked entity history
                          </h4>
                          <p className="text-sm text-slate-600">
                            Parallel per-entity timeline notes stored for this chapter after recompute.
                          </p>
                        </div>
                        <span className="text-[11px] uppercase tracking-wide text-slate-500">
                          {selectedChapterEntityHistory.length}{" "}
                          {selectedChapterEntityHistory.length === 1 ? "entry" : "entries"}
                        </span>
                      </div>

                      {selectedChapterEntityHistory.length > 0 ? (
                        <div className="mt-3 grid gap-3">
                          {selectedChapterEntityHistory.map((entry) => (
                            <div
                              key={entry.id}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">
                                  {entry.label || "Untitled history entry"}
                                </p>
                                <span className="rounded-full bg-white px-2 py-1 text-[11px] uppercase tracking-wide text-slate-500">
                                  {historyEntityTypeLabel(entry.entityType)}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-slate-700">
                                {entry.note || "No chapter note recorded."}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-600">
                          No per-entity timeline entries were stored for this chapter yet. Run the
                          tracker computation after chapter details or draft text exist.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Chapter draft studio
                        </h3>
                        <p className="text-sm text-slate-600">
                          Write directly in the editor below or generate a full chapter draft from
                          the story bible, tracked entities, relationships, progression history,
                          per-entity chapter history, chapter trackers, chapter details, and scene cards.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {selectedChapter.wordCountCurrent} / {selectedChapter.wordCountTarget} words
                        </span>
                        <button
                          onClick={() => void generateChapterDraft()}
                          disabled={chapterDraftAiStatus === "running"}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        >
                          {chapterDraftAiStatus === "running"
                            ? "Drafting chapter..."
                            : "AI draft full chapter"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        disabled={!editor || readingMode}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Bold
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        disabled={!editor || readingMode}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Italic
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                        disabled={!editor || readingMode}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        H2
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        disabled={!editor || readingMode}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Bullets
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                        disabled={!editor || readingMode}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Quote
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().undo().run()}
                        disabled={!editor}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Undo
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().redo().run()}
                        disabled={!editor}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Redo
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Manual editing is enabled unless Reading mode is active.
                    </p>
                    {chapterDraftAiMessage && (
                      <p className="mt-2 text-sm text-emerald-700">{chapterDraftAiMessage}</p>
                    )}
                    {chapterDraftAiError && (
                      <p className="mt-2 text-sm text-rose-700">{chapterDraftAiError}</p>
                    )}
                  </div>

                  <div className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-3">
                    <EditorContent
                      editor={editor}
                      className="prose-view max-w-none text-sm text-slate-800"
                    />
                  </div>

                  {chapterDraftPreview && (
                    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          AI full chapter preview
                        </h3>
                        <span className="text-xs text-slate-500">
                          {plainTextWordCount(chapterDraftPreview)} generated words
                        </span>
                      </div>
                      <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        {chapterDraftPreview}
                      </pre>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => void applyGeneratedChapterDraft()}
                          className="rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Replace chapter with preview
                        </button>
                        <button
                          onClick={() => setChapterDraftPreview("")}
                          className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        >
                          Discard preview
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Scene cards</h3>
                        <p className="text-xs text-slate-500">
                          Build scenes manually or let AI propose a sequence for the selected chapter.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => selectedChapter && void createManualScene(selectedChapter.id)}
                          disabled={!selectedChapter}
                          title="Add a blank scene card to the selected chapter."
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-40"
                        >
                          Add scene manually
                        </button>
                        <button
                          onClick={() => void suggestSceneCards()}
                          disabled={!selectedChapter || sceneCardsAiStatus === "running"}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-40"
                        >
                          {sceneCardsAiStatus === "running"
                            ? "Suggesting cards..."
                            : "AI suggest scene cards"}
                        </button>
                      </div>
                    </div>
                    {sceneCardsAiMessage && (
                      <p className="text-xs text-emerald-700">{sceneCardsAiMessage}</p>
                    )}
                    {sceneCardsAiError && (
                      <p className="text-xs text-rose-700">{sceneCardsAiError}</p>
                    )}
                    {sceneDraftAiMessage && (
                      <p className="text-xs text-emerald-700">{sceneDraftAiMessage}</p>
                    )}
                    {sceneDraftAiError && (
                      <p className="text-xs text-rose-700">{sceneDraftAiError}</p>
                    )}
                    {sceneCardsPreview && (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                          AI scene card proposal — not applied yet
                        </p>
                        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-800">
                          {sceneCardsPreview.map((suggestion, index) => (
                            <li key={`${suggestion.title}-${index}`}>
                              <p className="font-semibold">{suggestion.title || "Untitled scene"}</p>
                              {suggestion.description && (
                                <p className="text-xs text-slate-600">{suggestion.description}</p>
                              )}
                              {(suggestion.location || suggestion.characters.length > 0) && (
                                <p className="text-xs text-slate-500">
                                  {[suggestion.location, suggestion.characters.join(", ")]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </li>
                          ))}
                        </ol>
                        <p className="mt-2 text-xs text-slate-600">
                          Applying maps the proposal onto the existing cards in order; extra existing cards are kept.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => void applySceneCardSuggestions()}
                            className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Apply scene cards
                          </button>
                          <button
                            onClick={discardSceneCardSuggestions}
                            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedScenes.length === 0 && <p className="text-xs text-slate-600">No scenes yet for this chapter.</p>}
                    {selectedScenes.map((scene) => (
                      <div key={scene.id} className="rounded-lg border border-slate-200 bg-white p-2">
                        <div className="mb-1 flex items-center gap-2">
                          <div className="w-full">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <label
                                htmlFor={`scene-title-${scene.id}`}
                                className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                                title={SCENE_FIELD_HELP.title}
                              >
                                Title
                              </label>
                              <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.title}>
                                Hover for help
                              </span>
                            </div>
                            <input
                              id={`scene-title-${scene.id}`}
                              value={scene.title}
                              onChange={(event) =>
                                void saveScene({
                                  ...scene,
                                  title: event.target.value,
                                })
                              }
                              placeholder={`Scene ${scene.order} title`}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <button
                            onClick={() => void deleteScene(scene.id)}
                            className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="mb-2">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label
                              htmlFor={`scene-description-${scene.id}`}
                              className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                              title={SCENE_FIELD_HELP.description}
                            >
                              Description
                            </label>
                            <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.description}>
                              Purpose and outcome
                            </span>
                          </div>
                          <textarea
                            id={`scene-description-${scene.id}`}
                            rows={2}
                            value={scene.description}
                            onChange={(event) =>
                              void saveScene({
                                ...scene,
                                description: event.target.value,
                              })
                            }
                            placeholder="Summarize the scene beat, conflict, and ending state"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="mb-1 grid gap-1 md:grid-cols-2">
                          <div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <label
                                htmlFor={`scene-location-${scene.id}`}
                                className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                                title={SCENE_FIELD_HELP.location}
                              >
                                Location
                              </label>
                              <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.location}>
                                Setting
                              </span>
                            </div>
                            <input
                              id={`scene-location-${scene.id}`}
                              value={scene.location}
                              onChange={(event) =>
                                void saveScene({
                                  ...scene,
                                  location: event.target.value,
                                })
                              }
                              placeholder="Scene location"
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <label
                                htmlFor={`scene-characters-${scene.id}`}
                                className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                                title={SCENE_FIELD_HELP.characters}
                              >
                                Characters
                              </label>
                              <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.characters}>
                                Comma separated
                              </span>
                            </div>
                            <input
                              id={`scene-characters-${scene.id}`}
                              value={scene.characters.join(", ")}
                              onChange={(event) =>
                                void saveScene({
                                  ...scene,
                                  characters: event.target.value
                                    .split(",")
                                    .map((item) => item.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="Characters, comma separated"
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label
                              htmlFor={`scene-notes-${scene.id}`}
                              className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                              title={SCENE_FIELD_HELP.notes}
                            >
                              Notes
                            </label>
                            <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.notes}>
                              Continuity anchors
                            </span>
                          </div>
                          <textarea
                            id={`scene-notes-${scene.id}`}
                            rows={2}
                            value={scene.notes}
                            onChange={(event) =>
                              void saveScene({
                                ...scene,
                                notes: event.target.value,
                              })
                            }
                            placeholder="Scene notes and continuity anchors"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="mb-2">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label
                              htmlFor={`scene-draft-${scene.id}`}
                              className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                              title={SCENE_FIELD_HELP.draftText}
                            >
                              Draft seed
                            </label>
                            <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.draftText}>
                              Beat outline
                            </span>
                          </div>
                          <textarea
                            id={`scene-draft-${scene.id}`}
                            rows={2}
                            value={scene.draftText}
                            onChange={(event) =>
                              void saveScene({
                                ...scene,
                                draftText: event.target.value,
                              })
                            }
                            placeholder="Scene draft notes"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => void generateSceneDraft(scene)}
                            disabled={sceneDraftAiSceneId != null}
                            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-40"
                          >
                            {sceneDraftAiSceneId === scene.id
                              ? "Generating draft..."
                              : "AI generate scene draft"}
                          </button>
                          <button
                            onClick={() => void appendSceneToDraft(scene)}
                            className="rounded border border-teal-300 px-2 py-1 text-xs text-teal-700"
                          >
                            Convert card to draft text
                          </button>
                        </div>
                        {sceneDraftPreview?.sceneId === scene.id && (
                          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                              AI draft proposal — not applied yet
                            </p>
                            <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-amber-200 bg-white p-2 text-xs text-slate-700">
                              {sceneDraftPreview.text}
                            </pre>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                onClick={() => void applySceneDraftPreview()}
                                className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                Apply to draft seed
                              </button>
                              <button
                                onClick={discardSceneDraftPreview}
                                className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                              >
                                Discard
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
                    <h3 className="text-sm font-semibold text-slate-900">Specialized assistants</h3>
                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {ASSISTANTS.map((assistant) => (
                        <button
                          key={assistant.id}
                          onClick={() => {
                            setSelectedAssistantId(assistant.id);
                            setAiAction(assistant.action);
                          }}
                          className={`rounded-xl border p-3 text-left ${
                            selectedAssistant.id === assistant.id
                              ? "border-teal-500 bg-teal-50"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <p className="text-sm font-semibold text-slate-900">{assistant.label}</p>
                          <p className="mt-1 text-xs text-slate-600">{assistant.description}</p>
                          <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">
                            {assistant.action} · {assistant.focus}
                          </p>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[200px_minmax(0,1fr)_auto]">
                      <select
                        value={aiAction}
                        onChange={(event) => setAiAction(event.target.value as AiActionType)}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        {[
                          "brainstorm",
                          "expand",
                          "rewrite",
                          "summarize",
                          "continue",
                          "dialogue_polish",
                          "plan_audit",
                          "consistency_check",
                          "revision_pass",
                          "grammar_suggestions",
                          "style_transform",
                          "marketing_copy",
                          "publish_artifact",
                        ].map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </select>
                      <input
                        value={aiPromptContext}
                        onChange={(event) => setAiPromptContext(event.target.value)}
                        placeholder="Optional extra instructions"
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void runAiPreview()}
                        disabled={aiStatus === "running"}
                        className="rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        {aiStatus === "running" ? "Running…" : "Run AI"}
                      </button>
                    </div>

                    {aiError && <p className="mt-2 text-xs text-rose-700">{aiError}</p>}

                    {aiDiff.length > 0 && (
                      <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Preview diff</h4>
                        <div className="max-h-56 space-y-1 overflow-y-auto rounded border border-slate-200 bg-white p-2 text-xs">
                          {aiDiff.map((chunk, index) => (
                            <p
                              key={`${chunk.type}-${index}`}
                              className={`rounded px-1 ${
                                chunk.type === "same"
                                  ? "diff-line-same"
                                  : chunk.type === "added"
                                  ? "diff-line-added"
                                  : "diff-line-removed"
                              }`}
                            >
                              {chunk.type === "added" ? "+ " : chunk.type === "removed" ? "- " : "  "}
                              {chunk.text}
                            </p>
                          ))}
                        </div>

                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => void applyAiDraft()}
                            className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Apply draft
                          </button>
                          <button
                            onClick={() => {
                              setAiDraft("");
                              setAiDiff([]);
                            }}
                            className="rounded border border-slate-300 px-3 py-1.5 text-xs"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    )}

                    {aiDraft && aiDiff.length === 0 && (
                      <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Assistant output
                        </h4>
                        <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
                          {aiDraft}
                        </pre>
                        <div className="mt-2 flex gap-2">
                          {selectedChapter && (
                            <button
                              onClick={() => void applyAiDraft()}
                              className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Insert into chapter
                            </button>
                          )}
                          <button
                            onClick={() => setAiDraft("")}
                            className="rounded border border-slate-300 px-3 py-1.5 text-xs"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <h3 className="text-sm font-semibold text-slate-900">Annotations</h3>
                    <button
                      onClick={() =>
                        void saveAnnotation({
                          id: createId("anno"),
                          projectId: projectIdValue,
                          chapterId: selectedChapter.id,
                          quote: "",
                          note: "",
                          tags: [],
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      Add annotation
                    </button>

                    <div className="mt-2 space-y-2">
                      {activeProject.annotations
                        .filter((annotation) => annotation.chapterId === selectedChapter.id)
                        .map((annotation) => (
                          <div key={annotation.id} className="rounded border border-slate-200 p-2">
                            <div className="mb-1 flex items-center gap-2">
                              <input
                                value={annotation.quote}
                                onChange={(event) =>
                                  void saveAnnotation({
                                    ...annotation,
                                    quote: event.target.value,
                                  })
                                }
                                placeholder="Quoted text"
                                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                              />
                              <button
                                onClick={() => void deleteAnnotation(annotation.id)}
                                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                              >
                                Delete
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={annotation.note}
                              onChange={(event) =>
                                void saveAnnotation({
                                  ...annotation,
                                  note: event.target.value,
                                })
                              }
                              placeholder="Author note"
                              className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                            <input
                              value={annotation.tags.join(", ")}
                              onChange={(event) =>
                                void saveAnnotation({
                                  ...annotation,
                                  tags: event.target.value
                                    .split(",")
                                    .map((tag) => tag.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="tags"
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                  Select a chapter to start drafting.
                  <button
                    onClick={() => void addChapter()}
                    className="mt-2 block rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    Add first chapter
                  </button>
                </div>
              )}
            </article>
          </section>
        )}

        {activeTab === "revision" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">Revision issues</h2>
              <button
                onClick={() =>
                  void createRevisionIssue({
                    chapterId: selectedChapter?.id,
                    title: "New revision issue",
                    description: "Describe the problem and intended fix.",
                    severity: "medium",
                  })
                }
                className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-sm"
              >
                Add issue
              </button>
              <div className="mt-3 space-y-2">
                {activeProject.revisionIssues.map((issue) => (
                  <div key={issue.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{issue.title}</p>
                    <p className="mb-2 text-xs text-slate-600">{issue.description}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 uppercase">{issue.severity}</span>
                      <select
                        value={issue.status}
                        onChange={(event) =>
                          void updateRevisionIssueStatus(
                            issue.id,
                            event.target.value as RevisionIssue["status"]
                          )
                        }
                        className="rounded border border-slate-300 px-2 py-1"
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <button
                        onClick={() => void deleteRevisionIssue(issue.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">Quality checks</h2>
              <p className="mt-2 text-sm text-slate-600">
                Rubric weights: structure {resolved.settings.qa.rubricWeights.structure}% · character {resolved.settings.qa.rubricWeights.character}% · pacing {resolved.settings.qa.rubricWeights.pacing}% · style {resolved.settings.qa.rubricWeights.style}%
              </p>

              {selectedChapter && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm text-slate-700">
                    Current chapter score: <strong>{chapterScore}/10</strong>
                  </p>
                  <ul className="mt-2 space-y-1">
                    {chapterGrammarSuggestions.map((suggestion) => (
                      <li key={suggestion} className="flex items-start justify-between gap-2 text-xs text-slate-700">
                        <span>{suggestion}</span>
                        <button
                          onClick={() => void createIssueFromGrammar(suggestion)}
                          className="rounded border border-slate-300 px-2 py-0.5"
                        >
                          Track
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 rounded-lg border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-900">Checklists</h3>
                <p className="text-xs text-slate-600">
                  Revision completion: {checklistCompletion(activeProject.checklist, "revision")}% · Publish completion: {checklistCompletion(activeProject.checklist, "publish")}%
                </p>
                <button
                  onClick={() =>
                    void saveChecklistItem({
                      id: createId("chk"),
                      projectId: projectIdValue,
                      scope: "revision",
                      title: "Custom checklist item",
                      done: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs"
                >
                  Add custom item
                </button>
                <ul className="mt-2 space-y-1">
                  {activeProject.checklist.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(event) => void toggleChecklistItem(item.id, event.target.checked)}
                      />
                      <span>{item.title}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-600">{item.scope}</span>
                      <button
                        onClick={() => void deleteChecklistItem(item.id)}
                        className="rounded border border-rose-300 px-1.5 py-0.5 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </section>
        )}

        {activeTab === "publish" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">Publishing artifacts</h2>
              <p className="mt-2 text-sm text-slate-600">No external platform integration. Export-ready local artifacts only.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void exportPublishArtifacts()} className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                  Export publish artifact pack
                </button>
                <button
                  onClick={async () => {
                    const json = await exportActiveProjectJson();
                    if (json) downloadText(`${projectIdValue}.json`, json, "application/json;charset=utf-8");
                  }}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  Export JSON
                </button>
                <button
                  onClick={async () => {
                    const markdown = await exportActiveProjectMarkdown();
                    if (markdown) downloadText(`${projectIdValue}.md`, markdown, "text/markdown;charset=utf-8");
                  }}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  Export Markdown
                </button>
                <button
                  onClick={async () => {
                    const backup = await exportActiveProjectBackup();
                    if (backup) downloadBlob(`${projectIdValue}.backup.zip`, backup);
                  }}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  Export Backup
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Metadata sheet</h3>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{publishArtifacts?.metadataSheet}</pre>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Chapter manifest</h3>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{publishArtifacts?.chapterManifest}</pre>
            </article>
          </section>
        )}

        {activeTab === "marketing" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">Marketing toolkit</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => exportMarketingArtifacts()} className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                  Export marketing pack
                </button>
                <button
                  onClick={() => {
                    if (!marketingArtifacts) return;
                    void navigator.clipboard.writeText(marketingArtifacts.blurb);
                  }}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  Copy blurb
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Blurb + tagline</h3>
              <p className="mt-2 text-sm text-slate-700">{marketingArtifacts?.blurb}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{marketingArtifacts?.tagline}</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Cover brief + launch checklist</h3>
              <p className="mt-2 text-sm text-slate-700">{marketingArtifacts?.coverBriefPrompt}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {marketingArtifacts?.launchChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">Model configuration</h2>
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-sm text-slate-700">
                  Base URL
                  <input
                    value={resolved.settings.llm.baseUrl}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          llm: {
                            ...resolved.settings.llm,
                            baseUrl: event.target.value,
                          },
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  Model
                  <input
                    value={resolved.settings.llm.model}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          llm: {
                            ...resolved.settings.llm,
                            model: event.target.value,
                          },
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  API key (optional)
                  <input
                    value={resolved.settings.llm.apiKey ?? ""}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          llm: {
                            ...resolved.settings.llm,
                            apiKey: event.target.value,
                          },
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  />
                </label>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">Prompt + QA settings</h2>
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-sm text-slate-700">
                  Writing language
                  <select
                    value={resolved.settings.locale}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          locale: asProjectLanguage(event.target.value),
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  >
                    <option value="fr">French</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  Tone guide
                  <textarea
                    rows={2}
                    value={resolved.settings.prompts.toneGuide}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          prompts: {
                            ...resolved.settings.prompts,
                            toneGuide: event.target.value,
                          },
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  Structure weight
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={resolved.settings.qa.rubricWeights.structure}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          qa: {
                            ...resolved.settings.qa,
                            rubricWeights: {
                              ...resolved.settings.qa.rubricWeights,
                              structure: Number(event.target.value) || 0,
                            },
                          },
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  />
                </label>
              </div>

              <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">Precedence</p>
                <p>{resolved.sourceOrder.join(" -> ")}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => void resetScope("project", projectIdValue)}
                    className="rounded border border-slate-300 px-2 py-1"
                  >
                    Reset project scope
                  </button>
                  <button
                    onClick={() => void resetScope("feature", projectIdValue, "drafting")}
                    className="rounded border border-slate-300 px-2 py-1"
                  >
                    Reset drafting feature scope
                  </button>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">Snapshots & recovery</h2>
              <ul className="mt-3 space-y-2">
                {activeProject.snapshots.map((snapshot) => (
                  <li key={snapshot.id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
                    <span>
                      {snapshot.label} · {new Date(snapshot.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={() => void restoreSnapshot(snapshot.id)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
