"use client";

import { chapterLabel, sceneLabel } from "../helpers";
import type { WorkspaceController } from "../useWorkspaceController";
import { SelectedChapterDetailsCard } from "../SelectedChapterDetailsCard";

export function PlanTab({ ctx }: { ctx: WorkspaceController }) {
  const {
    project,
    activeProject,
    saveProjectMeta,
    continuityConflicts,
    manuscriptWordCount,
    selectedChapter,
    saveGoal,
    addChapter,
    reorderChapter,
    saveChapter,
    createManualScene,
    confirmDeleteChapter,
    setSelectedChapterId,
    reorderScene,
    deleteScene,
  } = ctx;
  if (!project || !activeProject) return null;

  return (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">Project metadata</h2>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-sm text-slate-700">
                  Title
                  <input
                    value={project.title}
                    onChange={(event) =>
                      void saveProjectMeta({
                        title: event.target.value,
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  Synopsis
                  <textarea
                    rows={4}
                    value={project.synopsis}
                    onChange={(event) =>
                      void saveProjectMeta({
                        synopsis: event.target.value,
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">Continuity conflicts</h2>
              {continuityConflicts.length === 0 ? (
                <p className="mt-3 text-sm text-emerald-700">No continuity conflicts detected.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {continuityConflicts.map((conflict) => (
                    <li key={conflict.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase">
                        {conflict.type}
                      </span>
                      {conflict.message}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">Writing goals & progress</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                <div>
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span>Manuscript progress</span>
                    <span className="font-semibold">
                      {manuscriptWordCount.toLocaleString()} / {project.targetWordCount.toLocaleString()} words
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={project.targetWordCount}
                    aria-valuenow={Math.min(manuscriptWordCount, project.targetWordCount)}
                    className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"
                  >
                    <div
                      className="h-full rounded-full bg-teal-600"
                      style={{
                        width: `${Math.min(
                          100,
                          project.targetWordCount > 0
                            ? Math.round((manuscriptWordCount / project.targetWordCount) * 100)
                            : 0
                        )}%`,
                      }}
                    />
                  </div>
                  {selectedChapter && (
                    <>
                      <div className="mt-4 flex items-center justify-between text-sm text-slate-700">
                        <span>{chapterLabel(selectedChapter)}</span>
                        <span className="font-semibold">
                          {selectedChapter.wordCountCurrent.toLocaleString()} /{" "}
                          {(selectedChapter.wordCountTarget || activeProject.goal.chapterWords).toLocaleString()}{" "}
                          words
                        </span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-600"
                          style={{
                            width: `${Math.min(
                              100,
                              (selectedChapter.wordCountTarget || activeProject.goal.chapterWords) > 0
                                ? Math.round(
                                    (selectedChapter.wordCountCurrent /
                                      (selectedChapter.wordCountTarget ||
                                        activeProject.goal.chapterWords)) *
                                      100
                                  )
                                : 0
                            )}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="grid gap-2 self-start rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Targets
                  </p>
                  <label className="grid gap-1 text-sm text-slate-700">
                    Daily words
                    <input
                      type="number"
                      min={0}
                      value={activeProject.goal.dailyWords}
                      onChange={(event) =>
                        void saveGoal({
                          ...activeProject.goal,
                          dailyWords: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                      className="rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                  <label className="grid gap-1 text-sm text-slate-700">
                    Session words
                    <input
                      type="number"
                      min={0}
                      value={activeProject.goal.sessionWords}
                      onChange={(event) =>
                        void saveGoal({
                          ...activeProject.goal,
                          sessionWords: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                      className="rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                  <label className="grid gap-1 text-sm text-slate-700">
                    Default chapter words
                    <input
                      type="number"
                      min={0}
                      value={activeProject.goal.chapterWords}
                      onChange={(event) =>
                        void saveGoal({
                          ...activeProject.goal,
                          chapterWords: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                      className="rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    The chapter bar uses the chapter word target when set, otherwise the default
                    chapter goal.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Chapter structure</h2>
                <button
                  onClick={() => void addChapter()}
                  className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
                >
                  Add chapter
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div className="space-y-3">
                  {activeProject.chapters.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                      This project starts with an empty structure. Add chapters only where you need them.
                    </div>
                  )}

                  {activeProject.chapters
                    .sort((a, b) => a.number - b.number)
                    .map((chapter) => {
                      const scenes = activeProject.scenes.filter((scene) => scene.chapterId === chapter.id);
                      const selected = selectedChapter?.id === chapter.id;
                      return (
                        <div
                          key={chapter.id}
                          className={`rounded-xl border p-4 ${
                            selected ? "border-teal-300 bg-teal-50/60" : "border-slate-200"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <button
                              onClick={() => setSelectedChapterId(chapter.id)}
                              className="min-w-0 text-left"
                            >
                              <p className="text-sm font-semibold text-slate-900">{chapterLabel(chapter)}</p>
                              <p className="text-xs text-slate-600">
                                {chapter.summary || "No summary yet"}
                              </p>
                            </button>

                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                onClick={() => void reorderChapter(chapter.number, chapter.number - 1)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs"
                              >
                                Up
                              </button>
                              <button
                                onClick={() => void reorderChapter(chapter.number, chapter.number + 1)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs"
                              >
                                Down
                              </button>
                              <button
                                onClick={() =>
                                  void saveChapter({
                                    ...chapter,
                                    aiLocked: !chapter.aiLocked,
                                  })
                                }
                                className={`rounded px-2 py-1 text-xs ${
                                  chapter.aiLocked
                                    ? "border border-rose-300 bg-rose-50 text-rose-700"
                                    : "border border-slate-300 text-slate-700"
                                }`}
                              >
                                {chapter.aiLocked ? "AI Locked" : "AI Unlocked"}
                              </button>
                              <button
                                onClick={() => void createManualScene(chapter.id)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs"
                                title="Create a blank scene card in this chapter and open it in the editor."
                              >
                                Add scene
                              </button>
                              <button
                                onClick={() => void confirmDeleteChapter(chapter)}
                                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 pl-3">
                            {scenes.length === 0 && (
                              <p className="text-xs text-slate-500">No scenes in this chapter yet.</p>
                            )}
                            {scenes
                              .sort((a, b) => a.order - b.order)
                              .map((scene) => (
                                <div
                                  key={scene.id}
                                  className="flex items-center justify-between gap-2 text-xs text-slate-600"
                                >
                                  <span>
                                    {scene.order}. {sceneLabel(scene)}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => void reorderScene(chapter.id, scene.order, scene.order - 1)}
                                      className="rounded border border-slate-300 px-1.5 py-0.5"
                                    >
                                      Up
                                    </button>
                                    <button
                                      onClick={() => void reorderScene(chapter.id, scene.order, scene.order + 1)}
                                      className="rounded border border-slate-300 px-1.5 py-0.5"
                                    >
                                      Down
                                    </button>
                                    <button
                                      onClick={() => void deleteScene(scene.id)}
                                      className="rounded border border-rose-300 px-1.5 py-0.5 text-rose-700"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                </div>

                <SelectedChapterDetailsCard
                  ctx={ctx}
                  containerClassName="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  showOpenInDraftingButton
                />
              </div>
            </article>
          </section>
  );
}
