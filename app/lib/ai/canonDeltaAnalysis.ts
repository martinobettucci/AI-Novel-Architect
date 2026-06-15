import type {
  DeltaLayer,
  DetectionStrength,
  EvidenceSpan,
  HistoryEntityType,
  ProjectBundle,
} from "@/app/domain/models";

/** A canon-change proposal before entity ids are resolved against the project. */
export interface DeltaProposal {
  entityType: HistoryEntityType | "chapter";
  entityName: string;
  layer: DeltaLayer;
  before: string;
  after: string;
  confidence: DetectionStrength;
  rationale: string;
  evidence: EvidenceSpan[];
}

const ENTITY_TYPES: Array<DeltaProposal["entityType"]> = [
  "character",
  "location",
  "lore",
  "timeline_event",
  "relationship",
  "chapter",
];

const LAYERS: DeltaLayer[] = [
  "startState",
  "endState",
  "knowledge",
  "belief",
  "inventory",
  "narrationStatus",
  "summary",
  "relationship",
];

const CONFIDENCES: DetectionStrength[] = [
  "explicit",
  "strong_inference",
  "weak_inference",
  "conflict",
  "insufficient_evidence",
];

export function buildChapterDeltaContext(): string {
  return [
    "You are the canon reconciliation assistant for a long-form fiction project.",
    "Compare the current chapter text against the validated canon and propose discrete",
    "state changes (deltas) that this chapter introduces for tracked entities.",
    "",
    "Output a single JSON object of the form:",
    '{ "deltas": [ {',
    '  "entityType": "character|location|lore|timeline_event|relationship|chapter",',
    '  "entityName": "exact name as it appears in the canon lists",',
    '  "layer": "startState|endState|knowledge|belief|inventory|narrationStatus|summary|relationship",',
    '  "before": "prior state, empty string if unknown",',
    '  "after": "new state after this chapter",',
    '  "confidence": "explicit|strong_inference|weak_inference|conflict|insufficient_evidence",',
    '  "rationale": "one sentence justifying the change",',
    '  "evidence": [ { "quote": "verbatim sentence copied from the chapter text" } ]',
    "} ] }",
    "",
    "Rules:",
    "- Every quote in evidence MUST be copied verbatim from the chapter text.",
    "- Do not invent entities; only reference names present in the canon lists.",
    "- Prefer fewer, higher-confidence deltas over many speculative ones.",
    "- If nothing changed, return { \"deltas\": [] }.",
  ].join("\n");
}

function entityCatalog(bundle: ProjectBundle): string {
  const lines: string[] = [];
  if (bundle.characters.length) {
    lines.push(`Characters: ${bundle.characters.map((c) => c.name || "(unnamed)").join(", ")}`);
  }
  if (bundle.locations.length) {
    lines.push(`Locations: ${bundle.locations.map((l) => l.name || "(unnamed)").join(", ")}`);
  }
  if (bundle.loreEntries.length) {
    lines.push(`Lore: ${bundle.loreEntries.map((l) => l.title || "(untitled)").join(", ")}`);
  }
  if (bundle.timeline.length) {
    lines.push(`Timeline: ${bundle.timeline.map((t) => t.label || "(unlabeled)").join(", ")}`);
  }
  return lines.join("\n") || "No tracked entities yet.";
}

export function buildChapterDeltaInput(bundle: ProjectBundle, chapterId: string): string {
  const chapter = bundle.chapters.find((item) => item.id === chapterId);
  if (!chapter) return "";

  const text = chapter.content
    .replace(/<br\s*\/?>(?=)/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();

  return [
    `Canon entities:`,
    entityCatalog(bundle),
    "",
    `Chapter ${chapter.number}: ${chapter.title || "(untitled)"}`,
    `Summary so far: ${chapter.summary || "(none)"}`,
    "",
    "Chapter text:",
    text || "(empty chapter)",
  ].join("\n");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === "string" && (allowed as string[]).includes(value) ? (value as T) : fallback;
}

function mapEvidence(value: unknown): EvidenceSpan[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): EvidenceSpan | null => {
      if (typeof item === "string") return { quote: item };
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const quote = asString(record.quote);
        if (!quote.trim()) return null;
        return { quote, note: asString(record.note) || undefined };
      }
      return null;
    })
    .filter((item): item is EvidenceSpan => item !== null);
}

/** Validate and normalize the model's JSON into typed delta proposals. */
export function mapChapterDeltaProposals(value: unknown): DeltaProposal[] {
  const container =
    value && typeof value === "object" && "deltas" in value
      ? (value as { deltas: unknown }).deltas
      : value;

  if (!Array.isArray(container)) {
    throw new Error("Expected a JSON object with a `deltas` array.");
  }

  return container
    .map((raw): DeltaProposal | null => {
      if (!raw || typeof raw !== "object") return null;
      const record = raw as Record<string, unknown>;
      const entityName = asString(record.entityName).trim();
      const after = asString(record.after).trim();
      if (!entityName || !after) return null;

      return {
        entityType: oneOf(record.entityType, ENTITY_TYPES, "character"),
        entityName,
        layer: oneOf(record.layer, LAYERS, "endState"),
        before: asString(record.before),
        after,
        confidence: oneOf(record.confidence, CONFIDENCES, "weak_inference"),
        rationale: asString(record.rationale),
        evidence: mapEvidence(record.evidence),
      };
    })
    .filter((item): item is DeltaProposal => item !== null);
}
