/**
 * A bounded-concurrency runner for small, independent AI "agents". Each task is
 * one focused run; the pool executes at most `concurrency` at a time and reports
 * each settled run (a checkpoint) as it lands, so partial progress survives a
 * failure and the UI can update live. Pure with respect to the injected `run`
 * functions, so it is fully unit-testable without a model.
 */

export type AgentStatus = "pending" | "running" | "ok" | "failed";

export interface AgentTask<T> {
  id: string;
  label: string;
  run: () => Promise<T>;
}

export interface AgentOutcome<T> {
  id: string;
  label: string;
  status: "ok" | "failed";
  data?: T;
  error?: string;
  ms: number;
}

export interface AgentPoolOptions<T> {
  /**
   * Maximum number of agents running at once. Defaults to 1: typical local LLM
   * backends serialize generations anyway, so fanning out adds no throughput
   * and only lengthens the tail latency of the last agent.
   */
  concurrency?: number;
  onStart?: (task: { id: string; label: string }) => void;
  onSettle?: (outcome: AgentOutcome<T>) => void;
}

export async function runAgentPool<T>(
  tasks: AgentTask<T>[],
  options: AgentPoolOptions<T> = {}
): Promise<AgentOutcome<T>[]> {
  const concurrency = Math.max(1, options.concurrency ?? 1);
  const results: AgentOutcome<T>[] = new Array(tasks.length);
  let next = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= tasks.length) return;

      const task = tasks[index];
      options.onStart?.({ id: task.id, label: task.label });
      const start = Date.now();
      try {
        const data = await task.run();
        results[index] = {
          id: task.id,
          label: task.label,
          status: "ok",
          data,
          ms: Date.now() - start,
        };
      } catch (error) {
        results[index] = {
          id: task.id,
          label: task.label,
          status: "failed",
          error: error instanceof Error ? error.message : "Agent run failed",
          ms: Date.now() - start,
        };
      }
      options.onSettle?.(results[index]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
