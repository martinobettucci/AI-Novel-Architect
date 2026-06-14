import { describe, expect, it } from "vitest";
import { loadWorkspaceUiPrefs, saveWorkspaceUiPrefs } from "@/app/workspace/[projectId]/ui/prefs";
import { DEFAULT_WORKSPACE_UI_PREFS } from "@/app/workspace/[projectId]/ui/types";

describe("workspace ui prefs", () => {
  it("returns defaults when nothing is stored", () => {
    expect(loadWorkspaceUiPrefs("project-x")).toEqual(DEFAULT_WORKSPACE_UI_PREFS);
  });

  it("persists and restores per-project preferences", () => {
    saveWorkspaceUiPrefs("project-a", {
      ...DEFAULT_WORKSPACE_UI_PREFS,
      activeTab: "marketing",
      filters: {
        ...DEFAULT_WORKSPACE_UI_PREFS.filters,
        characters: "hero",
      },
      collapsed: {
        ...DEFAULT_WORKSPACE_UI_PREFS.collapsed,
        draftingAssistants: true,
      },
    });

    saveWorkspaceUiPrefs("project-b", {
      ...DEFAULT_WORKSPACE_UI_PREFS,
      activeTab: "settings",
    });

    const a = loadWorkspaceUiPrefs("project-a");
    const b = loadWorkspaceUiPrefs("project-b");

    expect(a.activeTab).toBe("marketing");
    expect(a.filters.characters).toBe("hero");
    expect(a.collapsed.draftingAssistants).toBe(true);
    expect(b.activeTab).toBe("settings");
    expect(b.filters.characters).toBe("");
  });
});
