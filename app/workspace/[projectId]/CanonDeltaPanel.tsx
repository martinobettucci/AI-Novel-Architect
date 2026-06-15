"use client";

import type { CanonDelta, DetectionStrength, VerifierVerdict } from "@/app/domain/models";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { MessageKey } from "@/app/i18n/messages";
import type { WorkspaceController } from "./useWorkspaceController";

const CONFIDENCE_KEY: Record<DetectionStrength, MessageKey> = {
  explicit: "conf.explicit",
  strong_inference: "conf.strong_inference",
  weak_inference: "conf.weak_inference",
  conflict: "conf.conflict",
  insufficient_evidence: "conf.insufficient_evidence",
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
  const { t } = useI18n();
  const blockedFromApproval = delta.verifierVerdict === "rejected";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {delta.entityLabel || t("delta.unnamed")}{" "}
            <span className="text-xs font-normal text-slate-500">
              · {delta.entityType.replace(/_/g, " ")} · {delta.layer}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {t(CONFIDENCE_KEY[delta.confidence])}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${verdictClass(
              delta.verifierVerdict
            )}`}
            title={delta.verifierReason}
          >
            {t("delta.verifier", { verdict: delta.verifierVerdict })}
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
            {t("delta.evidence")}
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
          title={blockedFromApproval ? t("delta.blockedTitle") : t("delta.validateTitle")}
          className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {t("delta.validate")}
        </button>
        <button
          onClick={() => void ctx.rejectDelta(delta.id)}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
        >
          {t("delta.reject")}
        </button>
        <button
          onClick={() => void ctx.deleteDelta(delta.id)}
          className="rounded border border-rose-300 px-3 py-1.5 text-xs text-rose-700"
        >
          {t("delta.delete")}
        </button>
        {blockedFromApproval && (
          <span className="text-[11px] text-rose-700">{delta.verifierReason}</span>
        )}
      </div>
    </div>
  );
}

export function CanonDeltaPanel({ ctx }: { ctx: WorkspaceController }) {
  const { t } = useI18n();
  const {
    selectedChapter,
    selectedChapterDeltas,
    analyzeChapterForDeltas,
    deltaAiStatus,
    deltaAiError,
    deltaAiMessage,
    orchestrationSteps,
  } = ctx;

  if (!selectedChapter) return null;

  const proposed = selectedChapterDeltas.filter((delta) => delta.status === "proposed");
  const validated = selectedChapterDeltas.filter((delta) => delta.status === "validated").length;
  const rejected = selectedChapterDeltas.filter((delta) => delta.status === "rejected").length;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{t("drafting.canonDeltas")}</h3>
          <p className="text-sm text-slate-600">
            {t("delta.intro", { validated, rejected })}
          </p>
        </div>
        <button
          onClick={() => void analyzeChapterForDeltas()}
          disabled={deltaAiStatus === "running"}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {deltaAiStatus === "running" ? "…" : t("drafting.analyzeChapter")}
        </button>
      </div>

      {deltaAiMessage && <p className="mt-3 text-sm text-emerald-700">{deltaAiMessage}</p>}
      {deltaAiError && <p className="mt-3 text-sm text-rose-700">{deltaAiError}</p>}

      {orchestrationSteps.length > 0 && (
        <ol className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {orchestrationSteps.map((step, index) => (
            <li key={step.id} className="flex items-center gap-2">
              {index > 0 && <span className="text-slate-400">→</span>}
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  step.status === "ok"
                    ? "bg-emerald-100 text-emerald-800"
                    : step.status === "failed"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-600"
                }`}
                title={`${step.detail}${step.inputChars ? ` · ${step.inputChars} car. d'entrée` : ""}`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      )}

      {proposed.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {proposed.map((delta) => (
            <DeltaCard key={delta.id} delta={delta} ctx={ctx} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">{t("delta.none")}</p>
      )}
    </div>
  );
}
