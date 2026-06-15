"use client";

import { useMemo, useState } from "react";
import { buildKnowledgeTimeline } from "@/app/lib/repository";
import { chapterLabel } from "./helpers";
import type { WorkspaceController } from "./useWorkspaceController";

export function KnowledgePanel({ ctx }: { ctx: WorkspaceController }) {
  const { t, activeProject } = ctx;
  const [characterId, setCharacterId] = useState<string>("");

  const characters = activeProject?.characters ?? [];
  const effectiveId = characters.some((c) => c.id === characterId)
    ? characterId
    : characters[0]?.id ?? "";

  const timeline = useMemo(
    () => (activeProject && effectiveId ? buildKnowledgeTimeline(activeProject, effectiveId) : []),
    [activeProject, effectiveId]
  );

  const divergences = timeline.filter((frame) => frame.diverges).length;

  if (!activeProject) return null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t("pov.title")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("pov.subtitle")}</p>
        </div>
        {characters.length > 0 && (
          <label className="grid gap-1 text-sm text-slate-700">
            {t("pov.character")}
            <select
              value={effectiveId}
              onChange={(event) => setCharacterId(event.target.value)}
              className="rounded border border-slate-300 px-3 py-2"
            >
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name || t("pov.unnamed")}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {characters.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
{t("pov.empty")}
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
{t("pov.divergences", { count: divergences })}
          </p>
          <div className="mt-2 space-y-2">
            {timeline.map((frame) => (
              <div
                key={frame.chapterId}
                className={`rounded-lg border p-3 ${
                  frame.diverges ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {chapterLabel({
                      number: frame.chapterNumber,
                      title: frame.chapterTitle,
                    } as Parameters<typeof chapterLabel>[0])}
                  </p>
                  {frame.diverges && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      {t("pov.dramaticIrony")}
                    </span>
                  )}
                </div>
                <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
{t("pov.knows")}
                    </dt>
                    <dd className="text-slate-800">{frame.knowledge || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
{t("pov.believes")}
                    </dt>
                    <dd className="text-slate-800">{frame.belief || "—"}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
