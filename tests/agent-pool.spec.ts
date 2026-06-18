import { describe, expect, it } from "vitest";
import { runAgentPool, type AgentTask } from "@/app/lib/ai/agentPool";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("runAgentPool", () => {
  it("returns outcomes in task order and isolates failures", async () => {
    const tasks: AgentTask<number>[] = [
      { id: "a", label: "A", run: async () => 1 },
      { id: "b", label: "B", run: async () => { throw new Error("boom"); } },
      { id: "c", label: "C", run: async () => 3 },
    ];

    const outcomes = await runAgentPool(tasks, { concurrency: 2 });
    expect(outcomes.map((o) => o.id)).toEqual(["a", "b", "c"]);
    expect(outcomes[0]).toMatchObject({ status: "ok", data: 1 });
    expect(outcomes[1]).toMatchObject({ status: "failed", error: "boom" });
    expect(outcomes[2]).toMatchObject({ status: "ok", data: 3 });
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    const tasks: AgentTask<void>[] = Array.from({ length: 8 }, (_, i) => ({
      id: `t${i}`,
      label: `T${i}`,
      run: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await delay(10);
        active -= 1;
      },
    }));

    await runAgentPool(tasks, { concurrency: 3 });
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1); // actually ran concurrently
  });

  it("reports start and settle callbacks for every task", async () => {
    const started: string[] = [];
    const settled: string[] = [];
    const tasks: AgentTask<number>[] = [
      { id: "x", label: "X", run: async () => 1 },
      { id: "y", label: "Y", run: async () => 2 },
    ];

    await runAgentPool(tasks, {
      concurrency: 1,
      onStart: (t) => started.push(t.id),
      onSettle: (o) => settled.push(o.id),
    });

    expect(started.sort()).toEqual(["x", "y"]);
    expect(settled.sort()).toEqual(["x", "y"]);
  });
});
