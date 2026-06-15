"use client";

import type { WorkspaceController } from "../useWorkspaceController";

export function MarketingTab({ ctx }: { ctx: WorkspaceController }) {
  const {
    activeProject,
    exportMarketingArtifacts,
    marketingArtifacts,
  } = ctx;
  if (!activeProject) return null;

  return (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">Marketing toolkit</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => exportMarketingArtifacts()} className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                  Export marketing pack
                </button>
                <button
                  onClick={() => {
                    if (!marketingArtifacts) return;
                    void navigator.clipboard.writeText(marketingArtifacts.blurb);
                  }}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  Copy blurb
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Blurb + tagline</h3>
              <p className="mt-2 text-sm text-slate-700">{marketingArtifacts?.blurb}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{marketingArtifacts?.tagline}</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Cover brief + launch checklist</h3>
              <p className="mt-2 text-sm text-slate-700">{marketingArtifacts?.coverBriefPrompt}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {marketingArtifacts?.launchChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>
  );
}
