import type { AiActionType, ProjectBundle } from "@/app/domain/models";
import { extractJson } from "@/app/lib/ai/client";
import { runAgentPool, type AgentTask } from "@/app/lib/ai/agentPool";
import {
  buildChapterDeltaContext,
  buildChapterDeltaInput,
  mapChapterDeltaProposals,
  type DeltaProposal,
  type DeltaProposalList,
} from "@/app/lib/ai/canonDeltaAnalysis";

export type OrchestratorStepId =
  | "extractor"
  | "reconciler"
  | "continuity"
  | "pov"
  | "verifier";

export interface OrchestrationPolicy {
  /** Steps to run, in order. */
  steps: OrchestratorStepId[];
}

export const DEFAULT_ORCHESTRATION_POLICY: OrchestrationPolicy = {
  steps: ["extractor", "reconciler", "continuity", "pov", "verifier"],
};

export interface OrchestratorDiagnostic {
  domain: "continuity" | "pov";
  severity: "low" | "medium" | "high";
  message: string;
}

export interface OrchestratorRunStep {
  id: OrchestratorStepId;
  label: string;
  status: "ok" | "failed" | "skipped";
  detail: string;
  inputChars: number;
}

export interface OrchestratorResult {
  steps: OrchestratorRunStep[];
  proposals: DeltaProposal[];
  diagnostics: OrchestratorDiagnostic[];
  /** Extra context the extractor produced, threaded into later steps. */
  extraction: string;
}

export interface StepRequest {
  id: OrchestratorStepId;
  action: AiActionType;
  input: string;
  context: string;
}

/**
 * Abstracts a single structured LLM call. Production wires this to the AI route
 * in JSON mode; tests inject a mock so orchestration logic is verified without a
 * model. Returns the raw response text.
 */
export type StructuredRunner = (req: StepRequest) => Promise<string>;

const STEP_LABEL: Record<OrchestratorStepId, string> = {
  extractor: "Extracteur canonique",
  reconciler: "Réconciliateur d'état",
  continuity: "Auditeur de continuité",
  pov: "Auditeur POV & connaissance",
  verifier: "Vérificateur",
};

