"use client";

import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import TopNav from "@/app/components/TopNav";
import FieldLabel from "@/app/components/ui/FieldLabel";
import { DEFAULT_LLM_BASE_URL, DEFAULT_LLM_MODEL } from "@/app/domain/defaults";
import type { LlmSettings } from "@/app/domain/models";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useProjectStore } from "@/app/stores/projectStore";
import { useSettingsStore } from "@/app/stores/settingsStore";

interface HealthResponse {
  status: "connected" | "error";
  baseUrl?: string;
  endpoint?: string;
  model?: string;
  latencyMs?: number;
  checkedAt?: string;
  error?: string;
  warning?: string;
}

interface ModelsResponse {
  models: string[];
  selectedModel?: string;
  error?: string;
}

export default function SettingsPage() {
  const { t } = useI18n();

  const projects = useProjectStore((state) => state.projects);
  const refreshProjects = useProjectStore((state) => state.refreshProjects);

  const resolved = useSettingsStore((state) => state.resolved);
  const uiLocale = useSettingsStore((state) => state.uiLocale);
  const loadSettings = useSettingsStore((state) => state.load);
  const saveScope = useSettingsStore((state) => state.saveScope);
  const resetScope = useSettingsStore((state) => state.resetScope);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [llmDraft, setLlmDraft] = useState<LlmSettings | null>(null);
  const activeLlm = llmDraft ?? resolved.settings.llm;

  useEffect(() => {
    void refreshProjects();
    void loadSettings();
  }, [loadSettings, refreshProjects]);

  const mostRecentProject = useMemo(
    () =>
      projects
        .slice()
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        )[0] ?? null,
    [projects]
  );

  async function checkHealth() {
    const res = await fetch("/api/ai/health", {
      cache: "no-store",
      headers: {
        "x-openai-base-url": activeLlm.baseUrl,
        "x-openai-model": activeLlm.model,
        ...(activeLlm.apiKey
          ? { "x-openai-api-key": activeLlm.apiKey }
          : {}),
      },
    });

    const payload = (await res.json()) as HealthResponse;
    setHealth(payload);
  }

  async function loadModels() {
    setModelsError(null);
    const res = await fetch("/api/ai/models", {
      cache: "no-store",
      headers: {
        "x-openai-base-url": activeLlm.baseUrl,
        "x-openai-model": activeLlm.model,
        ...(activeLlm.apiKey
          ? { "x-openai-api-key": activeLlm.apiKey }
          : {}),
      },
    });

    const payload = (await res.json()) as ModelsResponse;
    if (!res.ok) {
      setModelsError(payload.error ?? "Could not load models");
      setModels([]);
      return;
    }

    const availableModels = payload.models
      .map((model) => model.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    setModels(availableModels);
  }

  async function saveAiProfile() {
    await saveScope("global", { llm: activeLlm });
    setLlmDraft(null);
  }

  async function applyLocalOllama() {
    const nextLlm: LlmSettings = {
      ...activeLlm,
      baseUrl: DEFAULT_LLM_BASE_URL,
      model: DEFAULT_LLM_MODEL,
      apiKey: undefined,
    };
    setLlmDraft(nextLlm);
    await saveScope("global", { llm: nextLlm });
    setLlmDraft(null);
  }

  return (
    <div className="app-page settings-page">
      <TopNav />

      <main className="shell-frame">
        <section className="page-hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="hero-eyebrow">System governance</p>
              <h1 className="hero-title">{t("settings.title")}</h1>
              <p className="hero-subtitle">
                Control providers, models, prompts, QA weighting, and language defaults from one
                tighter command surface. The writing engine stays untouched; only the operating
                layer is restructured.
              </p>
            </div>

            <div className="hero-stats metric-grid">
              <article className="metric-card">
                <p className="metric-label">Active projects</p>
                <p className="metric-value">{projects.length}</p>
                <p className="metric-detail">
                  {mostRecentProject
                    ? `Latest update: ${mostRecentProject.title}`
                    : "No active projects loaded yet."}
                </p>
              </article>

              <article className="metric-card">
                <p className="metric-label">Primary model</p>
                <p className="metric-value">{resolved.settings.llm.model}</p>
                <p className="metric-detail">Current default for completion and analysis calls.</p>
              </article>

              <article className="metric-card">
                <p className="metric-label">Interface locale</p>
                <p className="metric-value">{uiLocale.toUpperCase()}</p>
                <p className="metric-detail">
                  Writing locale: {resolved.settings.locale.toUpperCase()}
                </p>
              </article>

              <article className="metric-card">
                <p className="metric-label">Provider health</p>
                <p className="metric-value">
                  {health ? health.status.toUpperCase() : "IDLE"}
                </p>
                <p className="metric-detail">
                  {health?.checkedAt
                    ? `Checked ${new Date(health.checkedAt).toLocaleString()}`
                    : "Run a health check to verify provider reachability."}
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-stack">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Control surfaces</p>
              <h2 className="section-title">Profiles, diagnostics, and quality rules</h2>
              <p className="section-subtitle">
                Split into two concerns: request plumbing on one side, editorial policy on the
                other, with diagnostics and project inventory always visible.
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
            <article className="ui-card p-5 sm:p-6">
              <h2 className="text-2xl font-semibold text-slate-900">Global AI profile</h2>
              <p className="mt-2 text-sm text-slate-600">
                Base connection parameters and the model registry used by every workspace unless a
                project-level override takes over.
              </p>

              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm text-slate-700">
                  <FieldLabel label="Base URL" help="Endpoint used for AI requests." />
                  <input
                    value={activeLlm.baseUrl}
                    placeholder={DEFAULT_LLM_BASE_URL}
                    inputMode="url"
                    onChange={(event) =>
                      setLlmDraft((current) => ({
                        ...(current ?? activeLlm),
                        baseUrl: event.target.value,
                      }))
                    }
                    className="ui-input ui-input-default"
                  />
                  <span className="text-xs text-slate-500">
                    Direct Ollama URL, for example {DEFAULT_LLM_BASE_URL}. Local port 11434 uses
                    HTTP by default. Do not append /v1 or /api.
                  </span>
                </label>

                <label className="grid gap-2 text-sm text-slate-700">
                  <FieldLabel label="Model" help="Model id used for completion requests." />
                  <input
                    value={activeLlm.model}
                    onChange={(event) =>
                      setLlmDraft((current) => ({
                        ...(current ?? activeLlm),
                        model: event.target.value,
                      }))
                    }
                    className="ui-input ui-input-default"
                  />
                </label>

                {models.length > 0 && (
                  <label className="grid gap-2 text-sm text-slate-700">
                    <FieldLabel label="Available models" />
                    <select
                      value={
                        models.includes(activeLlm.model)
                          ? activeLlm.model
                          : ""
                      }
                      onChange={(event) => {
                        if (!event.target.value) return;
                        setLlmDraft((current) => ({
                          ...(current ?? activeLlm),
                          model: event.target.value,
                        }));
                      }}
                      className="ui-input ui-input-default"
                    >
                      <option value="">Select a model</option>
                      {models.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="grid gap-2 text-sm text-slate-700">
                  <FieldLabel label="API key" help="Optional key override for global settings." />
                  <input
                    value={activeLlm.apiKey ?? ""}
                    onChange={(event) =>
                      setLlmDraft((current) => ({
                        ...(current ?? activeLlm),
                        apiKey: event.target.value,
                      }))
                    }
                    className="ui-input ui-input-default"
                  />
                </label>
              </div>

              <div className="action-cluster mt-6">
                <button
                  onClick={() => void applyLocalOllama()}
                  className="ui-btn ui-btn-secondary"
                >
                  Use local Ollama
                </button>
                <button
                  onClick={() => void saveAiProfile()}
                  className="ui-btn ui-btn-primary"
                >
                  Save AI profile
                </button>
                <button onClick={() => void checkHealth()} className="ui-btn ui-btn-secondary">
                  Health check
                </button>
                <button onClick={() => void loadModels()} className="ui-btn ui-btn-secondary">
                  Load models
                </button>
                <button
                  onClick={() => void resetScope("global")}
                  className="ui-btn ui-btn-danger"
                >
                  Reset global scope
                </button>
              </div>
            </article>

            <article className="ui-card p-5 sm:p-6">
              <h2 className="text-2xl font-semibold text-slate-900">Diagnostics</h2>
              <p className="mt-2 text-sm text-slate-600">
                Provider reachability, currently loaded model list, and the last known response
                conditions.
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <p className="field-label__text">Connection state</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {health ? health.status : "Not checked"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {health?.error ??
                      health?.warning ??
                      "No diagnostics yet. Run a health check to inspect the live provider profile."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <p className="field-label__text">Endpoint</p>
                  <p className="mt-3 break-all text-sm text-slate-700">
                    {health?.endpoint ?? resolved.settings.llm.baseUrl}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {health?.latencyMs != null
                      ? `Latency ${health.latencyMs} ms`
                      : "Latency will appear after a successful health check."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <p className="field-label__text">Model inventory</p>
                  <p className="mt-3 text-sm text-slate-700">
                    {models.length > 0
                      ? `${models.length} models loaded`
                      : "No remote model list loaded yet."}
                  </p>
                  {modelsError && <p className="mt-2 text-sm text-rose-700">{modelsError}</p>}
                  {models.length > 0 && (
                    <div className="project-card__meta mt-3">
                      {models.slice(0, 6).map((model) => (
                        <span key={model} className="meta-pill">
                          {model}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <article className="ui-card p-5 sm:p-6">
              <h2 className="text-2xl font-semibold text-slate-900">Prompt presets and QA</h2>
              <p className="mt-2 text-sm text-slate-600">
                Editorial defaults that shape generated output quality and evaluation scoring.
              </p>

              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm text-slate-700">
                  <FieldLabel label="System prompt" />
                  <textarea
                    rows={4}
                    value={resolved.settings.prompts.systemPrompt}
                    onChange={(event) =>
                      void saveScope("global", {
                        prompts: {
                          ...resolved.settings.prompts,
                          systemPrompt: event.target.value,
                        },
                      })
                    }
                    className="ui-input ui-input-wide"
                  />
                </label>

                <label className="grid gap-2 text-sm text-slate-700">
                  <FieldLabel label="Tone guide" />
                  <textarea
                    rows={3}
                    value={resolved.settings.prompts.toneGuide}
                    onChange={(event) =>
                      void saveScope("global", {
                        prompts: {
                          ...resolved.settings.prompts,
                          toneGuide: event.target.value,
                        },
                      })
                    }
                    className="ui-input ui-input-default"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 text-sm text-slate-700">
                    <span className="field-label__text">UI language</span>
                    <LanguageSwitcher mode="ui" />
                  </div>

                  <div className="grid gap-2 text-sm text-slate-700">
                    <span className="field-label__text">Writing language</span>
                    <LanguageSwitcher />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm text-slate-700">
                    <FieldLabel label="Structure weight" />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={resolved.settings.qa.rubricWeights.structure}
                      onChange={(event) =>
                        void saveScope("global", {
                          qa: {
                            ...resolved.settings.qa,
                            rubricWeights: {
                              ...resolved.settings.qa.rubricWeights,
                              structure: Number(event.target.value) || 0,
                            },
                          },
                        })
                      }
                      className="ui-input ui-input-default"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-slate-700">
                    <FieldLabel label="Character weight" />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={resolved.settings.qa.rubricWeights.character}
                      onChange={(event) =>
                        void saveScope("global", {
                          qa: {
                            ...resolved.settings.qa,
                            rubricWeights: {
                              ...resolved.settings.qa.rubricWeights,
                              character: Number(event.target.value) || 0,
                            },
                          },
                        })
                      }
                      className="ui-input ui-input-default"
                    />
                  </label>
                </div>
              </div>
            </article>

            <article className="ui-card p-5 sm:p-6">
              <h2 className="text-2xl font-semibold text-slate-900">Project overview</h2>
              <p className="mt-2 text-sm text-slate-600">
                Quick inventory of all active project records currently visible from the local
                library.
              </p>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 p-4">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="py-2">Title</th>
                      <th>Genre</th>
                      <th>Status</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} className="border-t border-slate-100">
                        <td className="py-3">{project.title}</td>
                        <td>{project.genre}</td>
                        <td>{project.status}</td>
                        <td>{new Date(project.updatedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
