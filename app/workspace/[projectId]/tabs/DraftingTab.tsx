"use client";

import { EditorContent } from "@tiptap/react";
import type { AiActionType } from "@/app/domain/models";
import { createId } from "@/app/domain/defaults";
import { ASSISTANTS } from "@/app/lib/ai/assistants";
import { listChapterTrackerTypes } from "@/app/lib/ai/chapterTrackers";
import { chapterLabel, chapterTrackerLabel, historyEntityTypeLabel, plainTextWordCount, SCENE_FIELD_HELP } from "../helpers";
import type { WorkspaceController } from "../useWorkspaceController";
import { SelectedChapterDetailsCard } from "../SelectedChapterDetailsCard";
import { CanonDeltaPanel } from "../CanonDeltaPanel";

export function DraftingTab({ ctx }: { ctx: WorkspaceController }) {
  const {
    t,
    activeProject,
    mainClass,
    setOutlineSearchVisible,
    outlineSearchVisible,
    searchText,
    setSearchText,
    replaceText,
    setReplaceText,
    applySearchReplace,
    searchReplaceMessage,
    addChapter,
    selectedChapter,
    setSelectedChapterId,
    chapterScore,
    chapterGrammarSuggestions,
    setFocusMode,
    focusMode,
    setReadingMode,
    readingMode,
    createSnapshot,
    editor,
    computeSelectedChapterTrackers,
    chapterTrackersAiStatus,
    chapterTrackersAiMessage,
    chapterTrackersAiError,
    selectedChapterTrackerReports,
    selectedChapterEntityHistory,
    generateChapterDraft,
    chapterDraftAiStatus,
    chapterDraftAiMessage,
    chapterDraftAiError,
    chapterDraftPreview,
    applyGeneratedChapterDraft,
    setChapterDraftPreview,
    suggestSceneCards,
    sceneCardsAiStatus,
    sceneCardsAiMessage,
    sceneCardsAiError,
    sceneDraftAiMessage,
    sceneDraftAiError,
    sceneCardsPreview,
    applySceneCardSuggestions,
    discardSceneCardSuggestions,
    selectedScenes,
    saveScene,
    deleteScene,
    generateSceneDraft,
    sceneDraftAiSceneId,
    appendSceneToDraft,
    sceneDraftPreview,
    applySceneDraftPreview,
    discardSceneDraftPreview,
    setSelectedAssistantId,
    setAiAction,
    selectedAssistant,
    aiAction,
    aiPromptContext,
    setAiPromptContext,
    runAiPreview,
    aiStatus,
    aiError,
    aiDiff,
    applyAiDraft,
    setAiDraft,
    setAiDiff,
    aiDraft,
    createManualScene,
    saveAnnotation,
    projectIdValue,
    deleteAnnotation,
  } = ctx;
  if (!activeProject) return null;

  return (
          <section className={mainClass}>
            <aside className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <h2 className="text-lg font-semibold text-slate-900">{t("drafting.outline")}</h2>
              <button
                onClick={() => setOutlineSearchVisible((current) => !current)}
                className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs"
              >
                {outlineSearchVisible ? t("drafting.hideSearchReplace") : t("drafting.showSearchReplace")}
              </button>

              {outlineSearchVisible && (
                <div className="mt-3 grid gap-2">
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder={t("drafting.searchPlaceholder")}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <input
                    value={replaceText}
                    onChange={(event) => setReplaceText(event.target.value)}
                    placeholder={t("drafting.replacePlaceholder")}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => void applySearchReplace()}
                    disabled={!searchText.trim()}
                    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {t("drafting.applyGlobally")}
                  </button>
                  {searchReplaceMessage && (
                    <p className="text-xs text-slate-600">{searchReplaceMessage}</p>
                  )}
                </div>
              )}

              {activeProject.chapters.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                  {t("drafting.noChapters")}
                  <button
                    onClick={() => void addChapter()}
                    className="mt-2 block rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    {t("drafting.addFirstChapter")}
                  </button>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {activeProject.chapters
                    .sort((a, b) => a.number - b.number)
                    .map((chapter) => (
                      <li key={chapter.id}>
                        <button
                          onClick={() => setSelectedChapterId(chapter.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                            selectedChapter?.id === chapter.id
                              ? "border-teal-600 bg-teal-50"
                              : "border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <p className="font-semibold text-slate-900">{chapterLabel(chapter)}</p>
                          <p className="text-xs text-slate-600">{chapter.status}</p>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </aside>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              {selectedChapter ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{chapterLabel(selectedChapter)}</h2>
                      <p className="text-xs text-slate-600">
                        {t("drafting.qualityLine", { score: chapterScore, count: chapterGrammarSuggestions.length })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFocusMode((current) => !current)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {focusMode ? t("drafting.exitFocus") : t("drafting.focusMode")}
                      </button>
                      <button
                        onClick={() => setReadingMode((current) => !current)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {readingMode ? t("drafting.editMode") : t("drafting.readingMode")}
                      </button>
                      <button
                        onClick={() =>
                          void createSnapshot(
                            `Manual snapshot ${new Date().toLocaleTimeString()}`,
                            selectedChapter.id,
                            editor?.getHTML() ?? selectedChapter.content
                          )
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {t("drafting.snapshot")}
                      </button>
                    </div>
                  </div>

                  <SelectedChapterDetailsCard
                    ctx={ctx}
                    containerClassName="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  />

                  <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Per-chapter trackers
                        </h3>
                        <p className="text-sm text-slate-600">
                          Compute chapter-specific states for characters, locations, lore,
                          timelines, relationships, and progressions from all prior chapters plus
                          the current draft.
                        </p>
                      </div>
                      <button
                        onClick={() => void computeSelectedChapterTrackers()}
                        disabled={chapterTrackersAiStatus === "running"}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        {chapterTrackersAiStatus === "running"
                          ? "Computing..."
                          : "Compute chapter trackers"}
                      </button>
                    </div>

                    {chapterTrackersAiMessage && (
                      <p className="mt-3 text-sm text-emerald-700">{chapterTrackersAiMessage}</p>
                    )}
                    {chapterTrackersAiError && (
                      <p className="mt-3 text-sm text-rose-700">{chapterTrackersAiError}</p>
                    )}

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {listChapterTrackerTypes().map((trackerType) => {
                        const report = selectedChapterTrackerReports.find(
                          (item) => item.trackerType === trackerType
                        );

                        return (
                          <article
                            key={trackerType}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold text-slate-900">
                                {chapterTrackerLabel(trackerType)}
                              </h4>
                              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                                {report ? "computed" : "pending"}
                              </span>
                            </div>

                            {report ? (
                              <div className="mt-3 space-y-3 text-sm text-slate-700">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Previous state
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap">
                                    {report.previousState || "None captured."}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Chapter evolution
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap">
                                    {report.chapterEvolution || "No evolution captured."}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    End-of-chapter state
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap">
                                    {report.finalState || "No final state captured."}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-slate-600">
                                No chapter report yet. Run the AI computation to derive this
                                tracker for the selected chapter.
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Chapter-linked entity history
                          </h4>
                          <p className="text-sm text-slate-600">
                            Parallel per-entity timeline notes stored for this chapter after recompute.
                          </p>
                        </div>
                        <span className="text-[11px] uppercase tracking-wide text-slate-500">
                          {selectedChapterEntityHistory.length}{" "}
                          {selectedChapterEntityHistory.length === 1 ? "entry" : "entries"}
                        </span>
                      </div>

                      {selectedChapterEntityHistory.length > 0 ? (
                        <div className="mt-3 grid gap-3">
                          {selectedChapterEntityHistory.map((entry) => (
                            <div
                              key={entry.id}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">
                                  {entry.label || "Untitled history entry"}
                                </p>
                                <span className="rounded-full bg-white px-2 py-1 text-[11px] uppercase tracking-wide text-slate-500">
                                  {historyEntityTypeLabel(entry.entityType)}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-slate-700">
                                {entry.note || "No chapter note recorded."}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-600">
                          No per-entity timeline entries were stored for this chapter yet. Run the
                          tracker computation after chapter details or draft text exist.
                        </p>
                      )}
                    </div>
                  </div>

                  <CanonDeltaPanel ctx={ctx} />

                  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
<h3 className="text-lg font-semibold text-slate-900">{t("drafting.draftStudio")}</h3>
                        <p className="text-sm text-slate-600">
                          Write directly in the editor below or generate a full chapter draft from
                          the story bible, tracked entities, relationships, progression history,
                          per-entity chapter history, chapter trackers, chapter details, and scene cards.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {selectedChapter.wordCountCurrent} / {selectedChapter.wordCountTarget} words
                        </span>
                        <button
                          onClick={() => void generateChapterDraft()}
                          disabled={chapterDraftAiStatus === "running"}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        >
                          {chapterDraftAiStatus === "running"
                            ? t("drafting.draftingChapter")
                            : t("drafting.aiDraftFullChapter")}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        disabled={!editor || readingMode}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Bold
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        disabled={!editor || readingMode}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Italic
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                        disabled={!editor || readingMode}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        H2
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        disabled={!editor || readingMode}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Bullets
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                        disabled={!editor || readingMode}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Quote
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().undo().run()}
                        disabled={!editor}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Undo
                      </button>
                      <button
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => editor?.chain().focus().redo().run()}
                        disabled={!editor}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Redo
                      </button>
                    </div>

<p className="mt-3 text-xs text-slate-500">{t("drafting.manualEditing")}</p>
                    {chapterDraftAiMessage && (
                      <p className="mt-2 text-sm text-emerald-700">{chapterDraftAiMessage}</p>
                    )}
                    {chapterDraftAiError && (
                      <p className="mt-2 text-sm text-rose-700">{chapterDraftAiError}</p>
                    )}
                  </div>

                  <div className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-3">
                    <EditorContent
                      editor={editor}
                      className="prose-view max-w-none text-sm text-slate-800"
                    />
                  </div>

                  {chapterDraftPreview && (
                    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
<h3 className="text-sm font-semibold text-slate-900">{t("drafting.aiFullPreview")}</h3>
                        <span className="text-xs text-slate-500">
                          {t("drafting.generatedWords", { count: plainTextWordCount(chapterDraftPreview) })}
                        </span>
                      </div>
                      <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        {chapterDraftPreview}
                      </pre>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => void applyGeneratedChapterDraft()}
                          className="rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
                        >
                          {t("drafting.replaceWithPreview")}
                        </button>
                        <button
                          onClick={() => setChapterDraftPreview("")}
                          className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        >
                          {t("drafting.discardPreview")}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{t("drafting.sceneCards")}</h3>
                        <p className="text-xs text-slate-500">
                          Build scenes manually or let AI propose a sequence for the selected chapter.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => selectedChapter && void createManualScene(selectedChapter.id)}
                          disabled={!selectedChapter}
                          title="Add a blank scene card to the selected chapter."
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-40"
                        >
                          {t("drafting.addSceneManually")}
                        </button>
                        <button
                          onClick={() => void suggestSceneCards()}
                          disabled={!selectedChapter || sceneCardsAiStatus === "running"}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-40"
                        >
                          {sceneCardsAiStatus === "running"
                            ? t("drafting.suggestingCards")
                            : t("drafting.aiSuggestScenes")}
                        </button>
                      </div>
                    </div>
                    {sceneCardsAiMessage && (
                      <p className="text-xs text-emerald-700">{sceneCardsAiMessage}</p>
                    )}
                    {sceneCardsAiError && (
                      <p className="text-xs text-rose-700">{sceneCardsAiError}</p>
                    )}
                    {sceneDraftAiMessage && (
                      <p className="text-xs text-emerald-700">{sceneDraftAiMessage}</p>
                    )}
                    {sceneDraftAiError && (
                      <p className="text-xs text-rose-700">{sceneDraftAiError}</p>
                    )}
                    {sceneCardsPreview && (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
<p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{t("drafting.sceneProposalNotApplied")}</p>
                        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-800">
                          {sceneCardsPreview.map((suggestion, index) => (
                            <li key={`${suggestion.title}-${index}`}>
                              <p className="font-semibold">{suggestion.title || "Untitled scene"}</p>
                              {suggestion.description && (
                                <p className="text-xs text-slate-600">{suggestion.description}</p>
                              )}
                              {(suggestion.location || suggestion.characters.length > 0) && (
                                <p className="text-xs text-slate-500">
                                  {[suggestion.location, suggestion.characters.join(", ")]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </li>
                          ))}
                        </ol>
                        <p className="mt-2 text-xs text-slate-600">
                          Applying maps the proposal onto the existing cards in order; extra existing cards are kept.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => void applySceneCardSuggestions()}
                            className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            {t("drafting.applySceneCards")}
                          </button>
                          <button
                            onClick={discardSceneCardSuggestions}
                            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedScenes.length === 0 && <p className="text-xs text-slate-600">No scenes yet for this chapter.</p>}
                    {selectedScenes.map((scene) => (
                      <div key={scene.id} className="rounded-lg border border-slate-200 bg-white p-2">
                        <div className="mb-1 flex items-center gap-2">
                          <div className="w-full">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <label
                                htmlFor={`scene-title-${scene.id}`}
                                className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                                title={SCENE_FIELD_HELP.title}
                              >
                                Title
                              </label>
                              <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.title}>
                                Hover for help
                              </span>
                            </div>
                            <input
                              id={`scene-title-${scene.id}`}
                              value={scene.title}
                              onChange={(event) =>
                                void saveScene({
                                  ...scene,
                                  title: event.target.value,
                                })
                              }
                              placeholder={`Scene ${scene.order} title`}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <button
                            onClick={() => void deleteScene(scene.id)}
                            className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="mb-2">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label
                              htmlFor={`scene-description-${scene.id}`}
                              className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                              title={SCENE_FIELD_HELP.description}
                            >
                              Description
                            </label>
                            <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.description}>
                              Purpose and outcome
                            </span>
                          </div>
                          <textarea
                            id={`scene-description-${scene.id}`}
                            rows={2}
                            value={scene.description}
                            onChange={(event) =>
                              void saveScene({
                                ...scene,
                                description: event.target.value,
                              })
                            }
                            placeholder="Summarize the scene beat, conflict, and ending state"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="mb-1 grid gap-1 md:grid-cols-2">
                          <div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <label
                                htmlFor={`scene-location-${scene.id}`}
                                className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                                title={SCENE_FIELD_HELP.location}
                              >
                                Location
                              </label>
                              <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.location}>
                                Setting
                              </span>
                            </div>
                            <input
                              id={`scene-location-${scene.id}`}
                              value={scene.location}
                              onChange={(event) =>
                                void saveScene({
                                  ...scene,
                                  location: event.target.value,
                                })
                              }
                              placeholder="Scene location"
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <label
                                htmlFor={`scene-characters-${scene.id}`}
                                className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                                title={SCENE_FIELD_HELP.characters}
                              >
                                Characters
                              </label>
                              <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.characters}>
                                Comma separated
                              </span>
                            </div>
                            <input
                              id={`scene-characters-${scene.id}`}
                              value={scene.characters.join(", ")}
                              onChange={(event) =>
                                void saveScene({
                                  ...scene,
                                  characters: event.target.value
                                    .split(",")
                                    .map((item) => item.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="Characters, comma separated"
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`scene-pov-${scene.id}`}
                              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-700"
                            >
                              {t("drafting.scenePov")}
                            </label>
                            <select
                              id={`scene-pov-${scene.id}`}
                              value={scene.povCharacterId ?? ""}
                              onChange={(event) =>
                                void saveScene({
                                  ...scene,
                                  povCharacterId: event.target.value || undefined,
                                })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            >
                              <option value="">{t("drafting.scenePovNone")}</option>
                              {activeProject.characters.map((character) => (
                                <option key={character.id} value={character.id}>
                                  {character.name || t("pov.unnamed")}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label
                              htmlFor={`scene-notes-${scene.id}`}
                              className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                              title={SCENE_FIELD_HELP.notes}
                            >
                              Notes
                            </label>
                            <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.notes}>
                              Continuity anchors
                            </span>
                          </div>
                          <textarea
                            id={`scene-notes-${scene.id}`}
                            rows={2}
                            value={scene.notes}
                            onChange={(event) =>
                              void saveScene({
                                ...scene,
                                notes: event.target.value,
                              })
                            }
                            placeholder="Scene notes and continuity anchors"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="mb-2">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label
                              htmlFor={`scene-draft-${scene.id}`}
                              className="text-xs font-semibold uppercase tracking-wide text-slate-700"
                              title={SCENE_FIELD_HELP.draftText}
                            >
                              Draft seed
                            </label>
                            <span className="text-[11px] text-slate-500" title={SCENE_FIELD_HELP.draftText}>
                              Beat outline
                            </span>
                          </div>
                          <textarea
                            id={`scene-draft-${scene.id}`}
                            rows={2}
                            value={scene.draftText}
                            onChange={(event) =>
                              void saveScene({
                                ...scene,
                                draftText: event.target.value,
                              })
                            }
                            placeholder="Scene draft notes"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => void generateSceneDraft(scene)}
                            disabled={sceneDraftAiSceneId != null}
                            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-40"
                          >
                            {sceneDraftAiSceneId === scene.id
                              ? t("drafting.generatingDraft")
                              : t("drafting.aiGenerateSceneDraft")}
                          </button>
                          <button
                            onClick={() => void appendSceneToDraft(scene)}
                            className="rounded border border-teal-300 px-2 py-1 text-xs text-teal-700"
                          >
                            {t("drafting.convertToDraft")}
                          </button>
                        </div>
                        {sceneDraftPreview?.sceneId === scene.id && (
                          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2">
<p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{t("drafting.draftProposalNotApplied")}</p>
                            <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-amber-200 bg-white p-2 text-xs text-slate-700">
                              {sceneDraftPreview.text}
                            </pre>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                onClick={() => void applySceneDraftPreview()}
                                className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                {t("drafting.applyToDraftSeed")}
                              </button>
                              <button
                                onClick={discardSceneDraftPreview}
                                className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                              >
                                Discard
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
                    <h3 className="text-sm font-semibold text-slate-900">{t("drafting.specializedAssistants")}</h3>
                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {ASSISTANTS.map((assistant) => (
                        <button
                          key={assistant.id}
                          onClick={() => {
                            setSelectedAssistantId(assistant.id);
                            setAiAction(assistant.action);
                          }}
                          className={`rounded-xl border p-3 text-left ${
                            selectedAssistant.id === assistant.id
                              ? "border-teal-500 bg-teal-50"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <p className="text-sm font-semibold text-slate-900">{assistant.label}</p>
                          <p className="mt-1 text-xs text-slate-600">{assistant.description}</p>
                          <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">
                            {assistant.action} · {assistant.focus}
                          </p>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[200px_minmax(0,1fr)_auto]">
                      <select
                        value={aiAction}
                        onChange={(event) => setAiAction(event.target.value as AiActionType)}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        {[
                          "brainstorm",
                          "expand",
                          "rewrite",
                          "summarize",
                          "continue",
                          "dialogue_polish",
                          "plan_audit",
                          "consistency_check",
                          "revision_pass",
                          "grammar_suggestions",
                          "style_transform",
                          "marketing_copy",
                          "publish_artifact",
                        ].map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </select>
                      <input
                        value={aiPromptContext}
                        onChange={(event) => setAiPromptContext(event.target.value)}
                        placeholder={t("drafting.extraInstructions")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void runAiPreview()}
                        disabled={aiStatus === "running"}
                        className="rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        {aiStatus === "running" ? t("drafting.running") : t("drafting.runAi")}
                      </button>
                    </div>

                    {aiError && <p className="mt-2 text-xs text-rose-700">{aiError}</p>}

                    {aiDiff.length > 0 && (
                      <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{t("drafting.previewDiff")}</h4>
                        <div className="max-h-56 space-y-1 overflow-y-auto rounded border border-slate-200 bg-white p-2 text-xs">
                          {aiDiff.map((chunk, index) => (
                            <p
                              key={`${chunk.type}-${index}`}
                              className={`rounded px-1 ${
                                chunk.type === "same"
                                  ? "diff-line-same"
                                  : chunk.type === "added"
                                  ? "diff-line-added"
                                  : "diff-line-removed"
                              }`}
                            >
                              {chunk.type === "added" ? "+ " : chunk.type === "removed" ? "- " : "  "}
                              {chunk.text}
                            </p>
                          ))}
                        </div>

                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => void applyAiDraft()}
                            className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            {t("drafting.applyDraft")}
                          </button>
                          <button
                            onClick={() => {
                              setAiDraft("");
                              setAiDiff([]);
                            }}
                            className="rounded border border-slate-300 px-3 py-1.5 text-xs"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    )}

                    {aiDraft && aiDiff.length === 0 && (
                      <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3">
<h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{t("drafting.assistantOutput")}</h4>
                        <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
                          {aiDraft}
                        </pre>
                        <div className="mt-2 flex gap-2">
                          {selectedChapter && (
                            <button
                              onClick={() => void applyAiDraft()}
                              className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              {t("drafting.insertIntoChapter")}
                            </button>
                          )}
                          <button
                            onClick={() => setAiDraft("")}
                            className="rounded border border-slate-300 px-3 py-1.5 text-xs"
                          >
                            {t("drafting.clear")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <h3 className="text-sm font-semibold text-slate-900">{t("drafting.annotations")}</h3>
                    <button
                      onClick={() =>
                        void saveAnnotation({
                          id: createId("anno"),
                          projectId: projectIdValue,
                          chapterId: selectedChapter.id,
                          quote: "",
                          note: "",
                          tags: [],
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      {t("drafting.addAnnotation")}
                    </button>

                    <div className="mt-2 space-y-2">
                      {activeProject.annotations
                        .filter((annotation) => annotation.chapterId === selectedChapter.id)
                        .map((annotation) => (
                          <div key={annotation.id} className="rounded border border-slate-200 p-2">
                            <div className="mb-1 flex items-center gap-2">
                              <input
                                value={annotation.quote}
                                onChange={(event) =>
                                  void saveAnnotation({
                                    ...annotation,
                                    quote: event.target.value,
                                  })
                                }
                                placeholder="Quoted text"
                                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                              />
                              <button
                                onClick={() => void deleteAnnotation(annotation.id)}
                                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                              >
                                Delete
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={annotation.note}
                              onChange={(event) =>
                                void saveAnnotation({
                                  ...annotation,
                                  note: event.target.value,
                                })
                              }
                              placeholder="Author note"
                              className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                            <input
                              value={annotation.tags.join(", ")}
                              onChange={(event) =>
                                void saveAnnotation({
                                  ...annotation,
                                  tags: event.target.value
                                    .split(",")
                                    .map((tag) => tag.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="tags"
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                  Select a chapter to start drafting.
                  <button
                    onClick={() => void addChapter()}
                    className="mt-2 block rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    Add first chapter
                  </button>
                </div>
              )}
            </article>
          </section>
  );
}
