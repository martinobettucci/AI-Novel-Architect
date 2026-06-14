"use client";

import type { WorkspaceTab } from "@/app/workspace/[projectId]/ui/types";

interface TabItem {
  id: WorkspaceTab;
  label: string;
  description: string;
}

export default function WorkspaceTabNavigation({
  tabs,
  activeTab,
  onTabChange,
  heading = "Workspace",
}: {
  tabs: TabItem[];
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  heading?: string;
}) {
  return (
    <>
      <div className="lg:hidden">
        <nav aria-label={heading} className="-mx-1 mb-5 overflow-x-auto pb-1">
          <ul className="flex min-w-max items-center gap-2 px-1">
            {tabs.map((tab, index) => (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  aria-label={tab.label}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  className={`workspace-tab ${activeTab === tab.id ? "workspace-tab--active" : ""}`}
                >
                  <span className="workspace-tab__index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="workspace-tab__label">{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <aside className="hidden lg:block">
        <nav aria-label={heading} className="workspace-tabs sticky top-24">
          <div className="workspace-tabs__inner">
            <p className="workspace-tabs__heading">{heading}</p>
            <ul className="space-y-1.5">
              {tabs.map((tab, index) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                    className={`workspace-tab ${
                      activeTab === tab.id ? "workspace-tab--active" : ""
                    }`}
                  >
                    <span className="workspace-tab__row">
                      <span className="workspace-tab__index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="workspace-tab__copy">
                        <span className="workspace-tab__label">{tab.label}</span>
                        <span className="workspace-tab__description">{tab.description}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>
    </>
  );
}
