"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useMemo, useState } from "react";
import TopNav from "@/app/components/TopNav";
import WorkspaceContextHeader from "@/app/components/workspace/WorkspaceContextHeader";
import ProjectCompanionSidebar from "@/app/components/workspace/ProjectCompanionSidebar";
import WorkspaceTabNavigation from "@/app/components/workspace/WorkspaceTabNavigation";
import CollapsibleCard from "@/app/components/ui/CollapsibleCard";
import FieldLabel from "@/app/components/ui/FieldLabel";
import FilterInput from "@/app/components/ui/FilterInput";
import type {
  AiActionType,
  Chapter,
  EntityHistoryEntry,
  ChapterTrackerReport,
  ChapterTrackerType,
  EntityProgression,
  LlmSettings,
  NarrativeRelationship,
  RevisionIssue,
  Scene,
  TrackedEntityType,
} from "@/app/domain/models";
import {
  DEFAULT_LLM_BASE_URL,
  DEFAULT_LLM_MODEL,
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
  buildProjectCompanionContext,
  buildProjectCompanionQuestionInput,
} from "@/app/lib/ai/projectCompanion";
import {
  buildChapterTrackerComputationContext,
  buildChapterTrackerComputationInput,
  CHAPTER_TRACKERS_RESPONSE_FORMAT,
  listChapterTrackerTypes,
  parseChapterTrackerComputation,
} from "@/app/lib/ai/chapterTrackers";
import {
  buildChapterDetailsAutocompleteContext,
  buildChapterDetailsAutocompleteInput,
  CHAPTER_DETAILS_RESPONSE_FORMAT,
  parseChapterDetailsSuggestion,
} from "@/app/lib/ai/chapterDetails";
import {
  BOOK_PLAN_METHODS,
  BOOK_PLAN_RESEARCH_SOURCES,
  buildBookChapterPlanInput,
  buildBookChapterPlanMergeContext,
  buildBookChapterPlanMergeInput,
  buildBookChapterPlanMethodContext,
  createBookChapterPlanResponseFormat,
  parseBookChapterPlanSuggestion,
  type BookChapterPlanSuggestion,
  type BookPlanMethodId,
} from "@/app/lib/ai/bookChapterPlan";
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
  SCENE_CARDS_RESPONSE_FORMAT,
} from "@/app/lib/ai/sceneCards";
import {
  buildStoryBibleSuggestionContext,
  buildStoryBibleSuggestionInput,
  parseStoryBibleSuggestion,
  STORY_BIBLE_RESPONSE_FORMAT,
} from "@/app/lib/ai/storyBible";
import {
  buildStoryWorldSuggestionContext,
  buildStoryWorldSuggestionInput,
  parseStoryWorldSuggestion,
  STORY_WORLD_RESPONSE_FORMAT,
} from "@/app/lib/ai/storyBibleFollowup";
import { buildPreviewApply, runAiAction, type AiRunResult } from "@/app/lib/ai/client";
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
import { useWorkspaceUiPrefs } from "@/app/workspace/[projectId]/ui/useWorkspaceUiPrefs";
import type {
  FieldHelpKey,
  WorkspaceCollapsibleSection,
  WorkspaceFilterState,
  WorkspaceTab,
} from "@/app/workspace/[projectId]/ui/types";

const TAB_DESCRIPTIONS: Record<WorkspaceTab, { en: string; fr: string }> = {
  plan: {
    en: "Project framing and chapter structure",
    fr: "Cadrage du projet et structure des chapitres",
  },
  bible: {
    en: "Canon entities, lore, and world timelines",
    fr: "Canon, entites, lore et chronologies du monde",
  },
  drafting: {
    en: "Chapter studio, scene cards, and assistants",
    fr: "Studio de chapitre, cartes de scenes et assistants",
  },
  revision: {
    en: "Issue tracking, quality checks, and checklist",
    fr: "Suivi des problemes, controle qualite, checklist",
  },
  publish: {
    en: "Export-ready publishing artifacts",
    fr: "Artefacts de publication prets a exporter",
  },
  marketing: {
    en: "Launch-oriented copy and toolkit",
    fr: "Copies et toolkit orientes lancement",
  },
  settings: {
    en: "Project-scoped model and QA preferences",
    fr: "Preferences modele et QA au niveau projet",
  },
};

const FIELD_HELP_TEXT: Record<"fr" | "en", Record<FieldHelpKey, string>> = {
  en: {
    "project.title": "Reader-facing title. Keep it clear, memorable, and genre-aligned.",
    "project.synopsis": "High-level story arc used by planning, drafting, and AI context builders.",
    "chapter.summary": "Chapter-level intent and progression in 2-5 sentences.",
    "chapter.objectives": "Comma-separated goals this chapter must accomplish narratively.",
    "chapter.hook": "Opening tension or curiosity trigger for the chapter.",
    "chapter.storySoFar": "What the reader should already know before this chapter starts.",
    "bible.premise": "Core concept sentence. This drives consistency checks and AI grounding.",
    "bible.themes": "Comma-separated motifs or ideas repeated through the manuscript.",
    "bible.stakes": "What is gained or lost if protagonists fail or succeed.",
    "bible.worldRules": "Hard/soft rules of the story world to protect continuity.",
    "settings.baseUrl": "Endpoint used for all AI requests in this project scope.",
    "settings.model": "Model id sent with each AI request.",
    "settings.apiKey": "Optional override key for this project scope.",
    "settings.toneGuide": "Reusable tone constraints passed to AI actions.",
    "settings.structureWeight": "Weight contribution in chapter quality scoring.",
  },
  fr: {
    "project.title": "Titre visible cote lecteur. Visez clarte, memorisation et adequation au genre.",
    "project.synopsis": "Arc narratif global utilise pour le plan, la redaction et le contexte IA.",
    "chapter.summary": "Intention du chapitre et progression en 2 a 5 phrases.",
    "chapter.objectives": "Objectifs separes par des virgules que le chapitre doit accomplir.",
    "chapter.hook": "Element d'accroche qui cree tension ou curiosite en ouverture.",
    "chapter.storySoFar": "Ce que le lecteur est suppose savoir avant ce chapitre.",
    "bible.premise": "Concept coeur en une phrase. Sert de base a la coherence.",
    "bible.themes": "Motifs et idees recurrentes, separes par des virgules.",
    "bible.stakes": "Ce qui est gagne ou perdu en cas d'echec ou de succes.",
    "bible.worldRules": "Regles du monde (souples/dures) pour proteger la continuite.",
    "settings.baseUrl": "Endpoint utilise pour toutes les requetes IA sur ce projet.",
    "settings.model": "Identifiant du modele transmis a chaque requete IA.",
    "settings.apiKey": "Cle API optionnelle de surcharge au niveau projet.",
    "settings.toneGuide": "Contraintes de ton reutilisables dans les actions IA.",
    "settings.structureWeight": "Poids de la structure dans le score qualite du chapitre.",
  },
};

const UI_STRINGS: Record<
  "fr" | "en",
  {
    workspaceHeading: string;
    online: string;
    offline: string;
    queuedAi: string;
    backToDashboard: string;
    collapse: string;
    expand: string;
  }
> = {
  en: {
    workspaceHeading: "Workspace",
    online: "Online",
    offline: "Offline",
    queuedAi: "Queued AI tasks",
    backToDashboard: "Back to dashboard",
    collapse: "Collapse",
    expand: "Expand",
  },
  fr: {
    workspaceHeading: "Espace projet",
    online: "En ligne",
    offline: "Hors ligne",
    queuedAi: "Taches IA en file",
    backToDashboard: "Retour au tableau de bord",
    collapse: "Replier",
    expand: "Deplier",
  },
};

