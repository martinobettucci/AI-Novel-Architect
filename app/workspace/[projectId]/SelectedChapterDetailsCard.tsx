"use client";

import type { Chapter } from "@/app/domain/models";
import type { WorkspaceController } from "./useWorkspaceController";

export function SelectedChapterDetailsCard({
  ctx,
  containerClassName = "rounded-xl border border-slate-200 bg-slate-50 p-4",
  showOpenInDraftingButton = false,
}: {
  ctx: WorkspaceController;
  containerClassName?: string;
  showOpenInDraftingButton?: boolean;
}) {
  const {
    t,
    autocompleteSelectedChapterDetails,
    selectedChapter,
    chapterDetailsAiStatus,
    chapterDetailsAiMessage,
    chapterDetailsAiError,
    chapterDetailsPreview,
    applyChapterDetailsSuggestion,
    discardChapterDetailsSuggestion,
    saveChapter,
    setActiveTab,
    confirmDeleteChapter,
  } = ctx;

  return (
      <div className={containerClassName}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{t("chapter.detailsTitle")}</h3>
          <button
            onClick={() => void autocompleteSelectedChapterDetails()}
            disabled={!selectedChapter || chapterDetailsAiStatus === "running"}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {chapterDetailsAiStatus === "running" ? t("chapter.aiAutocompleting") : t("chapter.aiAutocomplete")}
          </button>
        </div>
        {chapterDetailsAiMessage && (
          <p className="mt-3 text-sm text-emerald-700">{chapterDetailsAiMessage}</p>
        )}
        {chapterDetailsAiError && (
          <p className="mt-3 text-sm text-rose-700">{chapterDetailsAiError}</p>
        )}
        {chapterDetailsPreview && selectedChapter && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
<p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{t("ai.proposalNotApplied")}</p>
            <dl className="mt-2 space-y-2 text-sm text-slate-800">
              {chapterDetailsPreview.title && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("chapter.title")}</dt>
                  <dd>{chapterDetailsPreview.title}</dd>
                </div>
              )}
              {chapterDetailsPreview.summary && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("chapter.summary")}</dt>
                  <dd className="whitespace-pre-wrap">{chapterDetailsPreview.summary}</dd>
                </div>
              )}
              {chapterDetailsPreview.objectives && chapterDetailsPreview.objectives.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("chapter.objectives")}</dt>
                  <dd>{chapterDetailsPreview.objectives.join(", ")}</dd>
                </div>
              )}
              {chapterDetailsPreview.hook && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("chapter.hook")}</dt>
                  <dd className="whitespace-pre-wrap">{chapterDetailsPreview.hook}</dd>
                </div>
              )}
              {chapterDetailsPreview.storySoFar && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("chapter.storySoFar")}</dt>
                  <dd className="whitespace-pre-wrap">{chapterDetailsPreview.storySoFar}</dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => void applyChapterDetailsSuggestion()}
                className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {t("ai.applyProposal")}
              </button>
              <button
                onClick={discardChapterDetailsSuggestion}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
              >
                {t("ai.discard")}
              </button>
            </div>
          </div>
        )}
        {selectedChapter ? (
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm text-slate-700">
              {t("chapter.title")}
              <input
                value={selectedChapter.title}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    title: event.target.value,
                  })
                }
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              {t("chapter.summary")}
              <textarea
                rows={3}
                value={selectedChapter.summary}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    summary: event.target.value,
                  })
                }
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              {t("chapter.objectives")}
              <input
                value={selectedChapter.objectives.join(", ")}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    objectives: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              {t("chapter.hook")}
              <textarea
                rows={2}
                value={selectedChapter.hook}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    hook: event.target.value,
                  })
                }
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              {t("chapter.storySoFar")}
              <textarea
                rows={2}
                value={selectedChapter.storySoFar}
                onChange={(event) =>
                  void saveChapter({
                    ...selectedChapter,
                    storySoFar: event.target.value,
                  })
                }
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-700">
                {t("chapter.status")}
                <select
                  value={selectedChapter.status}
                  onChange={(event) =>
                    void saveChapter({
                      ...selectedChapter,
                      status: event.target.value as Chapter["status"],
                    })
                  }
                  className="rounded border border-slate-300 px-2 py-1"
                >
                  <option value="draft">{t("chapter.statusDraft")}</option>
                  <option value="in-progress">{t("chapter.statusInProgress")}</option>
                  <option value="revision">{t("chapter.statusRevision")}</option>
                  <option value="completed">{t("chapter.statusCompleted")}</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                {t("chapter.wordTarget")}
                <input
                  type="number"
                  min={0}
                  value={selectedChapter.wordCountTarget}
                  onChange={(event) =>
                    void saveChapter({
                      ...selectedChapter,
                      wordCountTarget: Number(event.target.value) || 0,
                    })
                  }
                  className="rounded border border-slate-300 px-2 py-1"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {showOpenInDraftingButton && (
                <button
                  onClick={() => setActiveTab("drafting")}
                  className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  {t("chapter.openInDrafting")}
                </button>
              )}
              <button
                onClick={() => void confirmDeleteChapter(selectedChapter)}
                className="rounded border border-rose-300 px-3 py-2 text-sm text-rose-700"
              >
                {t("chapter.delete")}
              </button>
            </div>
          </div>
        ) : (
<p className="mt-3 text-sm text-slate-600">{t("chapter.selectPrompt")}</p>
        )}
      </div>
  );
}