function chapterPlainText(bundle: ProjectBundle, chapterId: string): string {
  const chapter = bundle.chapters.find((item) => item.id === chapterId);
  if (!chapter) return "";
  return chapter.content
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

function buildExtractorRequest(bundle: ProjectBundle, chapterId: string): StepRequest {
  return {
    id: "extractor",
    action: "consistency_check",
    input: buildChapterDeltaInput(bundle, chapterId),
    context: [
      "You are the canonical extractor. From the chapter text, list the concrete facts,",
      "entity states, knowledge, and events it asserts. Return JSON:",
      '{ "facts": ["short factual statement copied or paraphrased from the chapter"] }',
      "Only include what the text actually supports.",
    ].join("\n"),
  };
}

function buildAuditRequest(
  id: "continuity" | "pov",
  bundle: ProjectBundle,
  chapterId: string,
  extraction: string
): StepRequest {
  const focus =
    id === "continuity"
      ? "timeline, locations, objects, injuries, world rules, and entity statuses"
      : "what each character can plausibly know, believe, or perceive given the active point of view";
  return {
    id,
    action: "consistency_check",
    input: [buildChapterDeltaInput(bundle, chapterId), "", "Extracted facts:", extraction].join("\n"),
    context: [
      `You are the ${id === "continuity" ? "continuity" : "POV and knowledge"} auditor.`,
      `Check ${focus}.`,
      "Return JSON:",
      '{ "issues": [ { "severity": "low|medium|high", "message": "one concrete problem" } ] }',
      "Only report problems supported by the text and canon. If none, return { \"issues\": [] }.",
    ].join("\n"),
  };
}

function buildReconcilerRequest(
  bundle: ProjectBundle,
  chapterId: string,
  extraction: string
): StepRequest {
  return {
    id: "reconciler",
    action: "consistency_check",
    input: [buildChapterDeltaInput(bundle, chapterId), "", "Extracted facts:", extraction].join("\n"),
    context: buildChapterDeltaContext(),
  };
}

/**
 * Unwrap `{ key: [...] }` (or a bare array) and throw when the payload has a
 * different shape. A shape mismatch must fail its step: silently mapping it to
 * an empty result would report a model error as a clean, successful audit.
 */
function requireArray(value: unknown, key: string): unknown[] {
  const container =
    value && typeof value === "object" && key in value
      ? (value as Record<string, unknown>)[key]
      : value;
  if (!Array.isArray(container)) {
    throw new Error(`Expected a JSON object with a \`${key}\` array.`);
  }
  return container;
}

function mapFacts(value: unknown): string {
  return requireArray(value, "facts")
    .map((item) => (typeof item === "string" ? item : ""))
    .filter(Boolean)
    .map((fact) => `- ${fact}`)
    .join("\n");
}

const SEVERITIES = ["low", "medium", "high"] as const;

function mapDiagnostics(
  value: unknown,
  domain: "continuity" | "pov"
): OrchestratorDiagnostic[] {
  return requireArray(value, "issues")
    .map((raw): OrchestratorDiagnostic | null => {
      if (!raw || typeof raw !== "object") return null;
      const record = raw as Record<string, unknown>;
      const message = typeof record.message === "string" ? record.message.trim() : "";
      if (!message) return null;
      const severity = (SEVERITIES as readonly string[]).includes(record.severity as string)
        ? (record.severity as OrchestratorDiagnostic["severity"])
        : "medium";
      return { domain, severity, message };
    })
    .filter((item): item is OrchestratorDiagnostic => item !== null);
}

/**
 * Run a deterministic, policy-driven chapter analysis pipeline. Each LLM step
 * uses a structured contract; the verifier step is purely deterministic. A run
 * log records which assistants ran, in what order, and what they produced.
 */
export async function runChapterOrchestration(
  bundle: ProjectBundle,
  chapterId: string,
  policy: OrchestrationPolicy,
  run: StructuredRunner
): Promise<OrchestratorResult> {
  const steps: OrchestratorRunStep[] = [];
  let proposals: DeltaProposal[] = [];
  const diagnostics: OrchestratorDiagnostic[] = [];
  let extraction = "";

  const chapter = bundle.chapters.find((item) => item.id === chapterId);
  if (!chapter) return { steps, proposals, diagnostics, extraction };

  // 1. Extraction runs first: the audit and reconciliation agents depend on its facts.
  if (policy.steps.includes("extractor")) {
    const request = buildExtractorRequest(bundle, chapterId);
    try {
      extraction = mapFacts(extractJson(await run(request)));
      const count = extraction ? extraction.split("\n").length : 0;
      steps.push({
        id: "extractor",
        label: STEP_LABEL.extractor,
        status: "ok",
        detail: `${count} fait(s) extrait(s)`,
        inputChars: request.input.length,
      });
    } catch (error) {
      steps.push({
        id: "extractor",
        label: STEP_LABEL.extractor,
        status: "failed",
        detail: error instanceof Error ? error.message : "échec",
        inputChars: request.input.length,
      });
    }
  }

  // 2. The reconciler and the audit agents are independent: run them concurrently.
  interface MiddleResult {
    inputChars: number;
    proposals?: DeltaProposalList;
    diagnostics?: OrchestratorDiagnostic[];
  }
  const middle = policy.steps.filter(
    (step): step is "reconciler" | "continuity" | "pov" =>
      step === "reconciler" || step === "continuity" || step === "pov"
  );
  const tasks: AgentTask<MiddleResult>[] = middle.map((stepId) => ({
    id: stepId,
    label: STEP_LABEL[stepId],
    run: async () => {
      const request: StepRequest =
        stepId === "reconciler"
          ? buildReconcilerRequest(bundle, chapterId, extraction)
          : buildAuditRequest(stepId, bundle, chapterId, extraction);
      const parsed = extractJson(await run(request));
      if (stepId === "reconciler") {
        return { inputChars: request.input.length, proposals: mapChapterDeltaProposals(parsed) };
      }
      return { inputChars: request.input.length, diagnostics: mapDiagnostics(parsed, stepId) };
    },
  }));

  const outcomes = await runAgentPool(tasks, { concurrency: Math.max(1, tasks.length) });

  // Fold outcomes back in deterministic policy order so the run log is stable.
  for (const stepId of middle) {
    const outcome = outcomes.find((item) => item.id === stepId);
    if (!outcome) continue;
    if (outcome.status === "ok" && outcome.data) {
      if (outcome.data.proposals) {
        const dropped = outcome.data.proposals.droppedCount;
        proposals = outcome.data.proposals;
        steps.push({
          id: stepId,
          label: STEP_LABEL[stepId],
          status: "ok",
          // Rejected proposals are reported, never silently absorbed.
          detail: `${proposals.length} delta(s) proposé(s)${
            dropped > 0 ? `, ${dropped} rejeté(s) (champ invalide)` : ""
          }`,
          inputChars: outcome.data.inputChars,
        });
      } else {
        const issues = outcome.data.diagnostics ?? [];
        diagnostics.push(...issues);
        steps.push({
          id: stepId,
          label: STEP_LABEL[stepId],
          status: "ok",
          detail: `${issues.length} diagnostic(s)`,
          inputChars: outcome.data.inputChars,
        });
      }
    } else {
      steps.push({
        id: stepId,
        label: STEP_LABEL[stepId],
        status: "failed",
        detail: outcome.error ?? "échec",
        inputChars: 0,
      });
    }
  }

  // 3. The verifier is deterministic and runs last.
  if (policy.steps.includes("verifier")) {
    steps.push({
      id: "verifier",
      label: STEP_LABEL.verifier,
      status: "ok",
      detail: `${proposals.length} proposition(s) à vérifier contre le texte`,
      inputChars: 0,
    });
  }

  return { steps, proposals, diagnostics, extraction };
}

export { chapterPlainText };
