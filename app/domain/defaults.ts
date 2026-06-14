import type {
  AppSettings,
  Chapter,
  ChapterTrackerReport,
  ChapterTrackerType,
  EntityHistoryEntry,
  ChecklistItem,
  EntityProgression,
  LocationProfile,
  LoreEntryRecord,
  Locale,
  Manuscript,
  NarrativeRelationship,
  Project,
  StoryBible,
  WritingGoal,
} from "./models";

export const DEFAULT_LLM_BASE_URL = "http://192.168.0.37:11434";
export const DEFAULT_LLM_MODEL = "gpt-oss:20b";

export const DEFAULT_SETTINGS: AppSettings = {
  locale: "fr",
  uiLocale: "fr",
  llm: {
    baseUrl: DEFAULT_LLM_BASE_URL,
    model: DEFAULT_LLM_MODEL,
    temperature: 0.6,
    maxTokens: 2200,
  },
  prompts: {
    systemPrompt:
      "You are an expert book development assistant. Be concrete, useful, and style-aware.",
    toneGuide: "Clear, confident, and reader-focused prose.",
    safetyMode: "preview",
  },
  qa: {
    rubricWeights: {
      structure: 25,
      character: 25,
      pacing: 25,
      style: 25,
    },
    enforceChecklistBeforeExport: true,
  },
};

function now() {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function createProject(input: {
  title: string;
  genre: string;
  audience: string;
  tone: string;
  targetWordCount: number;
  language: Locale;
  synopsis: string;
}): Project {
  const createdAt = now();
  return {
    id: createId("project"),
    title: input.title.trim(),
    genre: input.genre.trim(),
    audience: input.audience.trim(),
    tone: input.tone.trim(),
    targetWordCount: Math.max(1000, input.targetWordCount),
    language: input.language,
    synopsis: input.synopsis.trim(),
    status: "active",
    createdAt,
    updatedAt: createdAt,
  };
}

export function createManuscript(projectId: string): Manuscript {
  const updatedAt = now();
  return {
    projectId,
    manuscriptTitle: "",
    subtitle: "",
    premise: "",
    updatedAt,
  };
}

export function createChapter(projectId: string, number: number, title?: string): Chapter {
  const timestamp = now();
  return {
    id: createId("chapter"),
    projectId,
    number,
    title: title ?? "",
    summary: "",
    objectives: [],
    hook: "",
    storySoFar: "",
    notes: "",
    wordCountTarget: 2500,
    wordCountCurrent: 0,
    status: "draft",
    content: "",
    aiLocked: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createStoryBible(projectId: string): StoryBible {
  return {
    id: createId("bible"),
    projectId,
    premise: "",
    themes: [],
    stakes: "",
    worldRules: "",
    loreEntries: [],
    glossaryEntries: [],
    locations: [],
    updatedAt: now(),
  };
}

export function createLocationProfile(projectId: string): LocationProfile {
  return {
    id: createId("location"),
    projectId,
    name: "",
    role: "",
    narrativeStatus: "",
    description: "",
    notes: "",
    updatedAt: now(),
  };
}

export function createLoreEntry(projectId: string): LoreEntryRecord {
  return {
    id: createId("lore"),
    projectId,
    title: "",
    category: "",
    status: "",
    description: "",
    notes: "",
    updatedAt: now(),
  };
}

export function createNarrativeRelationship(projectId: string): NarrativeRelationship {
  return {
    id: createId("relation"),
    projectId,
    sourceType: "character",
    sourceId: "",
    targetType: "character",
    targetId: "",
    relationType: "",
    status: "",
    intensity: 3,
    notes: "",
    updatedAt: now(),
  };
}

export function createEntityProgression(projectId: string): EntityProgression {
  return {
    id: createId("progress"),
    projectId,
    chapterId: undefined,
    sceneId: undefined,
    entityType: "character",
    entityId: "",
    label: "",
    startState: "",
    evidence: "",
    proposedDelta: "",
    validatedDelta: "",
    endState: "",
    knowledge: "",
    belief: "",
    inventory: "",
    narrationStatus: "",
    confidence: "explicit",
    aiSuggestion: "",
    updatedAt: now(),
  };
}

export function createEntityHistoryEntry(projectId: string, chapterId: string): EntityHistoryEntry {
  return {
    id: createId("entity-history"),
    projectId,
    chapterId,
    entityType: "character",
    entityId: "",
    label: "",
    note: "",
    updatedAt: now(),
  };
}

export function createChapterTrackerReport(
  projectId: string,
  chapterId: string,
  trackerType: ChapterTrackerType
): ChapterTrackerReport {
  return {
    id: createId("chapter-tracker"),
    projectId,
    chapterId,
    trackerType,
    previousState: "",
    chapterEvolution: "",
    finalState: "",
    rawResponse: "",
    updatedAt: now(),
  };
}

export function createWritingGoal(projectId: string): WritingGoal {
  return {
    id: createId("goal"),
    projectId,
    dailyWords: 1000,
    sessionWords: 500,
    chapterWords: 2500,
    updatedAt: now(),
  };
}

export function createDefaultChecklist(projectId: string): ChecklistItem[] {
  const createdAt = now();
  const mk = (scope: ChecklistItem["scope"], title: string): ChecklistItem => ({
    id: createId("chk"),
    projectId,
    scope,
    title,
    done: false,
    createdAt,
    updatedAt: createdAt,
  });

  return [
    mk("revision", "Resolve all high-severity revision issues"),
    mk("revision", "Validate continuity conflicts"),
    mk("publish", "Finalize metadata sheet"),
    mk("publish", "Validate chapter manifest"),
    mk("launch", "Prepare launch social snippets"),
    mk("launch", "Draft launch email"),
  ];
}
