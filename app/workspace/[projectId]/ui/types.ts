export type WorkspaceTab =
  | "plan"
  | "bible"
  | "drafting"
  | "revision"
  | "publish"
  | "marketing"
  | "settings";

export interface WorkspaceFilterState {
  chapterStructure: string;
  draftingOutline: string;
  characters: string;
  locations: string;
  lore: string;
  timeline: string;
  relationships: string;
  progression: string;
  revisionIssues: string;
  snapshots: string;
}

export type WorkspaceCollapsibleSection =
  | "planChapterDetails"
  | "draftingChapterDetails"
  | "draftingTrackers"
  | "draftingDraftStudio"
  | "draftingScenes"
  | "draftingAssistants"
  | "draftingAnnotations"
  | "revisionChecklist"
  | "settingsRecovery";

export type FieldHelpKey =
  | "project.title"
  | "project.synopsis"
  | "chapter.summary"
  | "chapter.objectives"
  | "chapter.hook"
  | "chapter.storySoFar"
  | "bible.premise"
  | "bible.themes"
  | "bible.stakes"
  | "bible.worldRules"
  | "settings.baseUrl"
  | "settings.model"
  | "settings.apiKey"
  | "settings.toneGuide"
  | "settings.structureWeight";

export interface WorkspaceUiPrefs {
  activeTab: WorkspaceTab;
  filters: WorkspaceFilterState;
  collapsed: Record<WorkspaceCollapsibleSection, boolean>;
  companionOpen: boolean;
}

export const DEFAULT_WORKSPACE_FILTERS: WorkspaceFilterState = {
  chapterStructure: "",
  draftingOutline: "",
  characters: "",
  locations: "",
  lore: "",
  timeline: "",
  relationships: "",
  progression: "",
  revisionIssues: "",
  snapshots: "",
};

export const DEFAULT_WORKSPACE_UI_PREFS: WorkspaceUiPrefs = {
  activeTab: "plan",
  filters: DEFAULT_WORKSPACE_FILTERS,
  companionOpen: false,
  collapsed: {
    planChapterDetails: false,
    draftingChapterDetails: false,
    draftingTrackers: false,
    draftingDraftStudio: false,
    draftingScenes: false,
    draftingAssistants: false,
    draftingAnnotations: false,
    revisionChecklist: false,
    settingsRecovery: false,
  },
};
