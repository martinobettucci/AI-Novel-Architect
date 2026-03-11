"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopNav from "@/app/components/TopNav";
import { useI18n } from "@/app/i18n/I18nProvider";
import { downloadBlob, downloadText } from "@/app/lib/download";
import { useProjectStore } from "@/app/stores/projectStore";
import { useSettingsStore } from "@/app/stores/settingsStore";

type CreateMode = "idea" | "outline" | "template";

export default function DashboardPage() {
  const { t } = useI18n();
  const projects = useProjectStore((state) => state.projects);
  const loading = useProjectStore((state) => state.loading);
  const refreshProjects = useProjectStore((state) => state.refreshProjects);
  const createProject = useProjectStore((state) => state.createProject);
  const duplicateActiveProject = useProjectStore((state) => state.duplicateActiveProject);
  const openProject = useProjectStore((state) => state.openProject);
  const archiveProjectById = useProjectStore((state) => state.archiveProjectById);
  const deleteProjectById = useProjectStore((state) => state.deleteProjectById);
  const importProjectFile = useProjectStore((state) => state.importProjectFile);
  const importBackupFile = useProjectStore((state) => state.importBackupFile);
  const exportActiveProjectBackup = useProjectStore((state) => state.exportActiveProjectBackup);
  const exportActiveProjectJson = useProjectStore((state) => state.exportActiveProjectJson);
  const exportActiveProjectMarkdown = useProjectStore((state) => state.exportActiveProjectMarkdown);
  const defaultWritingLocale = useSettingsStore((state) => state.resolved.settings.locale);

  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("idea");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Thriller");
  const [audience, setAudience] = useState("Adult");
  const [tone, setTone] = useState("Tense");
  const [targetWords, setTargetWords] = useState(80000);
  const [initialChapterCount, setInitialChapterCount] = useState(0);
  const [synopsis, setSynopsis] = useState("");
  const [outlineText, setOutlineText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "active"),
    [projects]
  );

  async function handleCreate() {
    if (!title.trim()) {
      setActionError("Project title is required.");
      return;
    }

    setActionError(null);
    const created = await createProject({
      title,
      genre,
      audience,
      tone,
      targetWordCount: targetWords,
      language: defaultWritingLocale,
      synopsis,
      mode: createMode,
      chapterCount: initialChapterCount,
      outlineText,
    });

    setShowCreate(false);
    setTitle("");
    setSynopsis("");
    setOutlineText("");
    setInitialChapterCount(0);
    await openProject(created.project.id);
  }

  async function handleProjectImport(file: File) {
    const text = await file.text();
    const imported = await importProjectFile(file.name, text);
    await openProject(imported.project.id);
  }

  async function handleBackupImport(file: File) {
    const imported = await importBackupFile(file);
    await openProject(imported.project.id);
  }

  async function handleExport(projectId: string) {
    await openProject(projectId);
    const [json, markdown, backup] = await Promise.all([
      exportActiveProjectJson(),
      exportActiveProjectMarkdown(),
      exportActiveProjectBackup(),
    ]);

    if (json) downloadText(`${projectId}.json`, json, "application/json;charset=utf-8");
    if (markdown) downloadText(`${projectId}.md`, markdown, "text/markdown;charset=utf-8");
    if (backup) downloadBlob(`${projectId}.backup.zip`, backup);
  }

  async function handleDuplicate(projectId: string) {
    await openProject(projectId);
    await duplicateActiveProject();
    await refreshProjects();
  }

  return (
    <div className="min-h-screen pb-10">
      <TopNav />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t("dashboard.title")}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">{t("dashboard.subtitle")}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                {t("dashboard.create")}
              </button>

              <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Import JSON/MD/TXT
                <input
                  className="hidden"
                  type="file"
                  accept=".json,.md,.markdown,.txt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleProjectImport(file);
                    event.target.value = "";
                  }}
                />
              </label>

              <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Restore Backup
                <input
                  className="hidden"
                  type="file"
                  accept=".zip"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleBackupImport(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {loading && <p className="text-sm text-slate-500">Loading projects…</p>}

          {!loading && activeProjects.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500">
              No project yet. Create one to start the end-to-end writing workflow.
            </div>
          )}

          {activeProjects.map((project) => (
            <article
              key={project.id}
              className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
                    {project.genre}
                  </p>
                  <h2 className="truncate text-2xl font-semibold text-slate-900">{project.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Audience: {project.audience} · Tone: {project.tone} · Target: {project.targetWordCount.toLocaleString()} words
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-700">{project.synopsis}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/workspace/${project.id}`}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
                  >
                    Open Workspace
                  </Link>
                  <button
                    onClick={() => void handleDuplicate(project.id)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {t("common.duplicate")}
                  </button>
                  <button
                    onClick={() => void handleExport(project.id)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Export/Backup
                  </button>
                  <button
                    onClick={() => void archiveProjectById(project.id, "archived")}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {t("common.archive")}
                  </button>
                  <button
                    onClick={() => void deleteProjectById(project.id)}
                    className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900">Create Project</h2>
            <p className="mt-1 text-sm text-slate-600">
              Start from idea, detailed outline, or template. All flows use real persisted logic.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {(["idea", "outline", "template"] as CreateMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setCreateMode(mode)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    createMode === mode
                      ? "bg-teal-700 text-white"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-700">
                Title
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-md px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Genre
                <input value={genre} onChange={(e) => setGenre(e.target.value)} className="rounded-md px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Audience
                <input value={audience} onChange={(e) => setAudience(e.target.value)} className="rounded-md px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Tone
                <input value={tone} onChange={(e) => setTone(e.target.value)} className="rounded-md px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm text-slate-700 sm:col-span-2">
                Target words
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={targetWords}
                  onChange={(e) => setTargetWords(Number(e.target.value) || 80000)}
                  className="rounded-md px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-700 sm:col-span-2">
                Initial chapter shells
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={initialChapterCount}
                  onChange={(e) => setInitialChapterCount(Math.max(0, Number(e.target.value) || 0))}
                  className="rounded-md px-3 py-2"
                />
                <span className="text-xs text-slate-500">
                  Leave at 0 to start empty. Outline mode can still derive chapters from your outline.
                </span>
              </label>
              <label className="grid gap-1 text-sm text-slate-700 sm:col-span-2">
                Synopsis
                <textarea
                  rows={4}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  className="rounded-md px-3 py-2"
                />
              </label>

              {createMode === "outline" && (
                <label className="grid gap-1 text-sm text-slate-700 sm:col-span-2">
                  Outline text (one chapter per line)
                  <textarea
                    rows={6}
                    value={outlineText}
                    onChange={(e) => setOutlineText(e.target.value)}
                    className="rounded-md px-3 py-2"
                  />
                </label>
              )}
            </div>

            {actionError && <p className="mt-3 text-sm text-rose-700">{actionError}</p>}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => void handleCreate()}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Create and Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
