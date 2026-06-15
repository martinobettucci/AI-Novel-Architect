"use client";

import type { RevisionIssue } from "@/app/domain/models";
import { createId } from "@/app/domain/defaults";
import { checklistCompletion } from "@/app/lib/repository";
import type { WorkspaceController } from "../useWorkspaceController";

export function RevisionTab({ ctx }: { ctx: WorkspaceController }) {
  const {
    t,
    activeProject,
    createRevisionIssue,
    selectedChapter,
    updateRevisionIssueStatus,
    deleteRevisionIssue,
    resolved,
    chapterScore,
    chapterGrammarSuggestions,
    createIssueFromGrammar,
    saveChecklistItem,
    projectIdValue,
    toggleChecklistItem,
    deleteChecklistItem,
  } = ctx;
  if (!activeProject) return null;

  return (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">{t("revision.issues")}</h2>
              <button
                onClick={() =>
                  void createRevisionIssue({
                    chapterId: selectedChapter?.id,
                    title: "New revision issue",
                    description: "Describe the problem and intended fix.",
                    severity: "medium",
                  })
                }
                className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-sm"
              >
                {t("revision.addIssue")}
              </button>
              <div className="mt-3 space-y-2">
                {activeProject.revisionIssues.map((issue) => (
                  <div key={issue.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{issue.title}</p>
                    <p className="mb-2 text-xs text-slate-600">{issue.description}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 uppercase">{issue.severity}</span>
                      <select
                        value={issue.status}
                        onChange={(event) =>
                          void updateRevisionIssueStatus(
                            issue.id,
                            event.target.value as RevisionIssue["status"]
                          )
                        }
                        className="rounded border border-slate-300 px-2 py-1"
                      >
                        <option value="open">{t("revision.statusOpen")}</option>
                        <option value="in-progress">{t("revision.statusInProgress")}</option>
                        <option value="resolved">{t("revision.statusResolved")}</option>
                      </select>
                      <button
                        onClick={() => void deleteRevisionIssue(issue.id)}
                        className="rounded border border-rose-300 px-2 py-1 text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">{t("revision.quality")}</h2>
              <p className="mt-2 text-sm text-slate-600">
                {t("revision.rubric", {
                  structure: resolved.settings.qa.rubricWeights.structure,
                  character: resolved.settings.qa.rubricWeights.character,
                  pacing: resolved.settings.qa.rubricWeights.pacing,
                  style: resolved.settings.qa.rubricWeights.style,
                })}
              </p>

              {selectedChapter && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm text-slate-700">
                    {t("revision.currentScore")} <strong>{chapterScore}/10</strong>
                  </p>
                  <ul className="mt-2 space-y-1">
                    {chapterGrammarSuggestions.map((suggestion) => (
                      <li key={suggestion} className="flex items-start justify-between gap-2 text-xs text-slate-700">
                        <span>{suggestion}</span>
                        <button
                          onClick={() => void createIssueFromGrammar(suggestion)}
                          className="rounded border border-slate-300 px-2 py-0.5"
                        >
                          {t("revision.track")}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 rounded-lg border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-900">{t("revision.checklists")}</h3>
                <p className="text-xs text-slate-600">
                  {t("revision.checklistCompletion", {
                    revision: checklistCompletion(activeProject.checklist, "revision"),
                    publish: checklistCompletion(activeProject.checklist, "publish"),
                  })}
                </p>
                <button
                  onClick={() =>
                    void saveChecklistItem({
                      id: createId("chk"),
                      projectId: projectIdValue,
                      scope: "revision",
                      title: "Custom checklist item",
                      done: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs"
                >
                  {t("revision.addCustomItem")}
                </button>
                <ul className="mt-2 space-y-1">
                  {activeProject.checklist.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(event) => void toggleChecklistItem(item.id, event.target.checked)}
                      />
                      <span>{item.title}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-600">{item.scope}</span>
                      <button
                        onClick={() => void deleteChecklistItem(item.id)}
                        className="rounded border border-rose-300 px-1.5 py-0.5 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </section>
  );
}
