import {
  DEFAULT_WORKSPACE_FILTERS,
  DEFAULT_WORKSPACE_UI_PREFS,
  type WorkspaceFilterState,
  type WorkspaceUiPrefs,
} from "@/app/workspace/[projectId]/ui/types";

const STORAGE_PREFIX = "ana:ui-prefs:";

function keyForProject(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

function isWorkspaceUiPrefs(value: unknown): value is WorkspaceUiPrefs {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.activeTab === "string" &&
    !!candidate.filters &&
    typeof candidate.filters === "object" &&
    !!candidate.collapsed &&
    typeof candidate.collapsed === "object"
  );
}

export function loadWorkspaceUiPrefs(projectId: string): WorkspaceUiPrefs {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE_UI_PREFS;
  try {
    const raw = window.localStorage.getItem(keyForProject(projectId));
    if (!raw) return DEFAULT_WORKSPACE_UI_PREFS;
    const parsed = JSON.parse(raw) as unknown;
    if (!isWorkspaceUiPrefs(parsed)) return DEFAULT_WORKSPACE_UI_PREFS;
    return {
      ...DEFAULT_WORKSPACE_UI_PREFS,
      ...parsed,
      filters: {
        ...DEFAULT_WORKSPACE_FILTERS,
        ...(parsed.filters as WorkspaceFilterState),
      },
      collapsed: {
        ...DEFAULT_WORKSPACE_UI_PREFS.collapsed,
        ...(parsed.collapsed as WorkspaceUiPrefs["collapsed"]),
      },
    };
  } catch {
    return DEFAULT_WORKSPACE_UI_PREFS;
  }
}

export function saveWorkspaceUiPrefs(projectId: string, prefs: WorkspaceUiPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyForProject(projectId), JSON.stringify(prefs));
  } catch {
    // Ignore write failures in private mode or storage-restricted contexts.
  }
}
