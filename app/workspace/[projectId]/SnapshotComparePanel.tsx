"use client";

import { useMemo, useState } from "react";
import { applyMerge, buildMergeSegments, type MergeChoice } from "@/app/lib/snapshotMerge";
import type { WorkspaceController } from "./useWorkspaceController";

export function SnapshotComparePanel({ ctx }: { ctx: WorkspaceController }) {
  const { t, activeProject, saveChapter } = ctx;
  const [snapshotId, setSnapshotId] = useState<string>("");
  const [choices, setChoices] = useState<Record<number, MergeChoice>>({});
  const [message, setMessage] = useState<string | null>(null);

  const snapshots = activeProject?.snapshots ?? [];
  const snapshot = snapshots.find((item) => item.id === snapshotId) ?? snapshots[0] ?? null;
  const chapter = snapshot?.chapterId
    ? activeProject?.chapters.find((item) => item.id === snapshot.chapterId) ?? null
    : null;

  const segments = useMemo(
    () => (snapshot && chapter ? buildMergeSegments(snapshot.payload, chapter.content) : []),
    [snapshot, chapter]
  );
  const changes = segments.filter((segment) => !segment.same);

  if (!activeProject || snapshots.length === 0) return null;

  function choose(id: number, side: MergeChoice) {
    setChoices((current) => ({ ...current, [id]: side }));
  }

  async function applySelective() {
    if (!chapter) return;
    const merged = applyMerge(segments, choices);
    await saveChapter({ ...chapter, content: merged });
    setMessage(t("snapshot.applied"));
  }

  async function restoreFull() {
    if (!chapter || !snapshot) return;
    await saveChapter({ ...chapter, content: snapshot.payload });
    setMessage(t("snapshot.applied"));
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
      <h2 className="text-xl font-semibold text-slate-900">{t("snapshot.compare")}</h2>

      <label className="mt-3 grid max-w-xl gap-1 text-sm text-slate-700">
        {t("snapshot.selectSnapshot")}
        <select
          value={snapshot?.id ?? ""}
          onChange={(event) => {
            setSnapshotId(event.target.value);
            setChoices({});
            setMessage(null);
          }}
          className="rounded border border-slate-300 px-2 py-1"
        >
          {snapshots.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} · {new Date(item.createdAt).toLocaleString()}
            </option>
          ))}
        </select>
      </label>

      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}

      {!chapter ? (
        <p className="mt-3 text-sm text-slate-600">{t("snapshot.noChapter")}</p>
      ) : changes.length === 0 ? (
        <p className="mt-3 text-sm text-emerald-700">{t("snapshot.identical")}</p>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {changes.map((segment, index) => {
              const side = choices[segment.id] ?? "current";
              return (
                <div key={segment.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("snapshot.hunk", { n: index + 1 })}
                    </span>
                    <div className="flex gap-1 text-xs">
                      <button
                        onClick={() => choose(segment.id, "snapshot")}
                        className={`rounded px-2 py-1 ${side === "snapshot" ? "bg-amber-200 font-semibold text-amber-900" : "border border-slate-300 text-slate-700"}`}
                      >
                        {t("snapshot.useSnapshot")}
                      </button>
                      <button
                        onClick={() => choose(segment.id, "current")}
                        className={`rounded px-2 py-1 ${side === "current" ? "bg-teal-200 font-semibold text-teal-900" : "border border-slate-300 text-slate-700"}`}
                      >
                        {t("snapshot.useCurrent")}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className={`rounded border p-2 text-xs ${side === "snapshot" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className="mb-1 font-semibold text-slate-500">{t("snapshot.useSnapshot")}</p>
                      <div
                        className="prose-view max-w-none text-slate-700"
                        dangerouslySetInnerHTML={{ __html: segment.snapshotLines.join("") || "—" }}
                      />
                    </div>
                    <div className={`rounded border p-2 text-xs ${side === "current" ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className="mb-1 font-semibold text-slate-500">{t("snapshot.useCurrent")}</p>
                      <div
                        className="prose-view max-w-none text-slate-700"
                        dangerouslySetInnerHTML={{ __html: segment.currentLines.join("") || "—" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => void applySelective()}
              className="rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
            >
              {t("snapshot.applyMerge")}
            </button>
            <button
              onClick={() => void restoreFull()}
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              {t("snapshot.restoreFull")}
            </button>
          </div>
        </>
      )}
    </article>
  );
}
