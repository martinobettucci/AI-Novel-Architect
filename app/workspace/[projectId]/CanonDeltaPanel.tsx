"use client";

import type { CanonDelta, DetectionStrength, VerifierVerdict } from "@/app/domain/models";
import type { WorkspaceController } from "./useWorkspaceController";

const CONFIDENCE_LABEL: Record<DetectionStrength, string> = {
  explicit: "Explicit",
  strong_inference: "Strong inference",
  weak_inference: "Weak inference",
  conflict: "Conflict",
  insufficient_evidence: "Insufficient evidence",
};

function verdictClass(verdict: VerifierVerdict): string {
  if (verdict === "accepted") return "bg-emerald-100 text-emerald-800";
  if (verdict === "rejected") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-800";
}

function DeltaCard({
  delta,
  ctx,
}: {
  delta: CanonDelta;
  ctx: WorkspaceController;
}) {
  const blockedFromApproval = delta.verifierVerdict === "rejected";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {delta.entityLabel || "(unnamed)"}{" "}
            <span className="text-xs font-normal text-slate-500">
              · {delta.entityType.replace(/_/g, " ")} · {delta.layer}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {CONFIDENCE_LABEL[delta.confidence]}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${verdictClass(
              delta.verifierVerdict
            )}`}
            title={delta.verifierReason}
          >
            verifier: {delta.verifierVerdict}
          </span>
        </div>
      </div>

      <div className="mt-2 grid gap-1 text-sm">
        {delta.before && (
          <p className="text-slate-500 line-through">{delta.before}</p>
        )}
        <p className="text-slate-900">{delta.after}</p>
      </div>

      {delta.rationale && (
        <p className="mt-2 text-xs italic text-slate-600">{delta.rationale}</p>
      )}

      {delta.evidence.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Evidence
          </p>
          {delta.evidence.map((span, index) => (
            <blockquote
              key={index}
              className="border-l-2 border-slate-300 pl-2 text-xs text-slate-700"
            >
              “{span.quote}”
            </blockquote>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void ctx.approveDelta(delta.id)}
          disabled={blockedFromApproval}
          title={
            blockedFromApproval
              ? "The verifier could not find this change's evidence in the chapter. Edit the evidence or reject."
              : "Validate this delta and apply it to canon."
          }
          className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          Validate → canon
        </button>
        <button
          onClick={() => void ctx.rejectDelta(delta.id)}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
        >
          Reject
        </button>
        <button
          onClick={() => void ctx.deleteDelta(delta.id)}
          className="rounded border border-rose-300 px-3 py-1.5 text-xs text-rose-700"
        >
          Delete
        </button>
        {blockedFromApproval && (
          <span className="text-[11px] text-rose-700">{delta.verifierReason}</span>
        )}
      </div>
    </div>
  );
}

export function CanonDeltaPanel({ ctx }: { ctx: WorkspaceController }) {
  const {
    selectedChapter,
    selectedChapterDeltas,
    analyzeChapterForDeltas,
    deltaAiStatus,
    deltaAiError,
    deltaAiMessage,
  } = ctx;

  if (!selectedChapter) return null;

  const proposed = selectedChapterDeltas.filter((delta) => delta.status === "proposed");
  const validated = selectedChapterDeltas.filter((delta) => delta.status === "validated").length;
  const rejected = selectedChapterDeltas.filter((delta) => delta.status === "rejected").length;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Canon deltas</h3>
          <p className="text-sm text-slate-600">
            Structured, evidence-backed change proposals. Canon only mutates when you validate
            one. Validated: {validated} · Rejected: {rejected}.
          </p>
        </div>
        <button
          onClick={() => void analyzeChapterForDeltas()}
          disabled={deltaAiStatus === "running"}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {deltaAiStatus === "running" ? "Analyzing…" : "Analyze chapter → propose deltas"}
        </button>
      </div>

      {deltaAiMessage && <p className="mt-3 text-sm text-emerald-700">{deltaAiMessage}</p>}
      {deltaAiError && <p className="mt-3 text-sm text-rose-700">{deltaAiError}</p>}

      {proposed.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {proposed.map((delta) => (
            <DeltaCard key={delta.id} delta={delta} ctx={ctx} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          No pending proposals. Run the analysis to detect canon changes introduced by this
          chapter, each with cited evidence and a verifier verdict.
        </p>
      )}
    </div>
  );
}
