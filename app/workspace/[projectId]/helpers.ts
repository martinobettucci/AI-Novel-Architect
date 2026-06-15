import type {
  Chapter,
  ChapterTrackerType,
  EntityHistoryEntry,
  Scene,
  TrackedEntityType,
} from "@/app/domain/models";
import { downloadText } from "@/app/lib/download";

export type WorkspaceTab =
  | "plan"
  | "bible"
  | "drafting"
  | "revision"
  | "publish"
  | "marketing"
  | "settings";

export const TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "plan", label: "Plan" },
  { id: "bible", label: "Story Bible" },
  { id: "drafting", label: "Drafting" },
  { id: "revision", label: "Revision" },
  { id: "publish", label: "Publish" },
  { id: "marketing", label: "Marketing" },
  { id: "settings", label: "Settings" },
];

export function tabClass(active: boolean): string {
  return active
    ? "rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
    : "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100";
}

export function chapterLabel(chapter: Chapter): string {
  return `Ch.${chapter.number} ${chapter.title.trim() || "Untitled chapter"}`;
}

export function sceneLabel(scene: Scene): string {
  return scene.title.trim() || `Untitled scene ${scene.order}`;
}

export function entityTypeLabel(type: TrackedEntityType): string {
  return type.replace(/_/g, " ");
}

export function historyEntityTypeLabel(type: EntityHistoryEntry["entityType"]): string {
  return type === "relationship" ? "relationship" : entityTypeLabel(type);
}

export function chapterTrackerLabel(type: ChapterTrackerType): string {
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

export function asProjectLanguage(value: string): "fr" | "en" {
  return value === "en" ? "en" : "fr";
}

export function normalizeLookupKey(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function downloadArtifacts(prefix: string, content: Record<string, string>) {
  Object.entries(content).forEach(([name, value]) => {
    const extension = name.endsWith("checklist") ? "txt" : "md";
    downloadText(`${prefix}-${name}.${extension}`, value);
  });
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function plainTextToHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function plainTextWordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export const SCENE_FIELD_HELP = {
  title: "Short working label for the scene. Use the dramatic turn or key event.",
  description:
    "What happens in the scene from start to finish. Focus on action, conflict, and outcome.",
  location:
    "Primary setting for the scene. Use a consistent place name to help continuity checks.",
  characters: "List the characters present in the scene, separated by commas.",
  notes:
    "Continuity anchors, subtext, props, reveals, POV constraints, or reminders for later scenes.",
  draftText:
    "A prose seed or beat outline that can be expanded into full scene draft text.",
} as const;
