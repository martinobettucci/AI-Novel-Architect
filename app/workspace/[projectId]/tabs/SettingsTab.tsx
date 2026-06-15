"use client";

import { asProjectLanguage } from "../helpers";
import { ProvenancePanel } from "../ProvenancePanel";
import type { WorkspaceController } from "../useWorkspaceController";

export function SettingsTab({ ctx }: { ctx: WorkspaceController }) {
  const {
    t,
    activeProject,
    resolved,
    saveScope,
    projectIdValue,
    resetScope,
    restoreSnapshot,
  } = ctx;
  if (!activeProject) return null;

  return (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">{t("settings.modelConfig")}</h2>
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-sm text-slate-700">
                  {t("settings.baseUrl")}
                  <input
                    value={resolved.settings.llm.baseUrl}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          llm: {
                            ...resolved.settings.llm,
                            baseUrl: event.target.value,
                          },
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  {t("settings.model")}
                  <input
                    value={resolved.settings.llm.model}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          llm: {
                            ...resolved.settings.llm,
                            model: event.target.value,
                          },
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  {t("settings.apiKey")}
                  <input
                    type="password"
                    autoComplete="off"
                    value={resolved.settings.llm.apiKey ?? ""}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          llm: {
                            ...resolved.settings.llm,
                            apiKey: event.target.value,
                          },
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  />
                </label>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h2 className="text-xl font-semibold text-slate-900">{t("settings.promptQa")}</h2>
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-sm text-slate-700">
                  {t("settings.writingLanguage")}
                  <select
                    value={resolved.settings.locale}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          locale: asProjectLanguage(event.target.value),
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  >
                    <option value="fr">French</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  {t("settings.toneGuide")}
                  <textarea
                    rows={2}
                    value={resolved.settings.prompts.toneGuide}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          prompts: {
                            ...resolved.settings.prompts,
                            toneGuide: event.target.value,
                          },
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  {t("settings.structureWeight")}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={resolved.settings.qa.rubricWeights.structure}
                    onChange={(event) =>
                      void saveScope(
                        "project",
                        {
                          qa: {
                            ...resolved.settings.qa,
                            rubricWeights: {
                              ...resolved.settings.qa.rubricWeights,
                              structure: Number(event.target.value) || 0,
                            },
                          },
                        },
                        projectIdValue
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1"
                  />
                </label>
              </div>

              <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">{t("settings.precedence")}</p>
                <p>{resolved.sourceOrder.join(" -> ")}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => void resetScope("project", projectIdValue)}
                    className="rounded border border-slate-300 px-2 py-1"
                  >
                    {t("settings.resetProject")}
                  </button>
                  <button
                    onClick={() => void resetScope("feature", projectIdValue, "drafting")}
                    className="rounded border border-slate-300 px-2 py-1"
                  >
                    {t("settings.resetDrafting")}
                  </button>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">{t("settings.snapshots")}</h2>
              <ul className="mt-3 space-y-2">
                {activeProject.snapshots.map((snapshot) => (
                  <li key={snapshot.id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
                    <span>
                      {snapshot.label} · {new Date(snapshot.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={() => void restoreSnapshot(snapshot.id)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      {t("settings.restore")}
                    </button>
                  </li>
                ))}
              </ul>
            </article>

            <ProvenancePanel ctx={ctx} />
          </section>
  );
}
