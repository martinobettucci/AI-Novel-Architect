"use client";

import { useEffect, useState } from "react";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import TopNav from "@/app/components/TopNav";
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
  const loadSettings = useSettingsStore((state) => state.load);
  const saveScope = useSettingsStore((state) => state.saveScope);
  const resetScope = useSettingsStore((state) => state.resetScope);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    void refreshProjects();
    void loadSettings();
  }, [loadSettings, refreshProjects]);

  function llmHeaders(): Record<string, string> {
    return {
      "x-openai-base-url": resolved.settings.llm.baseUrl,
      "x-openai-model": resolved.settings.llm.model,
      ...(resolved.settings.llm.apiKey
        ? { "x-openai-api-key": resolved.settings.llm.apiKey }
        : {}),
    };
  }

  async function checkHealth() {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/ai/health", {
        cache: "no-store",
        headers: llmHeaders(),
      });
      const payload = (await res.json()) as HealthResponse;
      setHealth(payload);
    } catch (error) {
      setHealth({
        status: "error",
        error: error instanceof Error ? error.message : "Health check request failed",
      });
    } finally {
      setHealthLoading(false);
    }
  }

  async function loadModels() {
    setModelsError(null);
    setModelsLoading(true);
    try {
      const res = await fetch("/api/ai/models", {
        cache: "no-store",
        headers: llmHeaders(),
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
    } catch (error) {
      setModelsError(
        error instanceof Error ? error.message : "Could not reach the models endpoint"
      );
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  }

  return (
    <div className="min-h-screen pb-10">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900">{t("settings.title")}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Global control center for providers, models, prompt presets, QA rules, and backup policy.
        </p>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
            <h2 className="text-xl font-semibold text-slate-900">Global AI profile</h2>
            <div className="mt-3 grid gap-2">
              <label className="grid gap-1 text-sm text-slate-700">
                Base URL
                <input
                  value={resolved.settings.llm.baseUrl}
                  onChange={(event) =>
                    void saveScope("global", {
                      llm: {
                        ...resolved.settings.llm,
                        baseUrl: event.target.value,
                      },
                    })
                  }
                  className="rounded border border-slate-300 px-2 py-1"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Model
                <input
                  value={resolved.settings.llm.model}
                  onChange={(event) =>
                    void saveScope("global", {
                      llm: {
                        ...resolved.settings.llm,
                        model: event.target.value,
                      },
                    })
                  }
                  className="rounded border border-slate-300 px-2 py-1"
                />
              </label>
              {models.length > 0 && (
                <label className="grid gap-1 text-sm text-slate-700">
                  Available models
                  <select
                    value={models.includes(resolved.settings.llm.model) ? resolved.settings.llm.model : ""}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      void saveScope("global", {
                        llm: {
                          ...resolved.settings.llm,
                          model: event.target.value,
                        },
                      });
                    }}
                    className="rounded border border-slate-300 px-2 py-1"
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
              <label className="grid gap-1 text-sm text-slate-700">
                API key
                <input
                  type="password"
                  autoComplete="off"
                  value={resolved.settings.llm.apiKey ?? ""}
                  onChange={(event) =>
                    void saveScope("global", {
                      llm: {
                        ...resolved.settings.llm,
                        apiKey: event.target.value,
                      },
                    })
                  }
                  className="rounded border border-slate-300 px-2 py-1"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void checkHealth()}
                disabled={healthLoading}
                className="rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {healthLoading ? "Checking…" : "Health check"}
              </button>
              <button
                onClick={() => void loadModels()}
                disabled={modelsLoading}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                {modelsLoading ? "Loading…" : "Load models"}
              </button>
              <button onClick={() => void resetScope("global")} className="rounded border border-rose-300 px-3 py-1.5 text-sm text-rose-700">
                Reset global scope
              </button>
            </div>

            {health && (
              <div className={`mt-4 rounded-lg border p-3 text-sm ${health.status === "connected" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
                <p className="font-semibold">Status: {health.status}</p>
                {health.error && <p>{health.error}</p>}
                {health.warning && <p>{health.warning}</p>}
                {health.model && <p>Model: {health.model}</p>}
                {health.latencyMs != null && <p>Latency: {health.latencyMs} ms</p>}
              </div>
            )}

            {modelsError && <p className="mt-3 text-sm text-rose-700">{modelsError}</p>}
            {models.length > 0 && <p className="mt-3 text-xs text-slate-600">Loaded {models.length} models.</p>}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
            <h2 className="text-xl font-semibold text-slate-900">Prompt presets and QA</h2>
            <div className="mt-3 grid gap-2">
              <label className="grid gap-1 text-sm text-slate-700">
                System prompt
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
                  className="rounded border border-slate-300 px-2 py-1"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Tone guide
                <textarea
                  rows={2}
                  value={resolved.settings.prompts.toneGuide}
                  onChange={(event) =>
                    void saveScope("global", {
                      prompts: {
                        ...resolved.settings.prompts,
                        toneGuide: event.target.value,
                      },
                    })
                  }
                  className="rounded border border-slate-300 px-2 py-1"
                />
              </label>
              <div className="grid gap-1 text-sm text-slate-700">
                <span>UI language</span>
                <div>
                  <LanguageSwitcher mode="ui" />
                </div>
              </div>
              <div className="grid gap-1 text-sm text-slate-700">
                <span>Writing language</span>
                <div>
                  <LanguageSwitcher />
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-700">
                Structure weight
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
                  className="rounded border border-slate-300 px-2 py-1"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Character weight
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
                  className="rounded border border-slate-300 px-2 py-1"
                />
              </label>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-5">
          <h2 className="text-xl font-semibold text-slate-900">Project overview</h2>
          <p className="mt-1 text-sm text-slate-600">Total active projects: {projects.length}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2">Title</th>
                  <th>Genre</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-t border-slate-100 text-slate-700">
                    <td className="py-2">{project.title}</td>
                    <td>{project.genre}</td>
                    <td>{project.status}</td>
                    <td>{new Date(project.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
