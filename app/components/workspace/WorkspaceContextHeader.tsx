"use client";

import Link from "next/link";

export default function WorkspaceContextHeader({
  workspaceLabel,
  title,
  meta,
  offline,
  pendingAiCount,
  labels,
  onOpenCompanion,
}: {
  workspaceLabel: string;
  title: string;
  meta: string;
  offline: boolean;
  pendingAiCount: number;
  labels?: {
    online: string;
    offline: string;
    queuedAi: string;
    backToDashboard: string;
    companion?: string;
  };
  onOpenCompanion?: () => void;
}) {
  const uiLabels = labels ?? {
    online: "Online",
    offline: "Offline",
    queuedAi: "Queued AI tasks",
    backToDashboard: "Back to dashboard",
    companion: "Companion",
  };

  return (
    <div className="workspace-context">
      <div className="workspace-context__inner">
        <div className="workspace-context__layout">
          <div className="workspace-context__copy">
            <p className="workspace-context__eyebrow">{workspaceLabel}</p>
            <h1 className="workspace-context__title">{title}</h1>
            <p className="workspace-context__meta">{meta}</p>
          </div>

          <div className="workspace-context__status">
            <span
              className={`workspace-context__badge ${
                offline
                  ? "workspace-context__badge--offline"
                  : "workspace-context__badge--online"
              }`}
            >
              {offline ? uiLabels.offline : uiLabels.online}
            </span>
            <span className="workspace-context__badge workspace-context__badge--queue">
              {uiLabels.queuedAi}: {pendingAiCount}
            </span>
            <Link href="/" className="workspace-context__link">
              {uiLabels.backToDashboard}
            </Link>
            {onOpenCompanion && (
              <button
                type="button"
                onClick={onOpenCompanion}
                className="workspace-context__link"
                aria-label="Open project companion"
              >
                {uiLabels.companion ?? "Companion"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
