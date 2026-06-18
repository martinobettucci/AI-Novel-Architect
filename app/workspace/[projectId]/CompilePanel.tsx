"use client";

import { useMemo, useState } from "react";
import { compileManuscript } from "@/app/lib/repository";
import { downloadText } from "@/app/lib/download";
import { chapterLabel } from "./helpers";
import type { WorkspaceController } from "./useWorkspaceController";

export function CompilePanel({ ctx }: { ctx: WorkspaceController }) {
  const { t, activeProject, projectIdValue } = ctx;
  const chapters = useMemo(
    () => (activeProject ? activeProject.chapters.slice().sort((a, b) => a.number - b.number) : []),
    [activeProject]
  );

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sceneMode, setSceneMode] = useState<"chapter" | "scenes">("chapter");
  const [includeFrontMatter, setIncludeFrontMatter] = useState(true);
  const [compiled, setCompiled] = useState<string>("");

  if (!activeProject) return null;

  const isSelected = (id: string) => selected[id] ?? true;
  const selectedIds = chapters.filter((chapter) => isSelected(chapter.id)).map((c) => c.id);

  function setAll(value: boolean) {
    const next: Record<string, boolean> = {};
    chapters.forEach((chapter) => {
      next[chapter.id] = value;
    });
    setSelected(next);
  }

  function generate() {
    if (selectedIds.length === 0) {
      setCompiled("");
      return;
    }
    setCompiled(
      compileManuscript(activeProject!, {
        chapterIds: selectedIds,
        includeFrontMatter,
        sceneMode,
      })
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
      <h2 className="text-xl font-semibold text-slate-900">{t("compile.title")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("compile.subtitle")}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <button onClick={() => setAll(true)} className="rounded border border-slate-300 px-2 py-1 text-xs">
          {t("compile.selectAll")}
        </button>
        <button onClick={() => setAll(false)} className="rounded border border-slate-300 px-2 py-1 text-xs">
          {t("compile.selectNone")}
        </button>
        <label className="flex items-center gap-1">
          {t("compile.sceneMode")}
          <select
            value={sceneMode}
            onChange={(event) => setSceneMode(event.target.value as "chapter" | "scenes")}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="chapter">{t("compile.fromChapters")}</option>
            <option value="scenes">{t("compile.fromScenes")}</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={includeFrontMatter}
            onChange={(event) => setIncludeFrontMatter(event.target.checked)}
          />
          {t("compile.frontMatter")}
        </label>
      </div>

      {chapters.length > 0 && (
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {chapters.map((chapter) => (
            <li key={chapter.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isSelected(chapter.id)}
                onChange={(event) =>
                  setSelected((current) => ({ ...current, [chapter.id]: event.target.checked }))
                }
              />
              <span>{chapterLabel(chapter)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={generate}
          disabled={selectedIds.length === 0}
          className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t("compile.generate")}
        </button>
        {compiled && (
          <>
            <button
              onClick={() => downloadText(`${projectIdValue}.manuscript.md`, compiled, "text/markdown;charset=utf-8")}
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              {t("compile.download")}
            </button>
            <span className="text-xs text-slate-500">
              {t("compile.generatedChars", { count: compiled.length })}
            </span>
          </>
        )}
        {selectedIds.length === 0 && <span className="text-xs text-rose-700">{t("compile.nothing")}</span>}
      </div>

      {compiled && (
        <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {compiled}
        </pre>
      )}
    </article>
  );
}
