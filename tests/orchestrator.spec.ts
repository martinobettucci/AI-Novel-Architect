import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORCHESTRATION_POLICY,
  runChapterOrchestration,
  type StepRequest,
  type StructuredRunner,
} from "@/app/lib/ai/orchestrator";
import type { ProjectBundle } from "@/app/domain/models";

function bundle(): ProjectBundle {
  return {
    chapters: [
      {
        id: "c1",
        number: 1,
        title: "Opening",
        summary: "",
        content: "<p>Nadia entered the vault and read the code.</p>",
      },
    ],
    characters: [{ name: "Nadia", id: "char-1" }],
    locations: [],
    loreEntries: [],
    timeline: [],
  } as unknown as ProjectBundle;
}

function runnerFrom(map: Partial<Record<string, string>>): {
  run: StructuredRunner;
  calls: StepRequest[];
} {
  const calls: StepRequest[] = [];
  const run: StructuredRunner = async (req) => {
    calls.push(req);
    return map[req.id] ?? "{}";
  };
  return { run, calls };
}

describe("runChapterOrchestration", () => {
  it("runs steps in policy order and records a run log", async () => {
    const { run, calls } = runnerFrom({
      extractor: '{"facts":["Nadia read the code"]}',
      reconciler:
        '{"deltas":[{"entityType":"character","entityName":"Nadia","layer":"knowledge","after":"Knows the code","evidence":[{"quote":"read the code"}]}]}',
      continuity: '{"issues":[{"severity":"high","message":"Timeline gap"}]}',
      pov: '{"issues":[]}',
    });

    const result = await runChapterOrchestration(bundle(), "c1", DEFAULT_ORCHESTRATION_POLICY, run);

    // LLM steps were called in order (verifier is deterministic, no call).
    expect(calls.map((c) => c.id)).toEqual(["extractor", "reconciler", "continuity", "pov"]);
    expect(result.steps.map((s) => s.id)).toEqual([
      "extractor",
      "reconciler",
      "continuity",
      "pov",
      "verifier",
    ]);
    expect(result.proposals).toHaveLength(1);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].domain).toBe("continuity");
  });

  it("threads extracted facts into later step inputs", async () => {
    const { run, calls } = runnerFrom({ extractor: '{"facts":["Secret X revealed"]}' });
    await runChapterOrchestration(bundle(), "c1", DEFAULT_ORCHESTRATION_POLICY, run);
    const reconciler = calls.find((c) => c.id === "reconciler");
    expect(reconciler?.input).toContain("Secret X revealed");
  });

  it("isolates a failing step without aborting the pipeline", async () => {
    const run: StructuredRunner = async (req) => {
      if (req.id === "reconciler") throw new Error("model timeout");
      return "{}";
    };
    const result = await runChapterOrchestration(bundle(), "c1", DEFAULT_ORCHESTRATION_POLICY, run);
    const reconciler = result.steps.find((s) => s.id === "reconciler");
    expect(reconciler?.status).toBe("failed");
    // Later steps still ran.
    expect(result.steps.find((s) => s.id === "pov")?.status).toBe("ok");
  });

  it("respects a restricted policy", async () => {
    const { run, calls } = runnerFrom({ continuity: '{"issues":[{"severity":"low","message":"x"}]}' });
    const result = await runChapterOrchestration(
      bundle(),
      "c1",
      { steps: ["continuity", "verifier"] },
      run
    );
    expect(calls.map((c) => c.id)).toEqual(["continuity"]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.steps.map((s) => s.id)).toEqual(["continuity", "verifier"]);
  });
});
