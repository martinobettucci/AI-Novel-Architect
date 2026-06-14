"use client";

import { useEffect, useState } from "react";
import { loadWorkspaceUiPrefs, saveWorkspaceUiPrefs } from "@/app/workspace/[projectId]/ui/prefs";
import type { WorkspaceUiPrefs } from "@/app/workspace/[projectId]/ui/types";

export function useWorkspaceUiPrefs(projectId: string) {
  const [prefs, setPrefs] = useState<WorkspaceUiPrefs>(() => loadWorkspaceUiPrefs(projectId));

  useEffect(() => {
    saveWorkspaceUiPrefs(projectId, prefs);
  }, [prefs, projectId]);

  return { prefs, setPrefs };
}
