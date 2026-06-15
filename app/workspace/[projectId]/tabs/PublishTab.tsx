"use client";

import { downloadBlob, downloadText } from "@/app/lib/download";
import type { WorkspaceController } from "../useWorkspaceController";

export function PublishTab({ ctx }: { ctx: WorkspaceController }) {
  const {
    activeProject,
    exportPublishArtifacts,
    exportActiveProjectJson,
    projectIdValue,
    exportActiveProjectMarkdown,
    exportActiveProjectBackup,
    publishArtifacts,
  } = ctx;
  if (!activeProject) return null;

  return (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">Publishing artifacts</h2>
              <p className="mt-2 text-sm text-slate-600">No external platform integration. Export-ready local artifacts only.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void exportPublishArtifacts()} className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                  Export publish artifact pack
                </button>
                <button
                  onClick={async () => {
                    const json = await exportActiveProjectJson();
                    if (json) downloadText(`${projectIdValue}.json`, json, "application/json;charset=utf-8");
                  }}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  Export JSON
                </button>
                <button
                  onClick={async () => {
                    const markdown = await exportActiveProjectMarkdown();
                    if (markdown) downloadText(`${projectIdValue}.md`, markdown, "text/markdown;charset=utf-8");
                  }}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  Export Markdown
                </button>
                <button
                  onClick={async () => {
                    const backup = await exportActiveProjectBackup();
                    if (backup) downloadBlob(`${projectIdValue}.backup.zip`, backup);
                  }}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  Export Backup
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Metadata sheet</h3>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{publishArtifacts?.metadataSheet}</pre>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Chapter manifest</h3>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{publishArtifacts?.chapterManifest}</pre>
            </article>
          </section>
  );
}
