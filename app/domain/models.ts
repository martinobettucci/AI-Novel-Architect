export type Locale = "fr" | "en";

export type ProjectStatus = "active" | "archived";

export type ChapterStatus = "draft" | "in-progress" | "revision" | "completed";

export type RevisionStatus = "open" | "in-progress" | "resolved";

export type ChecklistScope = "revision" | "publish" | "launch";

export type AiActionType =
  | "brainstorm"
  | "expand"
  | "rewrite"
  | "summarize"
  | "continue"
  | "dialogue_polish"
  | "plan_audit"
  | "consistency_check"
  | "revision_pass"
  | "grammar_suggestions"
  | "style_transform"
  | "marketing_copy"
  | "publish_artifact";

export type AiActionStatus = "pending" | "completed" | "failed";

export type SettingScope = "global" | "project" | "feature";

export type TrackedEntityType =
  | "character"
  | "location"
  | "lore"
  | "timeline_event";

export type HistoryEntityType = TrackedEntityType | "relationship";

export type ChapterTrackerType =
  | "characters"
  | "locations"
  | "lore"
  | "timelines"
  | "relationships"
  | "progressions";

export type DetectionStrength =
  | "explicit"
  | "strong_inference"
  | "weak_inference"
  | "conflict"
  | "insufficient_evidence";

export type DeltaStatus = "proposed" | "validated" | "rejected";

export type DeltaLayer =
  | "startState"
  | "endState"
  | "knowledge"
  | "belief"
  | "inventory"
  | "narrationStatus"
  | "summary"
  | "relationship";

export type VerifierVerdict = "accepted" | "uncertain" | "rejected";

/** A text span from the manuscript that justifies a proposed canon change. */
export interface EvidenceSpan {
  chapterId?: string;
  quote: string;
  note?: string;
}

/**
 * A structured, evidence-backed proposal to change one layer of one tracked
 * entity. Canon never mutates until a delta is explicitly validated.
 */
