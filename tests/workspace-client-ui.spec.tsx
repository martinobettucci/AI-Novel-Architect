import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import WorkspaceClient from "@/app/workspace/[projectId]/WorkspaceClient";

const mocked = vi.hoisted(() => {
  const asyncFn = () => vi.fn(async () => undefined);
  const addChapter = asyncFn();
  const reorderChapter = asyncFn();
  const openProject = asyncFn();
  const loadSettings = asyncFn();

  const projectBundle = {
    project: {
      id: "project-1",
      title: "Project Atlas",
      genre: "Thriller",
      audience: "Adult",
      tone: "Tense",
      targetWordCount: 80000,
      language: "en",
      status: "active",
      synopsis: "A fast-paced conspiracy story.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    manuscript: {
      projectId: "project-1",
      manuscriptTitle: "Project Atlas",
      subtitle: "",
      premise: "",
      updatedAt: new Date().toISOString(),
    },
    chapters: [
      {
        id: "chapter-1",
        projectId: "project-1",
        number: 1,
        title: "Prologue",
        summary: "A hidden dossier surfaces.",
        objectives: ["introduce threat"],
        hook: "An encrypted message appears.",
        storySoFar: "",
        notes: "",
        wordCountTarget: 1800,
        wordCountCurrent: 400,
        status: "draft",
        content: "<p>Opening lines</p>",
        aiLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    scenes: [
      {
        id: "scene-1",
        projectId: "project-1",
        chapterId: "chapter-1",
        order: 1,
        title: "Briefing",
        description: "The team meets.",
        location: "War room",
        characters: ["Hero"],
        notes: "",
        draftText: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    bible: {
      id: "bible-1",
      projectId: "project-1",
      premise: "A journalist uncovers a political machine.",
      themes: ["truth", "power"],
      stakes: "National collapse",
      worldRules: "No deus ex machina.",
      loreEntries: [],
      glossaryEntries: [],
      locations: [],
      updatedAt: new Date().toISOString(),
    },
    characters: [
      {
        id: "char-hero",
        projectId: "project-1",
        name: "Hero",
        role: "Lead",
        motivation: "",
        arc: "Learns to trust",
        voice: "",
        relationships: "",
        notes: "",
        updatedAt: new Date().toISOString(),
      },
      {
        id: "char-rival",
        projectId: "project-1",
        name: "Rival",
        role: "Antagonist",
        motivation: "",
        arc: "Escalates conflict",
        voice: "",
        relationships: "",
        notes: "",
        updatedAt: new Date().toISOString(),
      },
    ],
    locations: [],
    loreEntries: [],
    timeline: [],
    relationships: [],
    entityProgression: [],
    entityHistory: [],
    revisionIssues: [
      {
        id: "issue-1",
        projectId: "project-1",
        chapterId: "chapter-1",
        title: "Pacing dip",
        description: "Middle section slows momentum.",
        severity: "medium",
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    checklist: [
      {
        id: "check-1",
        projectId: "project-1",
        scope: "revision",
        title: "Resolve key issue",
        done: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    annotations: [
      {
        id: "annotation-1",
        projectId: "project-1",
        chapterId: "chapter-1",
        quote: "Opening lines",
        note: "Good rhythm",
        tags: ["voice"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    goal: {
      id: "goal-1",
      projectId: "project-1",
      dailyWords: 500,
      sessionWords: 1000,
      chapterWords: 1800,
      updatedAt: new Date().toISOString(),
    },
    snapshots: [
      {
        id: "snapshot-1",
        projectId: "project-1",
        label: "Manual snapshot",
        chapterId: "chapter-1",
        payload: "<p>snapshot</p>",
        createdAt: new Date().toISOString(),
      },
    ],
    aiActions: [
      {
        id: "ai-1",
        projectId: "project-1",
        chapterId: "chapter-1",
        action: "revision_pass",
        status: "pending",
        model: "gpt-test",
        providerBaseUrl: "https://example.com",
        inputPreview: "",
        outputPreview: "",
        metadata: "{}",
        createdAt: new Date().toISOString(),
      },
    ],
    chapterTrackerReports: [],
  };

  return {
    addChapter,
    reorderChapter,
    openProject,
    loadSettings,
    projectBundle,
    noOpAsync: asyncFn,
  };
});

vi.mock("@tiptap/react", () => {
  const runResult = { run: () => true };
  const focusResult = {
    toggleBold: () => runResult,
    toggleItalic: () => runResult,
    toggleHeading: () => runResult,
    toggleBulletList: () => runResult,
    toggleBlockquote: () => runResult,
    undo: () => runResult,
    redo: () => runResult,
  };

  return {
    EditorContent: ({ className }: { className?: string }) => (
      <div data-testid="editor-content" className={className} />
    ),
    useEditor: () => ({
      getHTML: () => "<p>Opening lines</p>",
      setEditable: () => undefined,
      chain: () => ({
        focus: () => focusResult,
      }),
      commands: {
        setContent: () => undefined,
      },
    }),
  };
});

vi.mock("@/app/components/TopNav", () => ({
  default: () => <div data-testid="top-nav" />,
}));

vi.mock("@/app/stores/projectStore", () => {
  return {
    useProjectStore: (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        activeProject: mocked.projectBundle,
        openProject: mocked.openProject,
        saveProjectMeta: mocked.noOpAsync(),
        saveStoryBible: mocked.noOpAsync(),
        saveChapter: mocked.noOpAsync(),
        saveChapters: mocked.noOpAsync(),
        saveChapterTrackerReport: mocked.noOpAsync(),
        addChapter: mocked.addChapter,
        deleteChapter: mocked.noOpAsync(),
        reorderChapter: mocked.reorderChapter,
        saveScene: mocked.noOpAsync(),
        addScene: mocked.noOpAsync(),
        deleteScene: mocked.noOpAsync(),
        reorderScene: mocked.noOpAsync(),
        saveCharacter: mocked.noOpAsync(),
        deleteCharacter: mocked.noOpAsync(),
        saveLocation: mocked.noOpAsync(),
        deleteLocation: mocked.noOpAsync(),
        saveLoreEntry: mocked.noOpAsync(),
        deleteLoreEntry: mocked.noOpAsync(),
        saveTimelineEvent: mocked.noOpAsync(),
        deleteTimelineEvent: mocked.noOpAsync(),
        saveRelationship: mocked.noOpAsync(),
        deleteRelationship: mocked.noOpAsync(),
        saveEntityProgression: mocked.noOpAsync(),
        deleteEntityProgression: mocked.noOpAsync(),
        replaceEntityHistoryForChapter: mocked.noOpAsync(),
        createRevisionIssue: mocked.noOpAsync(),
        updateRevisionIssueStatus: mocked.noOpAsync(),
        deleteRevisionIssue: mocked.noOpAsync(),
        saveChecklistItem: mocked.noOpAsync(),
        toggleChecklistItem: mocked.noOpAsync(),
        deleteChecklistItem: mocked.noOpAsync(),
        saveAnnotation: mocked.noOpAsync(),
        deleteAnnotation: mocked.noOpAsync(),
        createSnapshot: mocked.noOpAsync(),
        restoreSnapshot: mocked.noOpAsync(),
        exportActiveProjectJson: mocked.noOpAsync(),
        exportActiveProjectMarkdown: mocked.noOpAsync(),
        exportActiveProjectBackup: mocked.noOpAsync(),
      }),
  };
});

vi.mock("@/app/stores/settingsStore", () => {
  return {
    useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        resolved: {
          settings: {
            locale: "en",
            uiLocale: "en",
            llm: {
              baseUrl: "https://example.com",
              model: "gpt-test",
              apiKey: "",
              temperature: 0.2,
              maxTokens: 2000,
            },
            prompts: {
              systemPrompt: "Test prompt",
              toneGuide: "Balanced",
              safetyMode: "preview",
            },
            qa: {
              rubricWeights: {
                structure: 25,
                character: 25,
                pacing: 25,
                style: 25,
              },
              enforceChecklistBeforeExport: false,
            },
          },
          sourceOrder: ["project", "global", "defaults"],
        },
        load: mocked.loadSettings,
        saveScope: mocked.noOpAsync(),
        resetScope: mocked.noOpAsync(),
      }),
  };
});

describe("workspace client ui", () => {
  it("renders tab shell, filters entities, persists ui prefs, and keeps key actions wired", async () => {
    const user = userEvent.setup();

    render(<WorkspaceClient projectId="project-1" />);

    await waitFor(() => {
      expect(mocked.openProject).toHaveBeenCalledWith("project-1");
      expect(mocked.loadSettings).toHaveBeenCalledWith("project-1");
    });

    expect(
      screen.getByRole("button", { name: "Generate with 3 method agents" })
    ).toBeInTheDocument();
    const snowflakeMethodToggle = screen.getByRole("button", {
      name: /The Snowflake Method/i,
    });
    expect(snowflakeMethodToggle).toHaveAttribute("aria-pressed", "true");
    const methodReferenceLinks = screen.getAllByRole("link", { name: /Reference/i });
    expect(methodReferenceLinks[0]).toHaveAttribute(
      "href",
      "https://www.advancedfictionwriting.com/articles/snowflake-method/"
    );

    await user.click(screen.getByRole("button", { name: "Open project companion" }));
    expect(screen.getByText("Project companion")).toBeInTheDocument();
    expect(screen.getByLabelText("Your question")).toBeInTheDocument();

    expect(screen.getAllByRole("button", { name: "Title help" }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Add chapter" }));
    expect(mocked.addChapter).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByRole("button", { name: "Up" })[0]);
    expect(mocked.reorderChapter).toHaveBeenCalledWith(1, 0);

    await user.click(screen.getAllByRole("button", { name: "Story Bible" })[0]);
    const characterFilter = screen.getByLabelText("Search characters");
    await user.clear(characterFilter);
    await user.type(characterFilter, "hero");

    const characterNameInputs = screen.getAllByPlaceholderText("Character name");
    expect(characterNameInputs).toHaveLength(1);
    expect(characterNameInputs[0]).toHaveValue("Hero");

    await user.click(screen.getAllByRole("button", { name: /Settings|Réglages/i })[0]);

    await waitFor(() => {
      const stored = window.localStorage.getItem("ana:ui-prefs:project-1");
      expect(stored).toBeTruthy();
      expect(stored).toContain('"activeTab":"settings"');
    });
  }, 15_000);
});
