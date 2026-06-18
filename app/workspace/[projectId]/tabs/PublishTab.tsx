"use client";

import { downloadBlob, downloadText } from "@/app/lib/download";
import { CompilePanel } from "../CompilePanel";
import type { WorkspaceController } from "../useWorkspaceController";

export function PublishTab({ ctx }: { ctx: WorkspaceController }) {
  const {
    t,
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
              <h2 className="text-xl font-semibold text-slate-900">{t("publish.title")}</h2>
              <p className="mt-2 text-sm text-slate-600">{t("publish.subtitle")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void exportPublishArtifacts()} className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                  {t("publish.exportPack")}
                </button>
                <button
                  onClick={async () => {
                    const json = await exportActiveProjectJson();
                    if (json) downloadText(`${projectIdValue}.json`, json, "application/json;charset=utf-8");
                  }}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  {t("publish.exportJson")}
                </button>
                <button
                  onClick={async () => {
                    const markdown = await exportActiveProjectMarkdown();
                    if (markdown) downloadText(`${projectIdValue}.md`, markdown, "text/markdown;charset=utf-8");
                  }}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  {t("publish.exportMarkdown")}
                </button>
                <button
                  onClick={async () => {
                    const backup = await exportActiveProjectBackup();
                    if (backup) downloadBlob(`${projectIdValue}.backup.zip`, backup);
                  }}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  {t("publish.exportBackup")}
                </button>
              </div>
            </article>

            <CompilePanel ctx={ctx} />

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h3 className="text-lg font-semibold text-slate-900">{t("publish.metadataSheet")}</h3>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{publishArtifacts?.metadataSheet}</pre>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <h3 className="text-lg font-semibold text-slate-900">{t("publish.chapterManifest")}</h3>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{publishArtifacts?.chapterManifest}</pre>
            </article>
          </section>
  );
}
