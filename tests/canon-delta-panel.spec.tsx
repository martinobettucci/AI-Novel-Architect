import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CanonDeltaPanel } from "@/app/workspace/[projectId]/CanonDeltaPanel";
import type { WorkspaceController } from "@/app/workspace/[projectId]/useWorkspaceController";
import { createCanonDelta } from "@/app/domain/defaults";
import type { Chapter } from "@/app/domain/models";

function stubChapter(): Chapter {
  return {
    id: "c1",
    projectId: "p1",
    number: 1,
    title: "Opening",
    summary: "",
    objectives: [],
    hook: "",
    storySoFar: "",
    notes: "",
    wordCountTarget: 0,
    wordCountCurrent: 0,
    status: "draft",
    content: "",
    aiLocked: false,
    createdAt: "",
    updatedAt: "",
  };
}

function makeCtx(overrides: Partial<WorkspaceController>): WorkspaceController {
  return {
    selectedChapter: stubChapter(),
    selectedChapterDeltas: [],
    analyzeChapterForDeltas: vi.fn(),
    deltaAiStatus: "idle",
    deltaAiError: null,
    deltaAiMessage: null,
    approveDelta: vi.fn(),
    rejectDelta: vi.fn(),
    deleteDelta: vi.fn(),
    ...overrides,
  } as unknown as WorkspaceController;
}

describe("CanonDeltaPanel", () => {
  it("renders an accepted proposal and validates it on click", async () => {
    const approveDelta = vi.fn();
    const delta = createCanonDelta("p1", {
      id: "d1",
      chapterId: "c1",
      entityLabel: "Nadia",
      layer: "knowledge",
      after: "Knows the code",
      status: "proposed",
      verifierVerdict: "accepted",
      evidence: [{ quote: "Nadia knew the code" }],
    });

    render(<CanonDeltaPanel ctx={makeCtx({ selectedChapterDeltas: [delta], approveDelta })} />);

    expect(screen.getByText("Nadia")).toBeInTheDocument();
    expect(screen.getByText(/Nadia knew the code/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Validate/i }));
    expect(approveDelta).toHaveBeenCalledWith("d1");
  });

  it("blocks validation when the verifier rejected the evidence", () => {
    const delta = createCanonDelta("p1", {
      id: "d2",
      chapterId: "c1",
      entityLabel: "Ghost",
      after: "Something",
      status: "proposed",
      verifierVerdict: "rejected",
    });

    render(<CanonDeltaPanel ctx={makeCtx({ selectedChapterDeltas: [delta] })} />);
    expect(screen.getByRole("button", { name: /Validate/i })).toBeDisabled();
  });
});
