"use client";

import type { EntityProgression, NarrativeRelationship } from "@/app/domain/models";
import { createId } from "@/app/domain/defaults";
import { chapterLabel, entityTypeLabel, historyEntityTypeLabel, sceneLabel } from "../helpers";
import { KnowledgePanel } from "../KnowledgePanel";
import type { WorkspaceController } from "../useWorkspaceController";

export function BibleTab({ ctx }: { ctx: WorkspaceController }) {
  const {
    t,
    activeProject,
    suggestStoryBible,
    storyBibleAiStatus,
    suggestStoryWorldScaffold,
    storyWorldAiStatus,
    storyBibleAiMessage,
    storyBibleAiError,
    storyWorldAiMessage,
    storyWorldAiError,
    storyBiblePreview,
    applyStoryBibleSuggestion,
    discardStoryBibleSuggestion,
    storyWorldPreview,
    applyStoryWorldSuggestion,
    discardStoryWorldSuggestion,
    saveStoryBible,
    selectedHistoryEntity,
    setSelectedHistoryEntityKey,
    historyEntityOptions,
    selectedHistoryTimeline,
    saveCharacter,
    projectIdValue,
    deleteCharacter,
    addBlankLocation,
    saveLocation,
    deleteLocation,
    addBlankLoreEntry,
    saveLoreEntry,
    deleteLoreEntry,
    saveTimelineEventAction,
    selectedChapter,
    deleteTimelineEventAction,
    addBlankRelationship,
    saveRelationship,
    trackedEntityOptions,
    deleteRelationship,
    addBlankProgression,
    saveEntityProgressionAction,
    deleteEntityProgression,
    progressionByEntity,
  } = ctx;
  if (!activeProject) return null;

  return (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900">{t("bible.title")}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void suggestStoryBible()}
                    disabled={storyBibleAiStatus === "running"}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {storyBibleAiStatus === "running" ? "…" : t("bible.aiSuggestCore")}
                  </button>
                  <button
                    onClick={() => void suggestStoryWorldScaffold()}
                    disabled={storyWorldAiStatus === "running"}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-40"
                  >
                    {storyWorldAiStatus === "running" ? "…" : t("bible.aiSuggestWorld")}
                  </button>
                </div>
              </div>
              {storyBibleAiMessage && (
                <p className="mt-3 text-sm text-emerald-700">{storyBibleAiMessage}</p>
              )}
              {storyBibleAiError && (
                <p className="mt-3 text-sm text-rose-700">{storyBibleAiError}</p>
              )}
              {storyWorldAiMessage && (
                <p className="mt-3 text-sm text-emerald-700">{storyWorldAiMessage}</p>
              )}
              {storyWorldAiError && (
                <p className="mt-3 text-sm text-rose-700">{storyWorldAiError}</p>
              )}
              {storyBiblePreview && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    {t("ai.proposalNotApplied")}
                  </p>
                  <dl className="mt-2 space-y-2 text-sm text-slate-800">
                    {storyBiblePreview.premise && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Premise</dt>
                        <dd className="whitespace-pre-wrap">{storyBiblePreview.premise}</dd>
                      </div>
                    )}
                    {storyBiblePreview.themes && storyBiblePreview.themes.length > 0 && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Themes</dt>
                        <dd>{storyBiblePreview.themes.join(", ")}</dd>
                      </div>
                    )}
                    {storyBiblePreview.stakes && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stakes</dt>
                        <dd className="whitespace-pre-wrap">{storyBiblePreview.stakes}</dd>
                      </div>
                    )}
                    {storyBiblePreview.worldRules && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">World rules</dt>
                        <dd className="whitespace-pre-wrap">{storyBiblePreview.worldRules}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void applyStoryBibleSuggestion()}
                      className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {t("ai.applyProposal")}
                    </button>
                    <button
                      onClick={discardStoryBibleSuggestion}
                      className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                    >
                      {t("ai.discard")}
                    </button>
                  </div>
                </div>
              )}
              {storyWorldPreview && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    AI world scaffold proposal — not applied yet
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-800">
                    {storyWorldPreview.characters.length > 0 && (
                      <li>
                        <span className="font-semibold">Characters ({storyWorldPreview.characters.length}):</span>{" "}
                        {storyWorldPreview.characters.map((item) => item.name).join(", ")}
                      </li>
                    )}
                    {storyWorldPreview.locations.length > 0 && (
                      <li>
                        <span className="font-semibold">Locations ({storyWorldPreview.locations.length}):</span>{" "}
                        {storyWorldPreview.locations.map((item) => item.name).join(", ")}
                      </li>
                    )}
                    {storyWorldPreview.lore.length > 0 && (
                      <li>
                        <span className="font-semibold">Lore ({storyWorldPreview.lore.length}):</span>{" "}
                        {storyWorldPreview.lore.map((item) => item.title).join(", ")}
                      </li>
                    )}
                    {storyWorldPreview.timeline.length > 0 && (
                      <li>
                        <span className="font-semibold">Timeline ({storyWorldPreview.timeline.length}):</span>{" "}
                        {storyWorldPreview.timeline.map((item) => item.label).join(", ")}
                      </li>
                    )}
                    {storyWorldPreview.relationships.length > 0 && (
                      <li>
                        <span className="font-semibold">Relationships ({storyWorldPreview.relationships.length}):</span>{" "}
                        {storyWorldPreview.relationships
                          .map((item) => `${item.source} → ${item.relationType} → ${item.target}`)
                          .join(" · ")}
                      </li>
                    )}
                  </ul>
                  <p className="mt-2 text-xs text-slate-600">
                    Existing entities with the same name are updated, new ones are created. Nothing is deleted.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void applyStoryWorldSuggestion()}
                      className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {t("bible.applyScaffold")}
                    </button>
                    <button
                      onClick={discardStoryWorldSuggestion}
                      className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-3 text-sm text-slate-600">
                Use the core suggestion to fill premise, themes, stakes, and world rules. Use the world suggestion to scaffold characters, locations, lore, timeline, and relationships from the same canon.
              </p>
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1 text-sm text-slate-700">
                  {t("bible.premise")}
                  <textarea
                    rows={3}
                    value={activeProject.bible.premise}
                    onChange={(event) =>
                      void saveStoryBible({
                        ...activeProject.bible,
                        premise: event.target.value,
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  {t("bible.themes")}
                  <input
                    value={activeProject.bible.themes.join(", ")}
                    onChange={(event) =>
                      void saveStoryBible({
                        ...activeProject.bible,
                        themes: event.target.value
                          .split(",")
                          .map((entry) => entry.trim())
                          .filter(Boolean),
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  {t("bible.stakes")}
                  <textarea
                    rows={2}
                    value={activeProject.bible.stakes}
                    onChange={(event) =>
                      void saveStoryBible({
                        ...activeProject.bible,
                        stakes: event.target.value,
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  {t("bible.worldRules")}
                  <textarea
                    rows={4}
                    value={activeProject.bible.worldRules}
                    onChange={(event) =>
                      void saveStoryBible({
                        ...activeProject.bible,
                        worldRules: event.target.value,
                      })
                    }
                    className="rounded-md px-3 py-2"
                  />
                </label>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{t("bible.entityHistory")}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Story-wide entities stay global here. Their chapter-by-chapter history is tracked in a parallel timeline store and visualized below.
                  </p>
                </div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Compute from Drafting
                </p>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
                <label className="grid gap-1 text-sm text-slate-700">
                  {t("bible.storyWideEntity")}
                  <select
                    value={selectedHistoryEntity?.key ?? ""}
                    onChange={(event) => setSelectedHistoryEntityKey(event.target.value)}
                    className="rounded border border-slate-300 px-3 py-2"
                  >
                    {historyEntityOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {selectedHistoryEntity ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Story-wide record
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {selectedHistoryEntity.label}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] uppercase tracking-wide text-slate-500">
                          {historyEntityTypeLabel(selectedHistoryEntity.type)}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {selectedHistoryTimeline.map(({ chapter, entries }) => (
                          <div
                            key={chapter.id}
                            className="rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {chapterLabel(chapter)}
                              </p>
                              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                                {entries.length > 0 ? `${entries.length} note${entries.length > 1 ? "s" : ""}` : "no change"}
                              </span>
                            </div>
                            {entries.length > 0 ? (
                              <div className="mt-2 space-y-2">
                                {entries.map((entry) => (
                                  <p key={entry.id} className="text-sm text-slate-700">
                                    {entry.note || "No history note recorded."}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-slate-500">
                                No chapter-linked history recorded for this entity in this chapter.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Add story-wide entities or relationships to start building a chapter timeline.
                    </p>
                  )}
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">{t("bible.characters")}</h2>
              <button
                onClick={() =>
                  void saveCharacter({
                    id: createId("char"),
                    projectId: projectIdValue,
                    name: "",
                    role: "",
                    motivation: "",
                    arc: "",
                    voice: "",
                    relationships: "",
                    notes: "",
                    updatedAt: new Date().toISOString(),
                  })
                }
                className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                {t("bible.addCharacter")}
              </button>
              <div className="mt-3 space-y-3">
                {activeProject.characters.map((character) => (
                  <div key={character.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <input
                        value={character.name}
                        onChange={(event) =>
                          void saveCharacter({
                            ...character,
                            name: event.target.value,
                          })
                        }
                        placeholder={t("bible.charName")}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void deleteCharacter(character.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={character.arc}
                      onChange={(event) =>
                        void saveCharacter({
                          ...character,
                          arc: event.target.value,
                        })
                      }
                      placeholder={t("bible.arc")}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">{t("bible.locations")}</h2>
                <button
                  onClick={addBlankLocation}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  {t("bible.addLocation")}
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {activeProject.locations.map((location) => (
                  <div key={location.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        value={location.name}
                        onChange={(event) =>
                          void saveLocation({
                            ...location,
                            name: event.target.value,
                          })
                        }
                        placeholder={t("bible.locName")}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void deleteLocation(location.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={location.role}
                        onChange={(event) =>
                          void saveLocation({
                            ...location,
                            role: event.target.value,
                          })
                        }
                        placeholder={t("bible.role")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={location.narrativeStatus}
                        onChange={(event) =>
                          void saveLocation({
                            ...location,
                            narrativeStatus: event.target.value,
                          })
                        }
                        placeholder={t("bible.narrationStatus")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={location.description}
                      onChange={(event) =>
                        void saveLocation({
                          ...location,
                          description: event.target.value,
                        })
                      }
                      placeholder={t("bible.description")}
                      className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">{t("bible.lore")}</h2>
                <button
                  onClick={addBlankLoreEntry}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  {t("bible.addLore")}
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {activeProject.loreEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        value={entry.title}
                        onChange={(event) =>
                          void saveLoreEntry({
                            ...entry,
                            title: event.target.value,
                          })
                        }
                        placeholder={t("bible.loreTitle")}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void deleteLoreEntry(entry.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={entry.category}
                        onChange={(event) =>
                          void saveLoreEntry({
                            ...entry,
                            category: event.target.value,
                          })
                        }
                        placeholder={t("bible.category")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={entry.status}
                        onChange={(event) =>
                          void saveLoreEntry({
                            ...entry,
                            status: event.target.value,
                          })
                        }
                        placeholder={t("bible.status")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={entry.description}
                      onChange={(event) =>
                        void saveLoreEntry({
                          ...entry,
                          description: event.target.value,
                        })
                      }
                      placeholder={t("bible.description")}
                      className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">{t("bible.timeline")}</h2>
                <button
                  onClick={() =>
                    void saveTimelineEventAction({
                      id: createId("timeline"),
                      projectId: projectIdValue,
                      order: activeProject.timeline.length + 1,
                      chapterId: selectedChapter?.id,
                      label: "",
                      details: "",
                      impact: "",
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  {t("bible.addTimeline")}
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {activeProject.timeline
                  .sort((a, b) => a.order - b.order)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="grid gap-2 rounded-lg border border-slate-200 p-3 lg:grid-cols-[140px_minmax(0,1fr)_120px_auto]"
                    >
                      <input
                        value={event.label}
                        onChange={(e) =>
                          void saveTimelineEventAction({
                            ...event,
                            label: e.target.value,
                          })
                        }
                        placeholder={t("bible.eventLabel")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={event.details}
                        onChange={(e) =>
                          void saveTimelineEventAction({
                            ...event,
                            details: e.target.value,
                          })
                        }
                        placeholder={t("bible.details")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={event.impact}
                        onChange={(e) =>
                          void saveTimelineEventAction({
                            ...event,
                            impact: e.target.value,
                          })
                        }
                        placeholder={t("bible.impact")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void deleteTimelineEventAction(event.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">{t("bible.relationships")}</h2>
                <button
                  onClick={addBlankRelationship}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  {t("bible.addRelationship")}
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {activeProject.relationships.map((relationship) => (
                  <div key={relationship.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="grid gap-2 lg:grid-cols-[150px_1fr_150px_1fr_140px_100px_auto]">
                      <select
                        value={relationship.sourceType}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            sourceType: event.target.value as NarrativeRelationship["sourceType"],
                            sourceId: "",
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="character">{t("bible.typeCharacter")}</option>
                        <option value="location">{t("bible.typeLocation")}</option>
                        <option value="lore">{t("bible.typeLore")}</option>
                        <option value="timeline_event">{t("bible.typeTimeline")}</option>
                      </select>
                      <select
                        value={relationship.sourceId}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            sourceId: event.target.value,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">{t("bible.selectSource")}</option>
                        {trackedEntityOptions
                          .filter((option) => option.type === relationship.sourceType)
                          .map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                      </select>
                      <select
                        value={relationship.targetType}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            targetType: event.target.value as NarrativeRelationship["targetType"],
                            targetId: "",
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="character">{t("bible.typeCharacter")}</option>
                        <option value="location">{t("bible.typeLocation")}</option>
                        <option value="lore">{t("bible.typeLore")}</option>
                        <option value="timeline_event">{t("bible.typeTimeline")}</option>
                      </select>
                      <select
                        value={relationship.targetId}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            targetId: event.target.value,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">{t("bible.selectTarget")}</option>
                        {trackedEntityOptions
                          .filter((option) => option.type === relationship.targetType)
                          .map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                      </select>
                      <input
                        value={relationship.relationType}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            relationType: event.target.value,
                          })
                        }
                        placeholder={t("bible.relationType")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={relationship.intensity}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            intensity: Number(event.target.value) || 1,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => void deleteRelationship(relationship.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <input
                        value={relationship.status}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            status: event.target.value,
                          })
                        }
                        placeholder={t("bible.status")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={relationship.notes}
                        onChange={(event) =>
                          void saveRelationship({
                            ...relationship,
                            notes: event.target.value,
                          })
                        }
                        placeholder={t("bible.evolutionNotes")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">{t("bible.progressionTracker")}</h2>
                <button
                  onClick={addBlankProgression}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  {t("bible.addProgression")}
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Track start state, evidence, delta, end state, knowledge, belief, inventory, and narration status chapter by chapter.
              </p>
              <div className="mt-3 space-y-3">
                {activeProject.entityProgression.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="grid gap-2 lg:grid-cols-[140px_1fr_140px_1fr_auto]">
                      <select
                        value={entry.entityType}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            entityType: event.target.value as EntityProgression["entityType"],
                            entityId: "",
                            label: "",
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="character">{t("bible.typeCharacter")}</option>
                        <option value="location">{t("bible.typeLocation")}</option>
                        <option value="lore">{t("bible.typeLore")}</option>
                        <option value="timeline_event">{t("bible.typeTimeline")}</option>
                      </select>
                      <select
                        value={entry.entityId}
                        onChange={(event) => {
                          const option = trackedEntityOptions.find((item) => item.id === event.target.value);
                          void saveEntityProgressionAction({
                            ...entry,
                            entityId: event.target.value,
                            label: option?.label ?? entry.label,
                          });
                        }}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">{t("bible.selectEntity")}</option>
                        {trackedEntityOptions
                          .filter((option) => option.type === entry.entityType)
                          .map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                      </select>
                      <select
                        value={entry.chapterId ?? ""}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            chapterId: event.target.value || undefined,
                            sceneId: undefined,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">{t("bible.storyLevel")}</option>
                        {activeProject.chapters.map((chapter) => (
                          <option key={chapter.id} value={chapter.id}>
                            {chapterLabel(chapter)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={entry.sceneId ?? ""}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            sceneId: event.target.value || undefined,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">{t("bible.noScene")}</option>
                        {activeProject.scenes
                          .filter((scene) => !entry.chapterId || scene.chapterId === entry.chapterId)
                          .map((scene) => (
                            <option key={scene.id} value={scene.id}>
                              {sceneLabel(scene)}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => void deleteEntityProgression(entry.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 lg:grid-cols-2">
                      <textarea
                        rows={2}
                        value={entry.startState}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            startState: event.target.value,
                          })
                        }
                        placeholder={t("bible.startState")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <textarea
                        rows={2}
                        value={entry.endState}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            endState: event.target.value,
                          })
                        }
                        placeholder={t("bible.endState")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <textarea
                        rows={2}
                        value={entry.evidence}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            evidence: event.target.value,
                          })
                        }
                        placeholder={t("bible.evidence")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <textarea
                        rows={2}
                        value={entry.proposedDelta}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            proposedDelta: event.target.value,
                          })
                        }
                        placeholder={t("bible.proposedDelta")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <textarea
                        rows={2}
                        value={entry.validatedDelta}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            validatedDelta: event.target.value,
                          })
                        }
                        placeholder={t("bible.validatedDelta")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <textarea
                        rows={2}
                        value={entry.aiSuggestion}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            aiSuggestion: event.target.value,
                          })
                        }
                        placeholder={t("bible.aiFix")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={entry.knowledge}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            knowledge: event.target.value,
                          })
                        }
                        placeholder={t("bible.knowledge")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={entry.belief}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            belief: event.target.value,
                          })
                        }
                        placeholder={t("bible.belief")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={entry.inventory}
                        onChange={(event) =>
                          void saveEntityProgressionAction({
                            ...entry,
                            inventory: event.target.value,
                          })
                        }
                        placeholder={t("bible.inventory")}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                        <input
                          value={entry.narrationStatus}
                          onChange={(event) =>
                            void saveEntityProgressionAction({
                              ...entry,
                              narrationStatus: event.target.value,
                            })
                          }
                          placeholder={t("bible.narrationStatus")}
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <select
                          value={entry.confidence}
                          onChange={(event) =>
                            void saveEntityProgressionAction({
                              ...entry,
                              confidence: event.target.value as EntityProgression["confidence"],
                            })
                          }
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                        >
                          <option value="explicit">Explicit</option>
                          <option value="strong_inference">Strong inference</option>
                          <option value="weak_inference">Weak inference</option>
                          <option value="conflict">Conflict</option>
                          <option value="insufficient_evidence">Insufficient evidence</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">{t("bible.progressionOverview")}</h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {progressionByEntity.map((group) => (
                  <div key={group.key} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {group.label}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        ({entityTypeLabel(group.type)})
                      </span>
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {group.entries.slice(-4).map((entry) => (
                        <li key={entry.id}>
                          {(entry.chapterId &&
                            activeProject.chapters.find((chapter) => chapter.id === entry.chapterId)?.number) ||
                            "Story"}
                          : {entry.endState || entry.validatedDelta || entry.proposedDelta || "No end state yet"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {progressionByEntity.length === 0 && (
                  <p className="text-sm text-slate-600">
                    No progression history yet. Add entries to track canon changes chapter by chapter.
                  </p>
                )}
              </div>
            </article>

            <KnowledgePanel ctx={ctx} />
          </section>
  );
}