function chapterLabel(chapter: Chapter): string {
  return `Ch. ${chapter.number} · ${chapter.title.trim() || "Untitled chapter"}`;
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

function matchesFilter(candidate: string, filterValue: string): boolean {
  const normalized = filterValue.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return candidate.toLocaleLowerCase().includes(normalized);
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

const SCENE_FIELD_HELP: Record<
  "fr" | "en",
  {
    title: string;
    description: string;
    location: string;
    characters: string;
    notes: string;
    draftText: string;
  }
> = {
  en: {
    title: "Short working label for the scene. Use the dramatic turn or key event.",
    description:
      "What happens in the scene from start to finish. Focus on action, conflict, and outcome.",
    location:
      "Primary setting for the scene. Use a consistent place name to help continuity checks.",
    characters: "List the characters present in the scene, separated by commas.",
    notes:
      "Continuity anchors, subtext, props, reveals, POV constraints, or reminders for later scenes.",
    draftText: "A prose seed or beat outline that can be expanded into full scene draft text.",
  },
  fr: {
    title: "Libelle court de travail pour la scene. Utilisez le pivot dramatique principal.",
    description:
      "Resume de la scene du debut a la fin. Concentrez-vous sur action, conflit et resultat.",
    location:
      "Lieu principal de la scene. Gardez un nom coherent pour la verification de continuite.",
    characters: "Listez les personnages presents, separes par des virgules.",
    notes:
      "Ancrages de continuite, sous-texte, objets, revelations, contraintes POV, rappels.",
    draftText: "Base de prose ou beat outline pouvant etre developpee en scene complete.",
  },
};

interface ProjectCompanionMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export default function WorkspaceClient({ projectId }: { projectId: string }) {
  const { t, locale } = useI18n();

  const activeProject = useProjectStore((state) => state.activeProject);
  const openProject = useProjectStore((state) => state.openProject);
  const saveProjectMeta = useProjectStore((state) => state.saveProjectMeta);
  const saveStoryBible = useProjectStore((state) => state.saveStoryBible);
  const saveChapter = useProjectStore((state) => state.saveChapter);
  const saveChapters = useProjectStore((state) => state.saveChapters);
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

  const { prefs: uiPrefs, setPrefs: setUiPrefs } = useWorkspaceUiPrefs(projectId);
  const [projectLlmDraft, setProjectLlmDraft] = useState<LlmSettings | null>(null);
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
  const [bookPlanAiStatus, setBookPlanAiStatus] =
    useState<"idle" | "generating" | "applying" | "error">("idle");
  const [bookPlanAiError, setBookPlanAiError] = useState<string | null>(null);
  const [bookPlanAiMessage, setBookPlanAiMessage] = useState<string | null>(null);
  const [bookPlanPreview, setBookPlanPreview] =
    useState<BookChapterPlanSuggestion | null>(null);
  const [bookPlanMethodIds, setBookPlanMethodIds] = useState<Set<BookPlanMethodId>>(
    () => new Set(BOOK_PLAN_METHODS.map((method) => method.id))
  );
  const [bookPlanAgentStage, setBookPlanAgentStage] = useState<string | null>(null);
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
  const [companionMessages, setCompanionMessages] = useState<ProjectCompanionMessage[]>([]);
  const [companionInput, setCompanionInput] = useState("");
  const [companionStatus, setCompanionStatus] = useState<"idle" | "running" | "error">("idle");
  const [companionError, setCompanionError] = useState<string | null>(null);
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  const activeTab = uiPrefs.activeTab;
  const projectLlmSettings = projectLlmDraft ?? resolved.settings.llm;
  const fieldHelp = FIELD_HELP_TEXT[locale];
  const uiText = UI_STRINGS[locale];
  const sceneFieldHelp = SCENE_FIELD_HELP[locale];

  function setActiveTab(tab: WorkspaceTab) {
    setUiPrefs((previous) => ({
      ...previous,
      activeTab: tab,
    }));
  }

  function setFilterValue<Key extends keyof WorkspaceFilterState>(key: Key, value: string) {
    setUiPrefs((previous) => ({
      ...previous,
      filters: {
        ...previous.filters,
        [key]: value,
      },
    }));
  }

  function toggleCollapsed(section: WorkspaceCollapsibleSection) {
    setUiPrefs((previous) => ({
      ...previous,
      collapsed: {
        ...previous.collapsed,
        [section]: !previous.collapsed[section],
      },
    }));
  }

  function toggleCompanion() {
    setUiPrefs((previous) => ({
      ...previous,
      companionOpen: !previous.companionOpen,
    }));
  }

  const companionOpen = uiPrefs.companionOpen;

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
  const tabs = useMemo(
    () => [
      {
        id: "plan" as const,
        label: t("workspace.plan"),
        description: TAB_DESCRIPTIONS.plan[locale],
      },
      {
        id: "bible" as const,
        label: t("workspace.bible"),
        description: TAB_DESCRIPTIONS.bible[locale],
      },
      {
        id: "drafting" as const,
        label: t("workspace.drafting"),
        description: TAB_DESCRIPTIONS.drafting[locale],
      },
      {
        id: "revision" as const,
        label: t("workspace.revision"),
        description: TAB_DESCRIPTIONS.revision[locale],
      },
      {
        id: "publish" as const,
        label: t("workspace.publish"),
        description: TAB_DESCRIPTIONS.publish[locale],
      },
      {
        id: "marketing" as const,
        label: t("workspace.marketing"),
        description: TAB_DESCRIPTIONS.marketing[locale],
      },
      {
        id: "settings" as const,
        label: t("workspace.settings"),
        description: TAB_DESCRIPTIONS.settings[locale],
      },
    ],
    [locale, t]
  );

  const selectedChapter = useMemo(
    () =>
      activeProject?.chapters.find((chapter) => chapter.id === selectedChapterId) ??
      activeProject?.chapters[0] ??
      null,
    [activeProject, selectedChapterId]
  );
  const selectedChapterCompanionLabel = selectedChapter
    ? chapterLabel(selectedChapter)
    : "No chapter selected";

  useEffect(() => {
    if (!activeProject) return;

    const chapterIds = new Set(activeProject.chapters.map((chapter) => chapter.id));
    if (selectedChapterId && chapterIds.has(selectedChapterId)) {
      return;
    }

    setSelectedChapterId(activeProject.chapters[0]?.id ?? "");
  }, [activeProject, selectedChapterId]);

  useEffect(() => {
    setChapterDraftPreview("");
    setChapterDraftAiError(null);
    setChapterDraftAiMessage(null);
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

  const filteredPlanChapters = useMemo(() => {
    if (!activeProject) return [] as Chapter[];
    const filterValue = uiPrefs.filters.chapterStructure;
    return activeProject.chapters
      .slice()
      .sort((a, b) => a.number - b.number)
      .filter((chapter) =>
        matchesFilter(
          [chapter.number, chapter.title, chapter.summary, chapter.status].join(" "),
          filterValue
        )
      );
  }, [activeProject, uiPrefs.filters.chapterStructure]);

  const filteredDraftingChapters = useMemo(() => {
    if (!activeProject) return [] as Chapter[];
    const filterValue = uiPrefs.filters.draftingOutline;
    return activeProject.chapters
      .slice()
      .sort((a, b) => a.number - b.number)
      .filter((chapter) =>
        matchesFilter(
          [chapter.number, chapter.title, chapter.summary, chapter.status].join(" "),
          filterValue
        )
      );
  }, [activeProject, uiPrefs.filters.draftingOutline]);

  const filteredCharacters = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.characters.filter((character) =>
      matchesFilter(
        [character.name, character.role, character.arc, character.notes].join(" "),
        uiPrefs.filters.characters
      )
    );
  }, [activeProject, uiPrefs.filters.characters]);

  const filteredLocations = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.locations.filter((location) =>
      matchesFilter(
        [location.name, location.role, location.description, location.narrativeStatus].join(" "),
        uiPrefs.filters.locations
      )
    );
  }, [activeProject, uiPrefs.filters.locations]);

  const filteredLoreEntries = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.loreEntries.filter((entry) =>
      matchesFilter(
        [entry.title, entry.category, entry.status, entry.description].join(" "),
        uiPrefs.filters.lore
      )
    );
  }, [activeProject, uiPrefs.filters.lore]);

  const filteredTimeline = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.timeline
      .slice()
      .sort((a, b) => a.order - b.order)
      .filter((event) =>
        matchesFilter([event.label, event.details, event.impact].join(" "), uiPrefs.filters.timeline)
      );
  }, [activeProject, uiPrefs.filters.timeline]);

  const filteredRelationships = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.relationships.filter((relationship) =>
      matchesFilter(
        [relationship.relationType, relationship.status, relationship.notes].join(" "),
        uiPrefs.filters.relationships
      )
    );
  }, [activeProject, uiPrefs.filters.relationships]);

  const filteredEntityProgression = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.entityProgression.filter((entry) =>
      matchesFilter(
        [
          entry.label,
          entry.startState,
          entry.endState,
          entry.proposedDelta,
          entry.validatedDelta,
          entry.narrationStatus,
        ].join(" "),
        uiPrefs.filters.progression
      )
    );
  }, [activeProject, uiPrefs.filters.progression]);

  const filteredRevisionIssues = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.revisionIssues.filter((issue) =>
      matchesFilter(
        [issue.title, issue.description, issue.severity, issue.status].join(" "),
        uiPrefs.filters.revisionIssues
      )
    );
  }, [activeProject, uiPrefs.filters.revisionIssues]);

  const filteredSnapshots = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.snapshots.filter((snapshot) =>
      matchesFilter(
        [snapshot.label, new Date(snapshot.createdAt).toLocaleString()].join(" "),
        uiPrefs.filters.snapshots
      )
    );
  }, [activeProject, uiPrefs.filters.snapshots]);

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
      if (!selectedChapter || readingMode) return;
      const content = instance.getHTML();
      void saveChapter({
        ...selectedChapter,
        content,
      });
    },
  });

  useEffect(() => {
    if (!editor || !selectedChapter) return;
    const current = editor.getHTML();
    if (current !== selectedChapter.content) {
      editor.commands.setContent(selectedChapter.content || "", {
        emitUpdate: false,
      });
    }
    editor.setEditable(!readingMode);
  }, [editor, readingMode, selectedChapter]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const command = event.metaKey || event.ctrlKey;
      if (!command || !selectedChapter) return;

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!editor) return;
        void saveChapter({ ...selectedChapter, content: editor.getHTML() });
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
  }, [editor, saveChapter, selectedChapter]);

  if (!project || !activeProject) {
    return (
      <div className="app-page workspace-page">
        <TopNav />
        <main className="shell-frame py-8 text-sm text-slate-600">Loading workspace...</main>
      </div>
    );
  }

  async function applySearchReplace() {
    if (!searchText.trim()) return;
    const bundle = activeProject;
    if (!bundle) return;

    for (const chapter of bundle.chapters) {
      if (!chapter.content.includes(searchText)) continue;
      const nextContent = chapter.content.split(searchText).join(replaceText);
      await saveChapter({
        ...chapter,
        content: nextContent,
      });
    }
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
    await saveChapter({
      ...selectedChapter,
      content: aiDraft,
    });
    setAiDiff([]);
    setAiDraft("");
  }

  async function appendSceneToDraft(scene: Scene) {
    if (!selectedChapter) return;
    const section = `<p><strong>${sceneLabel(scene)}</strong></p><p>${scene.draftText || scene.description}</p>`;
    const next = `${selectedChapter.content}${section}`;
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

  function clearCompanionConversation() {
    setCompanionMessages([]);
    setCompanionError(null);
    setCompanionStatus("idle");
  }

  async function askProjectCompanion() {
    const bundle = activeProject;
    const question = companionInput.trim();
    if (!bundle || !question || companionStatus === "running") return;

    const userMessage: ProjectCompanionMessage = {
      id: createId("companion-msg"),
      role: "user",
      text: question,
    };
    const history = [...companionMessages, userMessage].map(({ role, text }) => ({ role, text }));

    setCompanionMessages((previous) => [...previous, userMessage]);
    setCompanionInput("");
    setCompanionStatus("running");
    setCompanionError(null);

    const context = buildProjectCompanionContext(bundle, selectedChapter?.id);
    const input = buildProjectCompanionQuestionInput(question, history);

    try {
      const result = await runAiAction({
        action: "brainstorm",
        input,
        context,
        settings: resolved.settings,
      });

      const assistantMessage: ProjectCompanionMessage = {
        id: createId("companion-msg"),
        role: "assistant",
        text: result.text,
      };
      setCompanionMessages((previous) => [...previous, assistantMessage]);
      setCompanionStatus("idle");

      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter?.id,
        action: result.action,
        status: "completed",
        model: result.model,
        providerBaseUrl: result.baseUrl,
        inputPreview: question,
        outputPreview: result.text,
        metadata: {
          feature: "project_companion",
          mode: "agentless",
          selectedChapterId: selectedChapter?.id ?? null,
        },
      });

      await openProject(projectIdValue);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Project companion failed";
      setCompanionStatus("error");
      setCompanionError(errorMessage);

      await logAiAction({
        projectId: projectIdValue,
        chapterId: selectedChapter?.id,
        action: "brainstorm",
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: question,
        outputPreview: "",
        metadata: {
          feature: "project_companion",
          mode: "agentless",
          selectedChapterId: selectedChapter?.id ?? null,
          error: errorMessage,
        },
      });

      await openProject(projectIdValue);
    }
  }

  async function suggestStoryBible() {
    const bundle = activeProject;
    if (!bundle) return;

    const input = buildStoryBibleSuggestionInput(bundle);
    const context = buildStoryBibleSuggestionContext();
    setStoryBibleAiStatus("running");
    setStoryBibleAiError(null);
    setStoryBibleAiMessage(null);

    try {
      const result = await runAiAction({
        action: "brainstorm",
        input,
        context,
        responseFormat: STORY_BIBLE_RESPONSE_FORMAT,
        temperature: 0.1,
        maxTokens: 1600,
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

      await saveStoryBible({
        ...bundle.bible,
        premise: parsed.premise ?? bundle.bible.premise,
        themes: parsed.themes ?? bundle.bible.themes,
        stakes: parsed.stakes ?? bundle.bible.stakes,
        worldRules: parsed.worldRules ?? bundle.bible.worldRules,
      });

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

      await openProject(projectIdValue);
      setStoryBibleAiStatus("idle");
      setStoryBibleAiMessage(
        "Suggestion applied to the story bible fields. Review and edit as needed."
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

  async function suggestStoryWorldScaffold() {
    const bundle = activeProject;
    if (!bundle) return;

    const input = buildStoryWorldSuggestionInput(bundle);
    const context = buildStoryWorldSuggestionContext();
    setStoryWorldAiStatus("running");
    setStoryWorldAiError(null);
    setStoryWorldAiMessage(null);

    try {
      const result = await runAiAction({
        action: "brainstorm",
        input,
        context,
        responseFormat: STORY_WORLD_RESPONSE_FORMAT,
        temperature: 0.1,
        maxTokens: 3200,
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

      await openProject(projectIdValue);
      setStoryWorldAiStatus("idle");
      setStoryWorldAiMessage(
        "Tracked entities and relationships were suggested and applied. Review them before drafting forward."
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

  async function autocompleteSelectedChapterDetails() {
    if (!activeProject || !selectedChapter) return;

    const input = buildChapterDetailsAutocompleteInput(activeProject, selectedChapter.id);
    const context = buildChapterDetailsAutocompleteContext();
    setChapterDetailsAiStatus("running");
    setChapterDetailsAiError(null);
    setChapterDetailsAiMessage(null);

    try {
      const result = await runAiAction({
        action: "brainstorm",
        input,
        context,
        responseFormat: CHAPTER_DETAILS_RESPONSE_FORMAT,
        temperature: 0.1,
        maxTokens: 1800,
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

      await saveChapter({
        ...selectedChapter,
        title: parsed.title ?? selectedChapter.title,
        summary: parsed.summary ?? selectedChapter.summary,
        objectives: parsed.objectives ?? selectedChapter.objectives,
        hook: parsed.hook ?? selectedChapter.hook,
        storySoFar: parsed.storySoFar ?? selectedChapter.storySoFar,
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
          feature: "chapter_details_autocomplete",
          chapterNumber: selectedChapter.number,
        },
      });

      await openProject(projectIdValue);
      setChapterDetailsAiStatus("idle");
      setChapterDetailsAiMessage(
        "Autocomplete applied to the selected chapter details. Review and refine as needed."
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

  function toggleBookPlanMethod(methodId: BookPlanMethodId) {
    setBookPlanMethodIds((previous) => {
      const next = new Set(previous);
      if (next.has(methodId)) {
        if (next.size === 1) return previous; // keep at least one method engaged
        next.delete(methodId);
      } else {
        next.add(methodId);
      }
      return next;
    });
  }

  async function generateBookChapterPlan() {
    if (!activeProject) return;

    const chapterCount = activeProject.chapters.length;
    if (chapterCount === 0) {
      setBookPlanAiStatus("error");
      setBookPlanAiError("Add at least one chapter before generating the book architecture.");
      return;
    }

    const selectedMethods = BOOK_PLAN_METHODS.filter((method) =>
      bookPlanMethodIds.has(method.id)
    );
    if (selectedMethods.length === 0) {
      setBookPlanAiStatus("error");
      setBookPlanAiError("Select at least one narrative method before generating the architecture.");
      return;
    }

    const input = buildBookChapterPlanInput(activeProject);
    const lockedChapterNumbers = new Set(
      activeProject.chapters
        .filter((chapter) => chapter.aiLocked)
        .map((chapter) => chapter.number)
    );
    // Floor kept high so reasoning models (e.g. gpt-oss) have room to emit the
    // full structured plan after their hidden reasoning instead of truncating.
    const maxTokens = Math.min(12000, Math.max(8000, chapterCount * 700));

    setBookPlanAiStatus("generating");
    setBookPlanAiError(null);
    setBookPlanAiMessage(null);
    setBookPlanPreview(null);
    setBookPlanAgentStage(
      selectedMethods.length === 1
        ? `Running the ${selectedMethods[0].role} agent…`
        : `Running ${selectedMethods.length} method agents in parallel…`
    );

    try {
      // Phase 1 — run one specialist agent per selected method in parallel.
      const settled = await Promise.allSettled(
        selectedMethods.map((method) =>
          runAiAction({
            action: "brainstorm",
            input,
            context: buildBookChapterPlanMethodContext(chapterCount, method.id),
            responseFormat: createBookChapterPlanResponseFormat(chapterCount),
            temperature: 0.1,
            maxTokens,
            settings: resolved.settings,
          }).then((result) => ({ method, result }))
        )
      );

      const candidates = settled.map((outcome, index) => {
        const method = selectedMethods[index];
        if (outcome.status !== "fulfilled") {
          return {
            method,
            result: null as AiRunResult | null,
            parsed: null as BookChapterPlanSuggestion | null,
            error:
              outcome.reason instanceof Error
                ? outcome.reason.message
                : "Method agent failed.",
          };
        }
        const parsed = parseBookChapterPlanSuggestion(
          outcome.value.result.text,
          chapterCount,
          lockedChapterNumbers
        );
        return {
          method,
          result: outcome.value.result,
          parsed,
          error: parsed ? null : "Plan did not validate against the schema.",
        };
      });

      // Log every specialist call when more than one ran, so the parallel
      // fan-out is visible in the AI action history.
      if (selectedMethods.length > 1) {
        for (const candidate of candidates) {
          await logAiAction({
            projectId: projectIdValue,
            action: "brainstorm",
            status: candidate.result && candidate.parsed ? "completed" : "failed",
            model: candidate.result?.model ?? resolved.settings.llm.model,
            providerBaseUrl: candidate.result?.baseUrl ?? resolved.settings.llm.baseUrl,
            inputPreview: input,
            outputPreview: candidate.result?.text ?? "",
            metadata: {
              feature: "book_chapter_plan_method",
              method: candidate.method.id,
              methodTitle: candidate.method.title,
              chapterCount,
              error: candidate.error ?? undefined,
            },
          });
        }
      }

      const validCandidates = candidates.filter(
        (candidate): candidate is typeof candidate & {
          result: AiRunResult;
          parsed: BookChapterPlanSuggestion;
        } => Boolean(candidate.result && candidate.parsed)
      );

      if (validCandidates.length === 0) {
        throw new Error(
          `No method agent returned a complete, unique plan for all ${chapterCount} chapters. Generate again.`
        );
      }

      // Phase 2 — when several candidates survive, a synthesis agent merges them.
      let finalResult: AiRunResult = validCandidates[0].result;
      let finalParsed: BookChapterPlanSuggestion = validCandidates[0].parsed;
      let merged = false;

      if (validCandidates.length > 1) {
        setBookPlanAgentStage(
          `Merging ${validCandidates.length} method agents into one architecture…`
        );
        const mergeResult = await runAiAction({
          action: "brainstorm",
          input: buildBookChapterPlanMergeInput(
            input,
            validCandidates.map((candidate) => ({
              method: candidate.method,
              planJson: candidate.result.text,
            }))
          ),
          context: buildBookChapterPlanMergeContext(
            chapterCount,
            validCandidates.map((candidate) => candidate.method.id)
          ),
          responseFormat: createBookChapterPlanResponseFormat(chapterCount),
          temperature: 0.1,
          maxTokens,
          settings: resolved.settings,
        });
        const parsedMerge = parseBookChapterPlanSuggestion(
          mergeResult.text,
          chapterCount,
          lockedChapterNumbers
        );
        if (parsedMerge) {
          finalResult = mergeResult;
          finalParsed = parsedMerge;
          merged = true;
        }
        // If the merge fails to validate, keep the first valid specialist plan.
      }

      const chaptersByNumber = new Map(
        activeProject.chapters.map((chapter) => [chapter.number, chapter])
      );
      const protectedPlan: BookChapterPlanSuggestion = {
        ...finalParsed,
        chapters: finalParsed.chapters.map((suggestion) => {
          const existing = chaptersByNumber.get(suggestion.chapterNumber);
          if (!existing?.aiLocked) return suggestion;

          return {
            ...suggestion,
            title: existing.title,
            summary: existing.summary,
            objectives: existing.objectives,
            hook: existing.hook,
            storySoFar: existing.storySoFar,
            notes: existing.notes,
            wordCountTarget: existing.wordCountTarget,
          };
        }),
      };

      const methodLabel = validCandidates
        .map((candidate) => candidate.method.title)
        .join(" + ");

      await logAiAction({
        projectId: projectIdValue,
        action: finalResult.action,
        status: "completed",
        model: finalResult.model,
        providerBaseUrl: finalResult.baseUrl,
        inputPreview: input,
        outputPreview: finalResult.text,
        metadata: {
          feature: "book_chapter_plan",
          chapterCount,
          lockedChapterCount: activeProject.chapters.filter((chapter) => chapter.aiLocked)
            .length,
          methods: validCandidates.map((candidate) => candidate.method.id),
          candidateCount: validCandidates.length,
          merged,
          researchBasis: BOOK_PLAN_RESEARCH_SOURCES.map((source) => source.url),
        },
      });

      setBookPlanPreview(protectedPlan);
      setBookPlanAgentStage(null);
      setBookPlanAiStatus("idle");
      setBookPlanAiMessage(
        merged
          ? `Merged ${validCandidates.length} method agents (${methodLabel}) into one architecture for ${chapterCount} chapters. Review the causal turns and reveal cadence before applying it.`
          : `Architecture generated for ${chapterCount} chapters via ${methodLabel}. Review the causal turns and reveal cadence before applying it.`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Whole-book architecture generation failed.";
      setBookPlanAgentStage(null);
      setBookPlanAiStatus("error");
      setBookPlanAiError(errorMessage);
      await logAiAction({
        projectId: projectIdValue,
        action: "brainstorm",
        status: "failed",
        model: resolved.settings.llm.model,
        providerBaseUrl: resolved.settings.llm.baseUrl,
        inputPreview: input,
        outputPreview: "",
        metadata: {
          feature: "book_chapter_plan",
          chapterCount,
          methods: selectedMethods.map((method) => method.id),
          error: errorMessage,
        },
      });
      await openProject(projectIdValue);
    }
  }

  async function applyBookChapterPlan() {
    if (!activeProject || !bookPlanPreview) return;

    const chapters = activeProject.chapters.slice().sort((a, b) => a.number - b.number);
    const suggestionsByNumber = new Map(
      bookPlanPreview.chapters.map((chapter) => [chapter.chapterNumber, chapter])
    );

    if (
      chapters.length !== bookPlanPreview.chapters.length ||
      chapters.some((chapter) => !suggestionsByNumber.has(chapter.number))
    ) {
      setBookPlanAiStatus("error");
      setBookPlanAiError(
        "The chapter list changed after this preview was generated. Generate a fresh architecture before applying it."
      );
      return;
    }

    setBookPlanAiStatus("applying");
    setBookPlanAiError(null);
    setBookPlanAiMessage(null);

    try {
      const lockedCount = chapters.filter((chapter) => chapter.aiLocked).length;
      const chapterUpdates = chapters.flatMap((chapter) => {
        if (chapter.aiLocked) return [];

        const suggestion = suggestionsByNumber.get(chapter.number);
        if (!suggestion) return [];

        return [
          {
            ...chapter,
            title: suggestion.title,
            summary: suggestion.summary,
            objectives: suggestion.objectives,
            hook: suggestion.hook,
            storySoFar: suggestion.storySoFar,
            notes: suggestion.notes || chapter.notes,
            wordCountTarget: suggestion.wordCountTarget,
          },
        ];
      });

      await saveChapters(chapterUpdates);

      setBookPlanPreview(null);
      setBookPlanAiStatus("idle");
      setBookPlanAiMessage(
        `Applied chapter details to ${chapterUpdates.length} unlocked chapters. ${lockedCount} locked chapters and all draft content were preserved.`
      );
    } catch (error) {
      setBookPlanAiStatus("error");
      setBookPlanAiError(
        error instanceof Error
          ? error.message
          : "The chapter architecture could not be applied."
      );
      await openProject(projectIdValue);
    }
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
        responseFormat: CHAPTER_TRACKERS_RESPONSE_FORMAT,
        temperature: 0.1,
        maxTokens: 2600,
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
        maxTokens: Math.min(
          12000,
          Math.max(
            resolved.settings.llm.maxTokens,
            (selectedChapter.wordCountTarget || activeProject.goal.chapterWords || 2500) * 2
          )
        ),
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

    if (selectedChapter.content.trim()) {
      await createSnapshot(
        `Before AI chapter draft ${new Date().toLocaleTimeString()}`,
        selectedChapter.id,
        selectedChapter.content
      );
    }

    await saveChapter({
      ...selectedChapter,
      content: plainTextToHtml(chapterDraftPreview),
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

    try {
      const result = await runAiAction({
        action: "brainstorm",
        input,
        context,
        responseFormat: SCENE_CARDS_RESPONSE_FORMAT,
        temperature: 0.1,
        maxTokens: 2600,
        settings: resolved.settings,
      });
      const parsed = parseSceneCardSuggestions(result.text);

      if (parsed.length === 0) {
        throw new Error("AI response could not be mapped to scene cards.");
      }

      const existingScenes = selectedScenes.slice().sort((a, b) => a.order - b.order);

      for (const [index, suggestion] of parsed.entries()) {
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

      await openProject(projectIdValue);
      setSceneCardsAiStatus("idle");
      setSceneCardsAiMessage(
        "Scene cards were suggested from the current chapter canon and tracker state."
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

  async function generateSceneDraft(scene: Scene) {
    if (!activeProject || !selectedChapter) return;

    const input = buildSceneDraftInput(activeProject, selectedChapter.id, scene.id);
    const context = buildSceneDraftContext();
    setSceneDraftAiSceneId(scene.id);
    setSceneDraftAiError(null);
    setSceneDraftAiMessage(null);

    try {
      const result = await runAiAction({
        action: "continue",
        input,
        context,
        settings: resolved.settings,
      });

      await saveScene({
        ...scene,
        draftText: result.text,
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

      await openProject(projectIdValue);
      setSceneDraftAiSceneId(null);
      setSceneDraftAiMessage(`Scene ${scene.order} draft text was generated from its card.`);
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

  const mainClass = `drafting-layout${focusMode ? " drafting-layout--focus" : ""}`;

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
        <div className="selected-chapter-details__header">
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
        {selectedChapter ? (
          <div className="chapter-details-form">
            <label className="grid gap-1 text-sm text-slate-700">
              <FieldLabel label="Title" help={fieldHelp["project.title"]} />
              <input
                value={selectedChapter.title}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    title: event.target.value,
                  })
                }
                className="ui-input ui-input-default"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <FieldLabel label="Summary" help={fieldHelp["chapter.summary"]} />
              <textarea
                rows={3}
                value={selectedChapter.summary}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    summary: event.target.value,
                  })
                }
                className="ui-input ui-input-wide"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <FieldLabel
                label="Objectives (comma separated)"
                help={fieldHelp["chapter.objectives"]}
              />
              <textarea
                rows={2}
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
                className="ui-input ui-input-default"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <FieldLabel label="Hook" help={fieldHelp["chapter.hook"]} />
              <textarea
                rows={2}
                value={selectedChapter.hook}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    hook: event.target.value,
                  })
                }
                className="ui-input ui-input-default"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              <FieldLabel label="Story so far" help={fieldHelp["chapter.storySoFar"]} />
              <textarea
                rows={2}
                value={selectedChapter.storySoFar}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    storySoFar: event.target.value,
                  })
                }
                className="ui-input ui-input-default"
              />
            </label>
            <div className="chapter-details-form__pair">
              <label className="grid gap-1 text-sm text-slate-700">
                <FieldLabel label="Status" />
                <select
                  value={selectedChapter.status}
                  onChange={(event) =>
                    void saveChapter({
                      ...selectedChapter,
                      status: event.target.value as Chapter["status"],
                    })
                  }
                  className="ui-input ui-input-default"
                >
                  <option value="draft">Draft</option>
                  <option value="in-progress">In progress</option>
                  <option value="revision">Revision</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                <FieldLabel label="Word target" />
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
                  className="ui-input ui-input-default"
                />
              </label>
            </div>
            <div className="chapter-details-form__actions">
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
    <div className="app-page workspace-page">
      <TopNav />

      <main className="shell-frame workspace-frame">
        <WorkspaceContextHeader
          workspaceLabel={t("nav.workspace")}
          title={project.title}
          meta={`${project.genre} · ${project.audience} · ${project.targetWordCount.toLocaleString()} words target`}
          offline={offline}
          pendingAiCount={pendingAiCount}
          labels={{
            online: uiText.online,
            offline: uiText.offline,
            queuedAi: uiText.queuedAi,
            backToDashboard: uiText.backToDashboard,
            companion: "Companion",
          }}
          onOpenCompanion={companionOpen ? undefined : toggleCompanion}
        />

        <div className="workspace-grid">
          <WorkspaceTabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            heading={uiText.workspaceHeading}
          />
          <div className="workspace-main">

        {activeTab === "plan" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="ui-card overflow-hidden p-0 lg:col-span-2">
              <div className="border-b border-slate-200 bg-[linear-gradient(115deg,rgba(15,118,110,0.11),rgba(255,255,255,0)_48%)] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="max-w-3xl">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800">
                      Whole-book architecture
                    </p>
                    <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-slate-950">
                      Build every chapter as one paced causal chain
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Generate a reviewable plan for all {activeProject.chapters.length} chapters.
                      Pick the narrative methods below: one specialist agent runs per method in
                      parallel, then a synthesis agent merges them into a single paced causal chain
                      that staggers clues, reversals, disasters, and payoff.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void generateBookChapterPlan()}
                    disabled={
                      bookPlanAiStatus === "generating" ||
                      bookPlanAiStatus === "applying" ||
                      bookPlanMethodIds.size === 0 ||
                      activeProject.chapters.length === 0
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bookPlanAiStatus === "generating" && (
                      <span
                        className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                        aria-hidden
                      />
                    )}
                    {bookPlanAiStatus === "generating"
                      ? bookPlanAgentStage ?? "Building architecture…"
                      : bookPlanPreview
                        ? "Generate a new architecture"
                        : bookPlanMethodIds.size > 1
                          ? `Generate with ${bookPlanMethodIds.size} method agents`
                          : "Generate whole-book architecture"}
                  </button>
                </div>

                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">
                      Method agents
                    </p>
                    <p className="text-xs text-slate-500">
                      {bookPlanMethodIds.size} of {BOOK_PLAN_METHODS.length} engaged
                    </p>
                  </div>
                  <div
                    role="group"
                    aria-label="Narrative methods for the planning agents"
                    className="mt-2 grid gap-2 xl:grid-cols-3"
                  >
                    {BOOK_PLAN_METHODS.map((method) => {
                      const selected = bookPlanMethodIds.has(method.id);
                      const lastSelected = selected && bookPlanMethodIds.size === 1;
                      return (
                        <div
                          key={method.id}
                          className={`flex flex-col rounded-xl border px-4 py-3 text-left shadow-sm transition ${
                            selected
                              ? "border-teal-400 bg-white ring-1 ring-teal-200"
                              : "border-slate-200/90 bg-white/70"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleBookPlanMethod(method.id)}
                            aria-pressed={selected}
                            disabled={lastSelected}
                            title={
                              lastSelected
                                ? "Keep at least one method engaged"
                                : selected
                                  ? `Disable ${method.title}`
                                  : `Enable ${method.title}`
                            }
                            className="flex flex-1 items-start gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed"
                          >
                            <span
                              aria-hidden
                              className={`mt-0.5 flex size-5 flex-none items-center justify-center rounded-md border text-[11px] font-bold ${
                                selected
                                  ? "border-teal-600 bg-teal-600 text-white"
                                  : "border-slate-300 bg-white text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-slate-900">
                                {method.title}
                              </span>
                              <span className="mt-0.5 block text-xs font-medium text-teal-800">
                                {method.role}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-500">
                                {method.author}
                              </span>
                              <span className="mt-2 block text-xs leading-5 text-slate-600">
                                {method.summary}
                              </span>
                            </span>
                          </button>
                          <a
                            href={method.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 self-start text-xs font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                          >
                            Reference ↗
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div aria-live="polite">
                  {bookPlanAiError && (
                    <div
                      role="alert"
                      className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                    >
                      {bookPlanAiError}
                    </div>
                  )}
                  {bookPlanAiMessage && (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      {bookPlanAiMessage}
                    </div>
                  )}
                  {bookPlanAiStatus === "generating" && bookPlanAgentStage && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                      <span
                        className="size-4 animate-spin rounded-full border-2 border-teal-300 border-t-teal-700 motion-reduce:animate-none"
                        aria-hidden
                      />
                      {bookPlanAgentStage}
                    </div>
                  )}
                </div>

                {!bookPlanPreview ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: "Quarter 1",
                        title: "Promise and commitment",
                        detail:
                          "Plant the central question, then force commitment through the first disaster.",
                      },
                      {
                        label: "Quarter 2",
                        title: "Complication and reversal",
                        detail:
                          "Make attempted solutions create harder problems and reframe evidence at midpoint.",
                      },
                      {
                        label: "Quarter 3",
                        title: "Escalation and crisis",
                        detail:
                          "Converge clues, close escape routes, and make the third disaster causally earned.",
                      },
                      {
                        label: "Final quarter",
                        title: "Climax and consequence",
                        detail:
                          "Pay off the dramatic question through action, then show the resulting new state.",
                      },
                    ].map((stage) => (
                      <div
                        key={stage.label}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">
                          {stage.label}
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-slate-900">
                          {stage.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{stage.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                          Review before applying
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-950">
                          Proposed narrative architecture
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {bookPlanPreview.chapters.length} planned chapters ·{" "}
                          {
                            activeProject.chapters.filter((chapter) => chapter.aiLocked)
                              .length
                          }{" "}
                          locked anchors ·{" "}
                          {bookPlanPreview.chapters
                            .reduce((total, chapter) => total + chapter.wordCountTarget, 0)
                            .toLocaleString()}{" "}
                          target words
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBookPlanPreview(null);
                            setBookPlanAiError(null);
                            setBookPlanAiMessage(null);
                          }}
                          disabled={bookPlanAiStatus === "applying"}
                          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Discard preview
                        </button>
                        <button
                          type="button"
                          onClick={() => void applyBookChapterPlan()}
                          disabled={bookPlanAiStatus === "applying"}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {bookPlanAiStatus === "applying" && (
                            <span
                              className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                              aria-hidden
                            />
                          )}
                          {bookPlanAiStatus === "applying"
                            ? "Applying chapter details…"
                            : "Apply to unlocked chapters"}
                        </button>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-3 xl:grid-cols-4">
                      {[
                        [
                          "Central dramatic question",
                          bookPlanPreview.strategy.centralDramaticQuestion,
                        ],
                        ["Ending promise", bookPlanPreview.strategy.endingPromise],
                        ["Escalation logic", bookPlanPreview.strategy.escalationLogic],
                        ["Reveal cadence", bookPlanPreview.strategy.revealCadence],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            {label}
                          </dt>
                          <dd className="mt-2 break-words text-sm leading-6 text-slate-800">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <ol className="mt-5 grid items-start gap-3 xl:grid-cols-2">
                      {bookPlanPreview.chapters.map((chapter) => {
                        const existingChapter = activeProject.chapters.find(
                          (item) => item.number === chapter.chapterNumber
                        );

                        return (
                          <li
                            key={chapter.chapterNumber}
                            className="book-plan-preview-card rounded-2xl border border-slate-200 bg-slate-50/65 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-bold tabular-nums text-white">
                                    Chapter {chapter.chapterNumber}
                                  </span>
                                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-teal-800">
                                    {chapter.architecture.phase}
                                  </span>
                                  {existingChapter?.aiLocked && (
                                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                      Locked anchor
                                    </span>
                                  )}
                                </div>
                                <h4 className="mt-3 text-lg font-semibold leading-tight text-slate-950">
                                  {chapter.title || "Untitled locked chapter"}
                                </h4>
                              </div>
                              <div
                                className="flex items-center gap-1"
                                aria-label={`Tension ${chapter.tensionLevel} out of 5`}
                              >
                                <span className="mr-1 text-xs font-semibold text-slate-600">
                                  Tension {chapter.tensionLevel}/5
                                </span>
                                {Array.from({ length: 5 }, (_, index) => (
                                  <span
                                    key={index}
                                    className={`h-2.5 w-2.5 rounded-full ${
                                      index < chapter.tensionLevel
                                        ? "bg-amber-500"
                                        : "bg-slate-200"
                                    }`}
                                    aria-hidden
                                  />
                                ))}
                              </div>
                            </div>

                            <p className="mt-3 break-words text-sm leading-6 text-slate-700">
                              {chapter.summary}
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Decisive turn
                                </p>
                                <p className="mt-1.5 text-sm leading-5 text-slate-700">
                                  {chapter.decisiveTurn}
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Reveal step
                                </p>
                                <p className="mt-1.5 text-sm leading-5 text-slate-700">
                                  {chapter.revealStep}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Chapter objectives
                                </p>
                                <ul className="mt-1.5 space-y-1 text-sm leading-5 text-slate-700">
                                  {chapter.objectives.map((objective) => (
                                    <li key={objective}>- {objective}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="sm:text-right">
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Target
                                </p>
                                <p className="mt-1.5 text-sm font-semibold tabular-nums text-slate-900">
                                  {chapter.wordCountTarget.toLocaleString()} words
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                End hook and open loop
                              </p>
                              <p className="mt-1.5 text-sm leading-5 text-slate-700">
                                {chapter.hook}
                              </p>
                              <p className="mt-1 text-sm leading-5 text-slate-600">
                                {chapter.openLoop}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
            </article>

            <article className="ui-card p-5">
              <h2 className="text-xl font-semibold text-slate-900">Project metadata</h2>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-sm text-slate-700">
                  <FieldLabel label="Title" help={fieldHelp["project.title"]} />
                  <input
                    value={project.title}
                    onChange={(event) =>
                      void saveProjectMeta({
                        title: event.target.value,
                      })
                    }
                    className="ui-input ui-input-default"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  <FieldLabel label="Synopsis" help={fieldHelp["project.synopsis"]} />
                  <textarea
                    rows={4}
                    value={project.synopsis}
                    onChange={(event) =>
                      void saveProjectMeta({
                        synopsis: event.target.value,
                      })
                    }
                    className="ui-input ui-input-wide"
                  />
                </label>
              </div>
            </article>

            <article className="ui-card p-5">
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

            <article className="ui-card p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Chapter structure</h2>
                <button
                  onClick={() => void addChapter()}
                  className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
                >
                  Add chapter
                </button>
              </div>

              <div className="mb-4">
                <FilterInput
                  id="filter-plan-chapters"
                  label="Search chapters"
                  value={uiPrefs.filters.chapterStructure}
                  onChange={(value) => setFilterValue("chapterStructure", value)}
                  help="Filter by chapter number, title, summary, or status."
                  placeholder="Find a chapter by title, summary, or status"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div className="space-y-3">
                  {filteredPlanChapters.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                      This project starts with an empty structure. Add chapters only where you need them.
                    </div>
                  )}

                  {filteredPlanChapters.map((chapter) => {
                    const scenes = activeProject.scenes.filter((scene) => scene.chapterId === chapter.id);
                    const selected = selectedChapter?.id === chapter.id;
                    return (
                      <div
                        key={chapter.id}
                        className={`rounded-2xl border p-4 ${
                          selected
                            ? "border-teal-300 bg-teal-50/70 shadow-[0_8px_18px_rgba(20,184,166,0.12)]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <button
                            onClick={() => setSelectedChapterId(chapter.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="text-base font-semibold leading-tight text-slate-900">
                              {chapterLabel(chapter)}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                              {chapter.summary || "No summary yet"}
                            </p>
                          </button>
                          <span className="ui-chip">{chapter.status}</span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white">
                            <button
                              onClick={() => void reorderChapter(chapter.number, chapter.number - 1)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Up
                            </button>
                            <span className="w-px bg-slate-300" aria-hidden />
                            <button
                              onClick={() => void reorderChapter(chapter.number, chapter.number + 1)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Down
                            </button>
                          </div>
                          <button
                            onClick={() =>
                              void saveChapter({
                                ...chapter,
                                aiLocked: !chapter.aiLocked,
                              })
                            }
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              chapter.aiLocked
                                ? "border-rose-300 bg-rose-50 text-rose-700"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                          >
                            {chapter.aiLocked ? "AI Locked" : "AI Unlocked"}
                          </button>
                          <button
                            onClick={() => void createManualScene(chapter.id)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                            title="Create a blank scene card in this chapter and open it in the editor."
                          >
                            Add scene
                          </button>
                          <button
                            onClick={() => void deleteChapter(chapter.id)}
                            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700"
                          >
                            Delete
                          </button>
                        </div>

                        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Scenes
                          </p>
                          <div className="space-y-2">
                            {scenes.length === 0 && (
                              <p className="text-sm text-slate-500">No scenes in this chapter yet.</p>
                            )}
                            {scenes
                              .sort((a, b) => a.order - b.order)
                              .map((scene) => (
                                <div
                                  key={scene.id}
                                  className="grid items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 sm:grid-cols-[minmax(0,1fr)_auto]"
                                >
                                  <span className="truncate">
                                    {scene.order}. {sceneLabel(scene)}
                                  </span>
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() =>
                                        void reorderScene(chapter.id, scene.order, scene.order - 1)
                                      }
                                      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700"
                                    >
                                      Up
                                    </button>
                                    <button
                                      onClick={() =>
                                        void reorderScene(chapter.id, scene.order, scene.order + 1)
                                      }
                                      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700"
                                    >
                                      Down
                                    </button>
                                    <button
                                      onClick={() => void deleteScene(scene.id)}
                                      className="rounded border border-rose-300 bg-white px-2 py-0.5 text-xs font-semibold text-rose-700"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <CollapsibleCard
                  title="Chapter details panel"
                  subtitle="Guided metadata and chapter-level controls."
                  collapsed={uiPrefs.collapsed.planChapterDetails}
                  onToggle={() => toggleCollapsed("planChapterDetails")}
                  collapseLabel={uiText.collapse}
                  expandLabel={uiText.expand}
                >
                  {renderSelectedChapterDetails({
                    containerClassName: "rounded-xl border border-slate-200 bg-slate-50 p-4",
                    showOpenInDraftingButton: true,
                  })}
                </CollapsibleCard>
              </div>
            </article>
          </section>
        )}

        {activeTab === "bible" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="ui-card p-5 lg:col-span-2">
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
              <p className="mt-3 text-sm text-slate-600">
                Use the core suggestion to fill premise, themes, stakes, and world rules. Use the world suggestion to scaffold characters, locations, lore, timeline, and relationships from the same canon.
              </p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <label className="grid gap-1 text-sm text-slate-700 lg:col-span-2">
                  <FieldLabel label="Premise" help={fieldHelp["bible.premise"]} />
                  <textarea
                    rows={3}
                    value={activeProject.bible.premise}
                    onChange={(event) =>
                      void saveStoryBible({
                        ...activeProject.bible,
                        premise: event.target.value,
                      })
                    }
                    className="ui-input ui-input-wide"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  <FieldLabel label="Themes (comma separated)" help={fieldHelp["bible.themes"]} />
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
                    className="ui-input ui-input-default"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  <FieldLabel label="Stakes" help={fieldHelp["bible.stakes"]} />
                  <textarea
                    rows={2}
                    value={activeProject.bible.stakes}
                    onChange={(event) =>
                      void saveStoryBible({
                        ...activeProject.bible,
                        stakes: event.target.value,
                      })
                    }
                    className="ui-input ui-input-default"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700 lg:col-span-2">
                  <FieldLabel label="World rules" help={fieldHelp["bible.worldRules"]} />
                  <textarea
                    rows={4}
                    value={activeProject.bible.worldRules}
                    onChange={(event) =>
                      void saveStoryBible({
                        ...activeProject.bible,
                        worldRules: event.target.value,
                      })
                    }
                    className="ui-input ui-input-wide"
                  />
                </label>
              </div>
            </article>

            <article className="ui-card p-5 lg:col-span-2">
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
                  <FieldLabel label="Story-wide entity or relationship" />
                  <select
                    value={selectedHistoryEntity?.key ?? ""}
                    onChange={(event) => setSelectedHistoryEntityKey(event.target.value)}
                    className="ui-input ui-input-default"
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

            <article className="ui-card p-5">
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
              <div className="mt-3">
                <FilterInput
                  id="filter-characters"
                  label="Search characters"
                  value={uiPrefs.filters.characters}
                  onChange={(value) => setFilterValue("characters", value)}
                  help="Filter by name, role, arc, or notes."
                  placeholder="Filter characters"
                />
              </div>
              <div className="mt-3 space-y-3">
                {filteredCharacters.map((character) => (
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
                        className="ui-input ui-input-default"
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
                      className="ui-input ui-input-default"
                    />
                  </div>
                ))}
              </div>
            </article>

            <article className="ui-card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Locations</h2>
                <button
                  onClick={addBlankLocation}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Add location
                </button>
              </div>
              <div className="mt-3">
                <FilterInput
                  id="filter-locations"
                  label="Search locations"
                  value={uiPrefs.filters.locations}
                  onChange={(value) => setFilterValue("locations", value)}
                  help="Filter by location name, role, status, or description."
                  placeholder="Filter locations"
                />
              </div>
              <div className="mt-3 space-y-3">
                {filteredLocations.map((location) => (
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-default"
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
                      className="ui-input ui-input-default mt-2"
                    />
                  </div>
                ))}
              </div>
            </article>

            <article className="ui-card p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Lore</h2>
                <button
                  onClick={addBlankLoreEntry}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Add lore item
                </button>
              </div>
              <div className="mt-3">
                <FilterInput
                  id="filter-lore"
                  label="Search lore"
                  value={uiPrefs.filters.lore}
                  onChange={(value) => setFilterValue("lore", value)}
                  help="Filter by title, category, status, or description."
                  placeholder="Filter lore entries"
                />
              </div>
              <div className="mt-3 space-y-3">
                {filteredLoreEntries.map((entry) => (
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-default"
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
                      className="ui-input ui-input-default mt-2"
                    />
                  </div>
                ))}
              </div>
            </article>

            <article className="ui-card p-5 lg:col-span-2">
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
              <div className="mt-3">
                <FilterInput
                  id="filter-timeline"
                  label="Search timeline events"
                  value={uiPrefs.filters.timeline}
                  onChange={(value) => setFilterValue("timeline", value)}
                  help="Filter by event label, details, or impact."
                  placeholder="Filter timeline events"
                />
              </div>
              <div className="mt-3 space-y-2">
                {filteredTimeline.map((event) => (
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-default"
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

            <article className="ui-card p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Relationships</h2>
                <button
                  onClick={addBlankRelationship}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Add relationship
                </button>
              </div>
              <div className="mt-3">
                <FilterInput
                  id="filter-relationships"
                  label="Search relationships"
                  value={uiPrefs.filters.relationships}
                  onChange={(value) => setFilterValue("relationships", value)}
                  help="Filter by relation type, status, and notes."
                  placeholder="Filter relationships"
                />
              </div>
              <div className="mt-3 space-y-3">
                {filteredRelationships.map((relationship) => (
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="ui-card p-5 lg:col-span-2">
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
              <div className="mt-3">
                <FilterInput
                  id="filter-progression"
                  label="Search progression entries"
                  value={uiPrefs.filters.progression}
                  onChange={(value) => setFilterValue("progression", value)}
                  help="Filter by label, states, deltas, and narration status."
                  placeholder="Filter progression"
                />
              </div>
              <div className="mt-3 space-y-3">
                {filteredEntityProgression.map((entry) => (
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-default"
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                          className="ui-input ui-input-compact"
                        />
                        <select
                          value={entry.confidence}
                          onChange={(event) =>
                            void saveEntityProgressionAction({
                              ...entry,
                              confidence: event.target.value as EntityProgression["confidence"],
                            })
                          }
                          className="ui-input ui-input-compact"
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

            <article className="ui-card p-5 lg:col-span-2">
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
            <aside className="ui-card drafting-outline">
              <h2 className="text-xl font-semibold text-slate-900">Outline</h2>
              <div className="mt-3">
                <FilterInput
                  id="filter-drafting-outline"
                  label="Search outline chapters"
                  value={uiPrefs.filters.draftingOutline}
                  onChange={(value) => setFilterValue("draftingOutline", value)}
                  help="Filter outline chapter cards by number, title, summary, or status."
                  placeholder="Filter chapter list"
                />
              </div>
              <button
                onClick={() => setOutlineSearchVisible((current) => !current)}
                className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                {outlineSearchVisible ? "Hide" : "Show"} search/replace
              </button>

              {outlineSearchVisible && (
                <div className="mt-3 grid gap-2">
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search"
                    className="ui-input ui-input-compact"
                  />
                  <input
                    value={replaceText}
                    onChange={(event) => setReplaceText(event.target.value)}
                    placeholder="Replace"
                    className="ui-input ui-input-compact"
                  />
                  <button
                    onClick={() => void applySearchReplace()}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Apply globally
                  </button>
                </div>
              )}

              {filteredDraftingChapters.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                  No chapters yet.
                  <button
                    onClick={() => void addChapter()}
                    className="mt-2 block rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Add first chapter
                  </button>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {filteredDraftingChapters.map((chapter) => (
                      <li key={chapter.id}>
                        <button
                          onClick={() => setSelectedChapterId(chapter.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                            selectedChapter?.id === chapter.id
                              ? "border-teal-600 bg-teal-50 shadow-sm"
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

            <article className="ui-card drafting-workbench">
              {selectedChapter ? (
                <>
                  <div className="drafting-workbench__header">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{chapterLabel(selectedChapter)}</h2>
                      <p className="text-xs text-slate-600">
                        Chapter quality score: {chapterScore}/10 · Suggestions: {chapterGrammarSuggestions.length}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFocusMode((current) => !current)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        {focusMode ? "Exit focus" : "Focus mode"}
                      </button>
                      <button
                        onClick={() => setReadingMode((current) => !current)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
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
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        Snapshot
                      </button>
                    </div>
                  </div>

                  <CollapsibleCard
                    title="Per-chapter trackers"
                    subtitle="Compute and inspect chapter-level canon evolution."
                    collapsed={uiPrefs.collapsed.draftingTrackers}
                    onToggle={() => toggleCollapsed("draftingTrackers")}
                    collapseLabel={uiText.collapse}
                    expandLabel={uiText.expand}
                    className="drafting-secondary-card"
                  >
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
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
                  </CollapsibleCard>

                  <CollapsibleCard
                    title="Chapter draft studio"
                    subtitle="Write manually or generate a full chapter preview."
                    collapsed={uiPrefs.collapsed.draftingDraftStudio}
                    onToggle={() => toggleCollapsed("draftingDraftStudio")}
                    collapseLabel={uiText.collapse}
                    expandLabel={uiText.expand}
                    className="drafting-studio-card"
                  >
                    <div className="drafting-studio__controls">
                    <div className="drafting-studio__header">
                      <div className="drafting-studio__intro">
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

                    <div className="drafting-toolbar">
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

                    <p className="drafting-studio__hint">
                      Manual editing is enabled unless Reading mode is active.
                    </p>
                    {chapterDraftAiMessage && (
                      <p className="mt-2 text-sm text-emerald-700">{chapterDraftAiMessage}</p>
                    )}
                    {chapterDraftAiError && (
                      <p className="mt-2 text-sm text-rose-700">{chapterDraftAiError}</p>
                    )}
                    </div>
                  </CollapsibleCard>

                  <div className="drafting-editor-surface">
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

                  <CollapsibleCard
                    title="Scene cards"
                    subtitle="Manual scene beats and AI-driven scene suggestions."
                    collapsed={uiPrefs.collapsed.draftingScenes}
                    onToggle={() => toggleCollapsed("draftingScenes")}
                    collapseLabel={uiText.collapse}
                    expandLabel={uiText.expand}
                    className="drafting-secondary-card"
                  >
                    <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
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
                    {selectedScenes.length === 0 && <p className="text-xs text-slate-600">No scenes yet for this chapter.</p>}
                    {selectedScenes.map((scene) => (
                      <div key={scene.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="w-full">
                            <FieldLabel
                              htmlFor={`scene-title-${scene.id}`}
                              label="Title"
                              help={sceneFieldHelp.title}
                              hint={locale === "fr" ? "Libelle de scene" : "Scene label"}
                            />
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
                              className="ui-input ui-input-default"
                            />
                          </div>
                          <button
                            onClick={() => void deleteScene(scene.id)}
                            className="rounded border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="mb-3">
                          <FieldLabel
                            htmlFor={`scene-description-${scene.id}`}
                            label="Description"
                            help={sceneFieldHelp.description}
                            hint={locale === "fr" ? "But et issue" : "Purpose and outcome"}
                          />
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
                            className="ui-input ui-input-wide"
                          />
                        </div>
                        <div className="mb-2 grid gap-2 md:grid-cols-2">
                          <div>
                            <FieldLabel
                              htmlFor={`scene-location-${scene.id}`}
                              label="Location"
                              help={sceneFieldHelp.location}
                              hint={locale === "fr" ? "Decor" : "Setting"}
                            />
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
                              className="ui-input ui-input-default"
                            />
                          </div>
                          <div>
                            <FieldLabel
                              htmlFor={`scene-characters-${scene.id}`}
                              label="Characters"
                              help={sceneFieldHelp.characters}
                              hint={locale === "fr" ? "Separes par virgules" : "Comma separated"}
                            />
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
                              className="ui-input ui-input-default"
                            />
                          </div>
                        </div>
                        <div className="mb-3">
                          <FieldLabel
                            htmlFor={`scene-notes-${scene.id}`}
                            label="Notes"
                            help={sceneFieldHelp.notes}
                            hint={locale === "fr" ? "Ancrages continuite" : "Continuity anchors"}
                          />
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
                            className="ui-input ui-input-default"
                          />
                        </div>
                        <div className="mb-3">
                          <FieldLabel
                            htmlFor={`scene-draft-${scene.id}`}
                            label="Draft seed"
                            help={sceneFieldHelp.draftText}
                            hint={locale === "fr" ? "Plan de beat" : "Beat outline"}
                          />
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
                            className="ui-input ui-input-default"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => void generateSceneDraft(scene)}
                            disabled={sceneDraftAiSceneId != null}
                            className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
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
                      </div>
                    ))}
                    </div>
                  </CollapsibleCard>

                  <CollapsibleCard
                    title="Specialized assistants"
                    subtitle="Choose assistant profile, action, and preview/apply output."
                    collapsed={uiPrefs.collapsed.draftingAssistants}
                    onToggle={() => toggleCollapsed("draftingAssistants")}
                    collapseLabel={uiText.collapse}
                    expandLabel={uiText.expand}
                    className="drafting-secondary-card"
                  >
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
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
                        className="ui-input ui-input-compact"
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
                        className="ui-input ui-input-compact"
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
                  </CollapsibleCard>

                  <CollapsibleCard
                    title="Annotations"
                    subtitle="Track quoted lines, notes, and tags for the selected chapter."
                    collapsed={uiPrefs.collapsed.draftingAnnotations}
                    onToggle={() => toggleCollapsed("draftingAnnotations")}
                    collapseLabel={uiText.collapse}
                    expandLabel={uiText.expand}
                    className="drafting-secondary-card"
                  >
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
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
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
                                className="ui-input ui-input-default"
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
                              className="ui-input ui-input-default mb-1"
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
                              className="ui-input ui-input-default"
                            />
                          </div>
                        ))}
                    </div>
                  </CollapsibleCard>
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
            {selectedChapter && (
              <aside className="drafting-inspector">
                <CollapsibleCard
                  title="Chapter details"
                  subtitle="Summary, objectives, hook, and completion metadata."
                  collapsed={uiPrefs.collapsed.draftingChapterDetails}
                  onToggle={() => toggleCollapsed("draftingChapterDetails")}
                  collapseLabel={uiText.collapse}
                  expandLabel={uiText.expand}
                >
                  {renderSelectedChapterDetails({
                    containerClassName: "selected-chapter-details",
                  })}
                </CollapsibleCard>
              </aside>
            )}
          </section>
        )}

        {activeTab === "revision" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="ui-card p-5">
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
              <div className="mt-3">
                <FilterInput
                  id="filter-revision-issues"
                  label="Search revision issues"
                  value={uiPrefs.filters.revisionIssues}
                  onChange={(value) => setFilterValue("revisionIssues", value)}
                  help="Filter by title, description, severity, or status."
                  placeholder="Filter issues"
                />
              </div>
              <div className="mt-3 space-y-2">
                {filteredRevisionIssues.map((issue) => (
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
                        className="ui-input ui-input-compact"
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

            <article className="ui-card p-5">
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

              <CollapsibleCard
                title="Checklists"
                subtitle="Track revision and publishing completion state."
                collapsed={uiPrefs.collapsed.revisionChecklist}
                onToggle={() => toggleCollapsed("revisionChecklist")}
                collapseLabel={uiText.collapse}
                expandLabel={uiText.expand}
                className="mt-4"
              >
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
              </CollapsibleCard>
            </article>
          </section>
        )}

        {activeTab === "publish" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="ui-card p-5 lg:col-span-2">
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

            <article className="ui-card p-5">
              <h3 className="text-lg font-semibold text-slate-900">Metadata sheet</h3>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{publishArtifacts?.metadataSheet}</pre>
            </article>

            <article className="ui-card p-5">
              <h3 className="text-lg font-semibold text-slate-900">Chapter manifest</h3>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{publishArtifacts?.chapterManifest}</pre>
            </article>
          </section>
        )}

        {activeTab === "marketing" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="ui-card p-5 lg:col-span-2">
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

            <article className="ui-card p-5">
              <h3 className="text-lg font-semibold text-slate-900">Blurb + tagline</h3>
              <p className="mt-2 text-sm text-slate-700">{marketingArtifacts?.blurb}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{marketingArtifacts?.tagline}</p>
            </article>

            <article className="ui-card p-5">
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
            <article className="ui-card p-5">
              <h2 className="text-xl font-semibold text-slate-900">Model configuration</h2>
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-sm text-slate-700">
                  <FieldLabel label="Base URL" help={fieldHelp["settings.baseUrl"]} />
                  <input
                    value={projectLlmSettings.baseUrl}
                    placeholder={DEFAULT_LLM_BASE_URL}
                    inputMode="url"
                    onChange={(event) =>
                      setProjectLlmDraft((current) => ({
                        ...(current ?? projectLlmSettings),
                        baseUrl: event.target.value,
                      }))
                    }
                    className="ui-input ui-input-default"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  <FieldLabel label="Model" help={fieldHelp["settings.model"]} />
                  <input
                    value={projectLlmSettings.model}
                    onChange={(event) =>
                      setProjectLlmDraft((current) => ({
                        ...(current ?? projectLlmSettings),
                        model: event.target.value,
                      }))
                    }
                    className="ui-input ui-input-default"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  <FieldLabel label="API key (optional)" help={fieldHelp["settings.apiKey"]} />
                  <input
                    value={projectLlmSettings.apiKey ?? ""}
                    onChange={(event) =>
                      setProjectLlmDraft((current) => ({
                        ...(current ?? projectLlmSettings),
                        apiKey: event.target.value,
                      }))
                    }
                    className="ui-input ui-input-default"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextLlm: LlmSettings = {
                      ...projectLlmSettings,
                      baseUrl: DEFAULT_LLM_BASE_URL,
                      model: DEFAULT_LLM_MODEL,
                      apiKey: undefined,
                    };
                    setProjectLlmDraft(nextLlm);
                    void saveScope(
                      "project",
                      { llm: nextLlm },
                      projectIdValue
                    ).then(() => setProjectLlmDraft(null));
                  }}
                  className="ui-btn ui-btn-secondary justify-self-start"
                >
                  Use local Ollama
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void saveScope(
                      "project",
                      { llm: projectLlmSettings },
                      projectIdValue
                    ).then(() => setProjectLlmDraft(null));
                  }}
                  className="ui-btn ui-btn-primary justify-self-start"
                >
                  Save model configuration
                </button>
              </div>
            </article>

            <article className="ui-card p-5">
              <h2 className="text-xl font-semibold text-slate-900">Prompt + QA settings</h2>
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-sm text-slate-700">
                  <FieldLabel label="Writing language" />
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
                    className="ui-input ui-input-default"
                  >
                    <option value="fr">French</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  <FieldLabel label="Tone guide" help={fieldHelp["settings.toneGuide"]} />
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
                    className="ui-input ui-input-default"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  <FieldLabel label="Structure weight" help={fieldHelp["settings.structureWeight"]} />
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
                    className="ui-input ui-input-default"
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

            <article className="ui-card p-5 lg:col-span-2">
              <CollapsibleCard
                title="Snapshots & recovery"
                subtitle="Restore previous chapter/project snapshots when needed."
                collapsed={uiPrefs.collapsed.settingsRecovery}
                onToggle={() => toggleCollapsed("settingsRecovery")}
                collapseLabel={uiText.collapse}
                expandLabel={uiText.expand}
              >
                <FilterInput
                  id="filter-snapshots"
                  label="Search snapshots"
                  value={uiPrefs.filters.snapshots}
                  onChange={(value) => setFilterValue("snapshots", value)}
                  help="Filter by snapshot label or timestamp."
                  placeholder="Filter snapshots"
                />
                <ul className="mt-3 space-y-2">
                  {filteredSnapshots.map((snapshot) => (
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
              </CollapsibleCard>
            </article>
          </section>
        )}
          </div>
          {companionOpen && (
            <div className="workspace-side">
              <ProjectCompanionSidebar
                projectTitle={project.title}
                selectedChapterLabel={selectedChapterCompanionLabel}
                messages={companionMessages}
                draft={companionInput}
                status={companionStatus}
                error={companionError}
                onDraftChange={setCompanionInput}
                onSend={() => void askProjectCompanion()}
                onClear={clearCompanionConversation}
                onClose={toggleCompanion}
              />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
