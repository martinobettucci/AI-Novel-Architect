"use client";

import Link from "next/link";
import TopNav from "@/app/components/TopNav";
import { TABS, tabClass } from "./helpers";
import { useWorkspaceController } from "./useWorkspaceController";
import { PlanTab } from "./tabs/PlanTab";
import { BibleTab } from "./tabs/BibleTab";
import { DraftingTab } from "./tabs/DraftingTab";
import { RevisionTab } from "./tabs/RevisionTab";
import { PublishTab } from "./tabs/PublishTab";
import { MarketingTab } from "./tabs/MarketingTab";
import { SettingsTab } from "./tabs/SettingsTab";

export default function WorkspaceClient({ projectId }: { projectId: string }) {
  const ctx = useWorkspaceController(projectId);
  const {
    t,
    project,
    activeProject,
    storeError,
    offline,
    pendingAiCount,
    activeTab,
    setActiveTab,
  } = ctx;

  if (!project || !activeProject) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-slate-600">
          Loading workspace…
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <TopNav />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {storeError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            Save failed: {storeError}. The view was reloaded from the last persisted state.
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("nav.workspace")}</p>
            <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
            <p className="text-sm text-slate-600">
              {project.genre} · {project.audience} · {project.targetWordCount.toLocaleString()} words target
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-1 font-semibold ${offline ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              {offline ? "Offline" : "Online"}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
              Queued AI tasks: {pendingAiCount}
            </span>
            <Link href="/" className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50">
              Back to dashboard
            </Link>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={tabClass(activeTab === tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "plan" && <PlanTab ctx={ctx} />}
        {activeTab === "bible" && <BibleTab ctx={ctx} />}
        {activeTab === "drafting" && <DraftingTab ctx={ctx} />}
        {activeTab === "revision" && <RevisionTab ctx={ctx} />}
        {activeTab === "publish" && <PublishTab ctx={ctx} />}
        {activeTab === "marketing" && <MarketingTab ctx={ctx} />}
        {activeTab === "settings" && <SettingsTab ctx={ctx} />}
      </main>
    </div>
  );
}
