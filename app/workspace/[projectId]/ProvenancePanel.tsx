"use client";

import type { AiAction } from "@/app/domain/models";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { WorkspaceController } from "./useWorkspaceController";

function statusClass(status: AiAction["status"]): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "failed") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-800";
}

function readFeature(metadata: string): string {
  try {
    const parsed = JSON.parse(metadata) as { feature?: string };
    return parsed.feature ?? "";
  } catch {
    return "";
  }
}

export function ProvenancePanel({ ctx }: { ctx: WorkspaceController }) {
  const { t } = useI18n();
  const { activeProject } = ctx;
  if (!activeProject) return null;

  const actions = activeProject.aiActions.slice(0, 30);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
      <h2 className="text-xl font-semibold text-slate-900">{t("settings.provenance")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("settings.provenanceSubtitle")}</p>

      {actions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">{t("settings.noActivity")}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {actions.map((action) => {
            const feature = readFeature(action.metadata);
            return (
              <details key={action.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <summary className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-slate-900">
                    {feature || action.action}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${statusClass(action.status)}`}>
                      {action.status}
                    </span>
                    {new Date(action.createdAt).toLocaleString()}
                  </span>
                </summary>
                <dl className="mt-2 grid gap-2 text-xs text-slate-700">
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-slate-500">Model</dt>
                    <dd>
                      {action.model} · {action.providerBaseUrl}
                    </dd>
                  </div>
                  {action.inputPreview && (
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">Input</dt>
                      <dd className="whitespace-pre-wrap text-slate-600">{action.inputPreview}</dd>
                    </div>
                  )}
                  {action.outputPreview && (
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">Output</dt>
                      <dd className="whitespace-pre-wrap text-slate-600">{action.outputPreview}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-slate-500">Metadata</dt>
                    <dd className="whitespace-pre-wrap break-all text-slate-500">{action.metadata}</dd>
                  </div>
                </dl>
              </details>
            );
          })}
        </div>
      )}
    </article>
  );
}