export interface CanonDelta {
  id: string;
  projectId: string;
  chapterId?: string;
  entityType: HistoryEntityType | "chapter";
  entityId: string;
  entityLabel: string;
  layer: DeltaLayer;
  before: string;
  after: string;
  confidence: DetectionStrength;
  rationale: string;
  evidence: EvidenceSpan[];
  status: DeltaStatus;
  source: "ai" | "author";
  verifierVerdict: VerifierVerdict;
  verifierReason: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

/** Per-day writing throughput, used to measure progress against goals. */
export interface WritingSession {
  id: string;
  projectId: string;
  date: string;
  wordsWritten: number;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  genre: string;
  audience: string;
  tone: string;
  targetWordCount: number;
  language: Locale;
  status: ProjectStatus;
  synopsis: string;
  createdAt: string;
  updatedAt: string;
}

export interface Manuscript {
  projectId: string;
  manuscriptTitle: string;
  subtitle: string;
  premise: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  projectId: string;
  number: number;
  title: string;
  summary: string;
  objectives: string[];
  hook: string;
  storySoFar: string;
  notes: string;
  wordCountTarget: number;
  wordCountCurrent: number;
  status: ChapterStatus;
  content: string;
  aiLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  projectId: string;
  chapterId: string;
  order: number;
  title: string;
  description: string;
  location: string;
  characters: string[];
  /** Id of the focal/POV character for this scene, if assigned. */
  povCharacterId?: string;
  notes: string;
  draftText: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryBible {
  id: string;
  projectId: string;
  premise: string;
  themes: string[];
  stakes: string;
  worldRules: string;
  loreEntries: string[];
  glossaryEntries: string[];
  locations: string[];
  updatedAt: string;
}

export interface CharacterProfile {
  id: string;
  projectId: string;
  name: string;
  role: string;
  motivation: string;
  arc: string;
  voice: string;
  relationships: string;
  notes: string;
  updatedAt: string;
}

export interface LocationProfile {
  id: string;
  projectId: string;
  name: string;
  role: string;
  narrativeStatus: string;
  description: string;
  notes: string;
  updatedAt: string;
}

export interface LoreEntryRecord {
  id: string;
  projectId: string;
  title: string;
  category: string;
  status: string;
  description: string;
  notes: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  order: number;
  chapterId?: string;
  label: string;
  details: string;
  impact: string;
  updatedAt: string;
}

export interface NarrativeRelationship {
  id: string;
  projectId: string;
  sourceType: TrackedEntityType;
  sourceId: string;
  targetType: TrackedEntityType;
  targetId: string;
  relationType: string;
  status: string;
  intensity: number;
  notes: string;
  updatedAt: string;
}

export interface EntityProgression {
  id: string;
  projectId: string;
  chapterId?: string;
  sceneId?: string;
  entityType: TrackedEntityType;
  entityId: string;
  label: string;
  startState: string;
  evidence: string;
  proposedDelta: string;
  validatedDelta: string;
  endState: string;
  knowledge: string;
  belief: string;
  inventory: string;
  narrationStatus: string;
  confidence: DetectionStrength;
  aiSuggestion: string;
  updatedAt: string;
}

export interface EntityHistoryEntry {
  id: string;
  projectId: string;
  chapterId: string;
  entityType: HistoryEntityType;
  entityId: string;
  label: string;
  note: string;
  updatedAt: string;
}

export interface RevisionIssue {
  id: string;
  projectId: string;
  chapterId?: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  status: RevisionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  projectId: string;
  scope: ChecklistScope;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Annotation {
  id: string;
  projectId: string;
  chapterId: string;
  quote: string;
  note: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WritingGoal {
  id: string;
  projectId: string;
  dailyWords: number;
  sessionWords: number;
  chapterWords: number;
  updatedAt: string;
}

export interface Snapshot {
  id: string;
  projectId: string;
  chapterId?: string;
  label: string;
  payload: string;
  createdAt: string;
}

export interface AiAction {
  id: string;
  projectId: string;
  chapterId?: string;
  action: AiActionType;
  status: AiActionStatus;
  model: string;
  providerBaseUrl: string;
  inputPreview: string;
  outputPreview: string;
  metadata: string;
  createdAt: string;
}

export interface ChapterTrackerReport {
  id: string;
  projectId: string;
  chapterId: string;
  trackerType: ChapterTrackerType;
  previousState: string;
  chapterEvolution: string;
  finalState: string;
  rawResponse: string;
  updatedAt: string;
}

export interface SettingsProfile {
  id: string;
  scope: SettingScope;
  projectId?: string;
  featureKey?: string;
  values: string;
  updatedAt: string;
}

export interface LlmSettings {
  baseUrl: string;
  model: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
}

export interface PromptSettings {
  systemPrompt: string;
  toneGuide: string;
  safetyMode: "preview";
}

export interface QaSettings {
  rubricWeights: {
    structure: number;
    character: number;
    pacing: number;
    style: number;
  };
  enforceChecklistBeforeExport: boolean;
}

export interface AppSettings {
  locale: Locale;
  uiLocale: Locale;
  llm: LlmSettings;
  prompts: PromptSettings;
  qa: QaSettings;
}

export interface ProjectBundle {
  project: Project;
  manuscript: Manuscript;
  chapters: Chapter[];
  scenes: Scene[];
  bible: StoryBible;
  characters: CharacterProfile[];
  locations: LocationProfile[];
  loreEntries: LoreEntryRecord[];
  timeline: TimelineEvent[];
  relationships: NarrativeRelationship[];
  entityProgression: EntityProgression[];
  entityHistory: EntityHistoryEntry[];
  revisionIssues: RevisionIssue[];
  checklist: ChecklistItem[];
  annotations: Annotation[];
  goal: WritingGoal;
  snapshots: Snapshot[];
  aiActions: AiAction[];
  chapterTrackerReports: ChapterTrackerReport[];
  canonDeltas: CanonDelta[];
  writingSessions: WritingSession[];
}

export interface PublishingArtifacts {
  metadataSheet: string;
  synopsisShort: string;
  synopsisLong: string;
  chapterManifest: string;
}

export interface MarketingArtifacts {
  blurb: string;
  tagline: string;
  pitchVariants: string[];
  socialSnippets: string[];
  emailDraft: string;
  coverBriefPrompt: string;
  launchChecklist: string[];
}

export type ContinuityCode =
  | "scene_missing_chapter"
  | "scene_unknown_character"
  | "scene_unknown_location"
  | "relationship_missing_entity"
  | "progression_missing_entity"
  | "progression_delta_no_evidence"
  | "history_missing_chapter"
  | "history_missing_relationship"
  | "history_missing_entity"
  | "no_world_rules"
  | "no_timeline"
  | "pov_unassigned"
  | "pov_deleted_character"
  | "pov_not_present";

export interface ContinuityConflict {
  id: string;
  type: "character" | "timeline" | "world";
  /** English message (also used verbatim in AI prompts). */
  message: string;
  /** Stable code + params so the UI can render a localized message. */
  code: ContinuityCode;
  params?: Record<string, string>;
  chapterId?: string;
}

export interface ResolvedSettings {
  settings: AppSettings;
  sourceOrder: string[];
}
