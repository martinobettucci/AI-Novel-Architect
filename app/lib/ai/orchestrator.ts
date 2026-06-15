import type { AiActionType, ProjectBundle } from "@/app/domain/models";
import { extractJson } from "@/app/lib/ai/client";
import {
  buildChapterDeltaContext,
  buildChapterDeltaInput,
  mapChapterDeltaProposals,
  type DeltaProposal,
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

function mapFacts(value: unknown): string {
  const container =
    value && typeof value === "object" && "facts" in value
      ? (value as { facts: unknown }).facts
      : value;
  if (!Array.isArray(container)) return "";
  return container
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
  const container =
    value && typeof value === "object" && "issues" in value
      ? (value as { issues: unknown }).issues
      : value;
  if (!Array.isArray(container)) return [];
  return container
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

  for (const stepId of policy.steps) {
    if (stepId === "verifier") {
      // Deterministic: nothing to call; surfaces the count carried forward.
      steps.push({
        id: "verifier",
        label: STEP_LABEL.verifier,
        status: "ok",
        detail: `${proposals.length} proposition(s) à vérifier contre le texte`,
        inputChars: 0,
      });
      continue;
    }

    let request: StepRequest;
    if (stepId === "extractor") request = buildExtractorRequest(bundle, chapterId);
    else if (stepId === "reconciler") request = buildReconcilerRequest(bundle, chapterId, extraction);
    else request = buildAuditRequest(stepId, bundle, chapterId, extraction);

    try {
      const raw = await run(request);
      const parsed = extractJson(raw);

      if (stepId === "extractor") {
        extraction = mapFacts(parsed);
        const count = extraction ? extraction.split("\n").length : 0;
        steps.push({
          id: stepId,
          label: STEP_LABEL[stepId],
          status: "ok",
          detail: `${count} fait(s) extrait(s)`,
          inputChars: request.input.length,
        });
      } else if (stepId === "reconciler") {
        proposals = mapChapterDeltaProposals(parsed);
        steps.push({
          id: stepId,
          label: STEP_LABEL[stepId],
          status: "ok",
          detail: `${proposals.length} delta(s) proposé(s)`,
          inputChars: request.input.length,
        });
      } else {
        const issues = mapDiagnostics(parsed, stepId);
        diagnostics.push(...issues);
        steps.push({
          id: stepId,
          label: STEP_LABEL[stepId],
          status: "ok",
          detail: `${issues.length} diagnostic(s)`,
          inputChars: request.input.length,
        });
      }
    } catch (error) {
      steps.push({
        id: stepId,
        label: STEP_LABEL[stepId],
        status: "failed",
        detail: error instanceof Error ? error.message : "échec",
        inputChars: request.input.length,
      });
    }
  }

  return { steps, proposals, diagnostics, extraction };
}

export { chapterPlainText };
