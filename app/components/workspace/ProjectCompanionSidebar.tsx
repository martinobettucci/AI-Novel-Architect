"use client";

import { useEffect, useRef } from "react";

export interface CompanionSidebarMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface ProjectCompanionSidebarProps {
  projectTitle: string;
  selectedChapterLabel: string;
  messages: CompanionSidebarMessage[];
  draft: string;
  status: "idle" | "running" | "error";
  error: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onClear: () => void;
  onClose?: () => void;
}

export default function ProjectCompanionSidebar({
  projectTitle,
  selectedChapterLabel,
  messages,
  draft,
  status,
  error,
  onDraftChange,
  onSend,
  onClear,
  onClose,
}: ProjectCompanionSidebarProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const isBusy = status === "running";

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, status]);

  return (
    <aside className="ui-card companion-shell flex flex-col overflow-hidden p-4">
      <div className="companion-shell__header">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="companion-shell__eyebrow">Project companion</p>
            <h2 className="companion-shell__title">Always-on story reviewer</h2>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="companion-shell__close"
              aria-label="Hide project companion"
              title="Hide companion"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>
        <p className="companion-shell__body">
          Agentless mode. Discuss ideas, continuity, and writing decisions in-project.
        </p>
        <p className="companion-shell__meta">
          {projectTitle} · {selectedChapterLabel}
        </p>
      </div>

      <div
        ref={listRef}
        className="companion-shell__stream flex-1 space-y-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-slate-600">
            Ask anything about plot choices, chapter intent, character logic, or canon risks.
          </p>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={`companion-message text-sm ${
                message.role === "assistant"
                  ? "companion-message--assistant"
                  : "companion-message--user"
              }`}
            >
              <p className="companion-message__role">
                {message.role === "assistant" ? "Companion" : "You"}
              </p>
              <p className="whitespace-pre-wrap">{message.text}</p>
            </article>
          ))
        )}
      </div>

      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}

      <div className="mt-3">
        <label htmlFor="project-companion-input" className="mb-1 block text-xs text-slate-500">
          Your question
        </label>
        <textarea
          id="project-companion-input"
          rows={4}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            if (!isBusy) onSend();
          }}
          placeholder="Example: Is chapter 6's reveal too early given what chapter 3 establishes?"
          className="ui-input w-full"
          disabled={isBusy}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClear}
            disabled={isBusy || messages.length === 0}
            className="ui-btn ui-btn-secondary px-3 py-2 text-xs disabled:opacity-40"
          >
            Clear chat
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={isBusy || !draft.trim()}
            className="ui-btn ui-btn-primary px-3 py-2 text-xs disabled:opacity-40"
          >
            {isBusy ? "Thinking..." : "Ask companion"}
          </button>
        </div>
      </div>
    </aside>
  );
}
