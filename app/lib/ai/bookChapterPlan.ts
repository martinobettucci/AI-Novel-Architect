import type { ProjectBundle } from "@/app/domain/models";
import {
  asFiniteNumber,
  asRecord,
  asRecordArray,
  asString,
  asStringArray,
  createJsonResponseFormat,
  parseStructuredJson,
} from "@/app/lib/ai/structuredOutput";

export const BOOK_PLAN_RESEARCH_SOURCES = [
  {
    title: "The Snowflake Method",
    author: "Randy Ingermanson",
    url: "https://www.advancedfictionwriting.com/articles/snowflake-method/",
    application:
      "Three escalating disasters near the quarter marks, followed by the ending.",
  },
  {
    title: "Writing the Perfect Scene",
    author: "Randy Ingermanson",
    url: "https://www.advancedfictionwriting.com/articles/writing-the-perfect-scene/",
    application:
      "Causal Scene and Sequel chains: Goal, Conflict, Disaster, then Reaction, Dilemma, Decision.",
  },
  {
    title: "Modelling Suspense as Uncertainty Reduction",
    author: "David Wilmot and Frank Keller",
    url: "https://arxiv.org/abs/2004.14905",
    application:
      "Suspense is managed through changing forward uncertainty, not an early information dump.",
  },
] as const;

export interface ChapterArchitectureSlot {
  chapterNumber: number;
  phase:
    | "Story promise"
    | "First disaster"
    | "Progressive complications"
    | "Midpoint reversal"
    | "Escalation"
    | "Crisis"
    | "Climax"
    | "Resolution";
  purpose: string;
  scenePattern: string;
  revealPolicy: string;
  tensionTarget: number;
}

export interface BookChapterPlanStrategy {
  centralDramaticQuestion: string;
  endingPromise: string;
  escalationLogic: string;
  revealCadence: string;
}

export interface BookChapterPlanChapter {
  chapterNumber: number;
  title: string;
  summary: string;
  objectives: string[];
  hook: string;
  storySoFar: string;
  notes: string;
  wordCountTarget: number;
  decisiveTurn: string;
  revealStep: string;
  openLoop: string;
  tensionLevel: number;
  architecture: ChapterArchitectureSlot;
}

export interface BookChapterPlanSuggestion {
  strategy: BookChapterPlanStrategy;
  chapters: BookChapterPlanChapter[];
}

function clampChapterNumber(value: number, totalChapters: number): number {
  return Math.max(1, Math.min(totalChapters, value));
}

function quarterChapter(totalChapters: number, ratio: number): number {
  return clampChapterNumber(Math.round(totalChapters * ratio), totalChapters);
}

export function buildChapterArchitectureGrid(
  totalChapters: number
): ChapterArchitectureSlot[] {
  if (!Number.isInteger(totalChapters) || totalChapters < 1) {
    return [];
  }

  const firstDisaster = quarterChapter(totalChapters, 0.25);
  const midpoint = quarterChapter(totalChapters, 0.5);
  const crisis = quarterChapter(totalChapters, 0.75);
  const climax = totalChapters >= 3 ? totalChapters - 1 : totalChapters;

  return Array.from({ length: totalChapters }, (_, index) => {
    const chapterNumber = index + 1;
    const progress = chapterNumber / totalChapters;

    if (chapterNumber === totalChapters) {
      return {
        chapterNumber,
        phase: "Resolution",
        purpose:
          totalChapters === 1
            ? "Deliver a compressed complete arc: disturbance, costly choice, climax, and aftermath."
            : totalChapters === 2
              ? "Deliver the decisive confrontation, pay off the central question, and show its immediate consequences."
            : "Show the consequences of the climax and close the central dramatic question.",
        scenePattern:
          totalChapters === 1
            ? "Goal -> Conflict -> Disaster -> Reaction -> Decision -> Climax -> Aftermath"
            : totalChapters === 2
              ? "Scene: Goal -> maximal Conflict -> Climax, then immediate Aftermath"
            : "Sequel: Reaction -> Dilemma -> Decision -> Aftermath",
        revealPolicy:
          "Pay off the central question through consequence. Leave only deliberate sequel-scale uncertainty.",
        tensionTarget: totalChapters <= 2 ? 5 : 2,
      };
    }

    if (chapterNumber === climax) {
      return {
        chapterNumber,
        phase: "Climax",
        purpose:
          climax === crisis
            ? "Turn the third disaster directly into the protagonist's irreversible climactic action."
            : "Force the protagonist's irreversible action and pay off the converging causal threads.",
        scenePattern: "Scene: Goal -> maximal Conflict -> decisive Outcome",
        revealPolicy:
          "Resolve the central uncertainty through action rather than an explanatory information dump.",
        tensionTarget: 5,
      };
    }

    if (chapterNumber === crisis) {
      return {
        chapterNumber,
        phase: "Crisis",
        purpose:
          "Deliver the third disaster: prior choices create the worst credible position before the climax.",
        scenePattern: "Scene: Goal -> Conflict -> Disaster",
        revealPolicy:
          "Converge major clues and expose most of the truth, but withhold the protagonist's decisive outcome.",
        tensionTarget: 5,
      };
    }

    if (chapterNumber === firstDisaster) {
      return {
        chapterNumber,
        phase: "First disaster",
        purpose:
          "Break the initial equilibrium and force commitment to the story's central conflict.",
        scenePattern: "Scene: Goal -> Conflict -> Disaster",
        revealPolicy:
          "Reveal the threat and consequences, not the complete mechanism, culprit, or solution.",
        tensionTarget: 4,
      };
    }

    if (chapterNumber === midpoint) {
      return {
        chapterNumber,
        phase: "Midpoint reversal",
        purpose:
          "Deliver the second disaster or reversal and change the protagonist's understanding or strategy.",
        scenePattern: "Scene: Goal -> Conflict -> Disaster, followed by a new Decision",
        revealPolicy:
          "Answer one important secondary question, recontextualize earlier evidence, and open a costlier question.",
        tensionTarget: 4,
      };
    }

    if (progress < 0.25) {
      return {
        chapterNumber,
        phase: "Story promise",
        purpose:
          "Establish desire, pressure, and the central dramatic question with concrete forward motion.",
        scenePattern:
          chapterNumber % 2 === 0
            ? "Sequel: Reaction -> Dilemma -> Decision"
            : "Scene: Goal -> Conflict -> Setback",
        revealPolicy:
          "Plant a clue and sharpen the question. Do not provide the central causal answer.",
        tensionTarget: Math.min(3, 1 + chapterNumber),
      };
    }

    if (progress < 0.5) {
      return {
        chapterNumber,
        phase: "Progressive complications",
        purpose:
          "Make the protagonist's response cause a harder obstacle and narrow the available choices.",
        scenePattern:
          chapterNumber % 2 === 0
            ? "Sequel: Reaction -> Dilemma -> Decision"
            : "Scene: Goal -> Conflict -> Disaster",
        revealPolicy:
          "Offer a partial clue with at least two plausible interpretations; preserve forward uncertainty.",
        tensionTarget: 3,
      };
    }

    if (progress < 0.75) {
      return {
        chapterNumber,
        phase: "Escalation",
        purpose:
          "Turn the midpoint knowledge into riskier action and make each success carry a new cost.",
        scenePattern:
          chapterNumber % 2 === 0
            ? "Scene: Goal -> Conflict -> Disaster"
            : "Sequel: Reaction -> Dilemma -> Decision",
        revealPolicy:
          "Confirm part of the mechanism while making the remaining uncertainty more dangerous and specific.",
        tensionTarget: 4,
      };
    }

    return {
      chapterNumber,
      phase: "Crisis",
      purpose:
        "Collapse escape routes, converge causal threads, and prepare the irreversible final choice.",
      scenePattern:
        chapterNumber % 2 === 0
          ? "Sequel: Reaction -> Dilemma -> Decision"
          : "Scene: Goal -> Conflict -> Disaster",
      revealPolicy:
        "Reveal enough truth to make the final choice meaningful, but reserve the decisive payoff for the climax.",
      tensionTarget: 5,
    };
  });
}

function oneLine(value: string, maxLength = 420): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized || "none";
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function compactList(values: string[], maxItems = 12): string {
  const items = values.map((value) => oneLine(value, 180)).filter((value) => value !== "none");
  return items.slice(0, maxItems).join(" | ") || "none";
}

function namedEntity(
  name: string,
  fields: Array<string | undefined>
): string {
  return `${oneLine(name, 100)}: ${fields.map((field) => oneLine(field ?? "", 220)).join(" | ")}`;
}

export function buildBookChapterPlanInput(bundle: ProjectBundle): string {
  const chapters = bundle.chapters.slice().sort((a, b) => a.number - b.number);
  const architecture = buildChapterArchitectureGrid(chapters.length);
  const chapterNumbers = new Map(chapters.map((chapter) => [chapter.id, chapter.number]));
  const entityNames = new Map<string, string>([
    ...bundle.characters.map((item) => [item.id, item.name] as const),
    ...bundle.locations.map((item) => [item.id, item.name] as const),
    ...bundle.loreEntries.map((item) => [item.id, item.title] as const),
    ...bundle.timeline.map((item) => [item.id, item.label] as const),
  ]);

  const chapterRows = chapters.map((chapter) => {
    const scenes = bundle.scenes
      .filter((scene) => scene.chapterId === chapter.id)
      .sort((a, b) => a.order - b.order)
      .map(
        (scene) =>
          `${scene.order}. ${oneLine(scene.title, 100)}: ${oneLine(scene.description, 240)}`
      );

    return [
      `Chapter ${chapter.number} [${chapter.aiLocked ? "AI LOCKED" : "editable"}]`,
      `title=${oneLine(chapter.title, 140)}`,
      `summary=${oneLine(chapter.summary, 520)}`,
      `objectives=${compactList(chapter.objectives, 6)}`,
      `hook=${oneLine(chapter.hook, 320)}`,
      `storySoFar=${oneLine(chapter.storySoFar, 520)}`,
      `notes=${oneLine(chapter.notes, 320)}`,
      `targetWords=${chapter.wordCountTarget}`,
      `draftWords=${chapter.wordCountCurrent}`,
      `draftExcerpt=${oneLine(stripHtml(chapter.content), 900)}`,
      `scenes=${compactList(scenes, 8)}`,
    ].join(" | ");
  });

  const architectureRows = architecture.map(
    (slot) =>
      `Chapter ${slot.chapterNumber}: phase=${slot.phase} | purpose=${slot.purpose} | pattern=${slot.scenePattern} | reveal gate=${slot.revealPolicy} | tension target=${slot.tensionTarget}/5`
  );

  const relationshipRows = bundle.relationships.map((relationship) => {
    const source = entityNames.get(relationship.sourceId) ?? relationship.sourceId;
    const target = entityNames.get(relationship.targetId) ?? relationship.targetId;
    return `${oneLine(source, 100)} -> ${oneLine(
      relationship.relationType,
      100
    )} -> ${oneLine(target, 100)} | status=${oneLine(
      relationship.status,
      100
    )} | notes=${oneLine(relationship.notes, 220)}`;
  });

  const timelineRows = bundle.timeline
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(
      (event) =>
        `${event.order}. ${oneLine(event.label, 120)} | chapter=${
          event.chapterId ? chapterNumbers.get(event.chapterId) ?? "unassigned" : "unassigned"
        } | details=${oneLine(event.details, 260)} | impact=${oneLine(event.impact, 180)}`
    );

  return [
    `Response language: ${bundle.project.language}`,
    `Project title: ${oneLine(bundle.project.title, 180)}`,
    `Genre: ${oneLine(bundle.project.genre, 120)}`,
    `Audience: ${oneLine(bundle.project.audience, 120)}`,
    `Tone: ${oneLine(bundle.project.tone, 160)}`,
    `Target manuscript word count: ${bundle.project.targetWordCount}`,
    `Synopsis: ${oneLine(bundle.project.synopsis, 1200)}`,
    `Manuscript premise: ${oneLine(bundle.manuscript.premise, 900)}`,
    `Story Bible premise: ${oneLine(bundle.bible.premise, 900)}`,
    `Themes: ${compactList(bundle.bible.themes)}`,
    `Stakes: ${oneLine(bundle.bible.stakes, 900)}`,
    `World rules: ${oneLine(bundle.bible.worldRules, 1200)}`,
    `Writing goal per chapter: ${bundle.goal.chapterWords}`,
    `Characters:\n${compactList(
      bundle.characters.map((item) =>
        namedEntity(item.name, [item.role, item.motivation, item.arc, item.relationships, item.notes])
      ),
      30
    )}`,
    `Locations:\n${compactList(
      bundle.locations.map((item) =>
        namedEntity(item.name, [item.role, item.narrativeStatus, item.description, item.notes])
      ),
      30
    )}`,
    `Lore:\n${compactList(
      bundle.loreEntries.map((item) =>
        namedEntity(item.title, [item.category, item.status, item.description, item.notes])
      ),
      30
    )}`,
    `Relationships:\n${compactList(relationshipRows, 40)}`,
    `Timeline:\n${compactList(timelineRows, 40)}`,
    `Existing chapters and anchors:\n${chapterRows.join("\n") || "none"}`,
    `Mandatory chapter architecture grid:\n${architectureRows.join("\n") || "none"}`,
  ].join("\n\n");
}

const RESEARCH_BASIS_LINES = [
  `- Randy Ingermanson, Snowflake Method (${BOOK_PLAN_RESEARCH_SOURCES[0].url}): place three escalating disasters near the quarter marks and an ending after them; later disasters should result from the protagonist's attempts to fix earlier ones.`,
  `- Randy Ingermanson, Scene/Sequel (${BOOK_PLAN_RESEARCH_SOURCES[1].url}): chain Goal -> Conflict -> Disaster with Reaction -> Dilemma -> Decision so each outcome causes the next chapter's goal.`,
  `- Wilmot and Keller, suspense as uncertainty reduction (${BOOK_PLAN_RESEARCH_SOURCES[2].url}): manage forward uncertainty progressively; do not replace suspense with an early explanation of the whole intrigue.`,
] as const;

const NARRATIVE_CONSTRAINT_LINES = [
  "- Preserve the central dramatic question until the late climax. Early chapters may plant evidence, consequences, suspicions, and competing explanations, but may not disclose the complete causal answer.",
  "- Each chapter must change the story state. Its decisive turn must cause or constrain the next chapter.",
  "- Later disasters must grow from protagonist decisions, not unrelated accidents.",
  "- The midpoint must answer or overturn one meaningful question while opening a more costly uncertainty.",
  "- The climax must pay off planted information through irreversible action. The final chapter must show consequences and close the principal loop.",
  "- storySoFar contains only knowledge available before that chapter begins. It must never spoil its own chapter or a later chapter.",
  "- hook is the chapter-ending propulsion point, not a generic mood sentence.",
  "- Keep subplots staggered. Do not introduce, explain, and resolve every thread in the same early chapter.",
  "- Treat existing drafted content as canon. Do not contradict it or rewrite chapter prose.",
  "- For every AI LOCKED chapter, copy all existing chapter fields exactly and build the surrounding architecture around that immutable anchor.",
  "- Distribute word-count targets across all chapters so their total stays close to the manuscript target, allowing longer turning-point and climax chapters where justified.",
] as const;

const OUTPUT_CONSTRAINT_LINES = [
  "- Return JSON matching the provided schema exactly, with one unique entry for every chapter number.",
  "- Write all reader-facing string values in the requested response language.",
  "- Do not mention these methods or sources inside chapter prose fields.",
] as const;

export function buildBookChapterPlanContext(totalChapters: number): string {
  return [
    `Create a complete, causally connected architecture for exactly ${totalChapters} chapters.`,
    "Use the mandatory chapter architecture grid supplied in the input. It is an algorithmic constraint, not optional inspiration.",
    "Research basis and operational use:",
    ...RESEARCH_BASIS_LINES,
    "Narrative constraints:",
    ...NARRATIVE_CONSTRAINT_LINES,
    "Output constraints:",
    ...OUTPUT_CONSTRAINT_LINES,
  ].join("\n");
}

export type BookPlanMethodId =
  | "snowflake"
  | "scene-sequel"
  | "suspense-uncertainty";

export interface BookPlanMethod {
  id: BookPlanMethodId;
  title: string;
  author: string;
  url: string;
  /** Short, reader-facing application line reused by the UI. */
  summary: string;
  /** Label for the specialist agent that leads with this method. */
  role: string;
  /** Method-specific emphasis injected into the specialist agent's context. */
  lens: string[];
  /** What the synthesis agent should harvest from this method's candidate. */
  contribution: string;
}

export const BOOK_PLAN_METHODS: readonly BookPlanMethod[] = [
  {
    id: "snowflake",
    title: BOOK_PLAN_RESEARCH_SOURCES[0].title,
    author: BOOK_PLAN_RESEARCH_SOURCES[0].author,
    url: BOOK_PLAN_RESEARCH_SOURCES[0].url,
    summary: BOOK_PLAN_RESEARCH_SOURCES[0].application,
    role: "Macro escalation architect",
    lens: [
      "Optimize primarily for the Snowflake Method's escalating-disaster macrostructure.",
      "Place three escalating disasters near the quarter marks and the ending after the third one, anchored to the supplied grid (First disaster, Midpoint reversal, Crisis, Climax).",
      "Make every later disaster the direct consequence of the protagonist's attempt to repair an earlier one, and capture that chain in strategy.escalationLogic and each chapter's decisiveTurn.",
      "Set strategy.endingPromise so the climax pays off the central dramatic question through irreversible action.",
    ],
    contribution:
      "the macro escalation shape, disaster placement, and ending promise",
  },
  {
    id: "scene-sequel",
    title: BOOK_PLAN_RESEARCH_SOURCES[1].title,
    author: BOOK_PLAN_RESEARCH_SOURCES[1].author,
    url: BOOK_PLAN_RESEARCH_SOURCES[1].url,
    summary: BOOK_PLAN_RESEARCH_SOURCES[1].application,
    role: "Causal scene-chain engineer",
    lens: [
      "Optimize primarily for Ingermanson's Scene and Sequel causal chaining.",
      "For each chapter, drive a Scene (Goal -> Conflict -> Disaster) or a Sequel (Reaction -> Dilemma -> Decision) consistent with the grid's scenePattern.",
      "Guarantee an unbroken causal handoff: each chapter's decisiveTurn and hook must create the next chapter's goal, and openLoop must name the question it forwards.",
      "Write objectives as concrete, scene-level goals rather than thematic statements.",
    ],
    contribution:
      "the per-chapter Goal/Conflict/Disaster and Reaction/Dilemma/Decision causal handoffs",
  },
  {
    id: "suspense-uncertainty",
    title: BOOK_PLAN_RESEARCH_SOURCES[2].title,
    author: BOOK_PLAN_RESEARCH_SOURCES[2].author,
    url: BOOK_PLAN_RESEARCH_SOURCES[2].url,
    summary: BOOK_PLAN_RESEARCH_SOURCES[2].application,
    role: "Reveal-cadence and tension strategist",
    lens: [
      "Optimize primarily for Wilmot and Keller's model of suspense as forward-uncertainty management.",
      "Shape strategy.revealCadence and each chapter's revealStep so information is disclosed progressively; never resolve the central causal answer before the late climax.",
      "Make tensionLevel a deliberate curve that rises into disasters and the climax instead of a flat or random sequence.",
      "Use storySoFar strictly as pre-chapter knowledge so no chapter spoils itself or a later reveal.",
    ],
    contribution:
      "the reveal cadence, tension curve, and storySoFar gating",
  },
] as const;

export function getBookPlanMethod(
  id: BookPlanMethodId
): BookPlanMethod | undefined {
  return BOOK_PLAN_METHODS.find((method) => method.id === id);
}

export interface BookChapterPlanMergeCandidate {
  method: BookPlanMethod;
  planJson: string;
}

/**
 * Context for one specialist agent that leads with a single narrative method
 * while keeping the companion methods coherent. Each specialist returns a full,
 * schema-valid plan so it can stand alone or feed the synthesis agent.
 */
export function buildBookChapterPlanMethodContext(
  totalChapters: number,
  methodId: BookPlanMethodId
): string {
  const method = getBookPlanMethod(methodId);
  if (!method) return buildBookChapterPlanContext(totalChapters);

  const companionLines = RESEARCH_BASIS_LINES.filter(
    (line) => !line.includes(method.url)
  );

  return [
    `You are the "${method.role}" agent in a multi-method planning team. Create a complete, causally connected architecture for exactly ${totalChapters} chapters.`,
    "Use the mandatory chapter architecture grid supplied in the input. It is an algorithmic constraint, not optional inspiration.",
    `Primary method — ${method.title} by ${method.author} (${method.url}):`,
    ...method.lens.map((line) => `- ${line}`),
    "Keep these companion methods coherent even while your assigned method leads:",
    ...companionLines,
    "Narrative constraints:",
    ...NARRATIVE_CONSTRAINT_LINES,
    "Output constraints:",
    ...OUTPUT_CONSTRAINT_LINES,
    "Produce your strongest standalone plan; a separate synthesis agent may merge it with sibling plans.",
  ].join("\n");
}

/**
 * Context for the synthesis agent that reconciles the specialist candidates
 * into one superior plan instead of averaging them.
 */
export function buildBookChapterPlanMergeContext(
  totalChapters: number,
  methodIds: readonly BookPlanMethodId[]
): string {
  const methods = methodIds
    .map((id) => getBookPlanMethod(id))
    .filter((method): method is BookPlanMethod => Boolean(method));

  return [
    `You are the synthesis agent. ${methods.length} specialist agents each produced a full ${totalChapters}-chapter plan. Merge them into one superior, causally connected architecture for exactly ${totalChapters} chapters.`,
    "Use the mandatory chapter architecture grid supplied in the input. It is an algorithmic constraint, not optional inspiration.",
    "Take the strongest contribution from each specialist and reconcile every conflict toward the most coherent causal chain:",
    ...methods.map(
      (method) => `- ${method.title} (${method.role}): keep ${method.contribution}.`
    ),
    "Do not average the candidates. Choose the best decisive turns, reveals, and tension beats, then make them consistent from the first chapter to the last.",
    "Research basis and operational use:",
    ...RESEARCH_BASIS_LINES,
    "Narrative constraints:",
    ...NARRATIVE_CONSTRAINT_LINES,
    "Output constraints:",
    ...OUTPUT_CONSTRAINT_LINES,
  ].join("\n");
}

/**
 * Appends the specialist candidate plans to the shared planning input so the
 * synthesis agent can merge them against the same project context.
 */
export function buildBookChapterPlanMergeInput(
  baseInput: string,
  candidates: readonly BookChapterPlanMergeCandidate[]
): string {
  const blocks = candidates.map((candidate, index) =>
    [
      `Candidate ${index + 1} — ${candidate.method.title} (${candidate.method.role}):`,
      candidate.planJson.trim(),
    ].join("\n")
  );

  return [
    baseInput,
    `Specialist candidate plans to merge (${candidates.length}):`,
    blocks.join("\n\n"),
  ].join("\n\n");
}

export function createBookChapterPlanResponseFormat(totalChapters: number) {
  const chapterCount = Math.max(1, Math.floor(totalChapters));

  return createJsonResponseFormat(`book_chapter_plan_${chapterCount}`, {
    type: "object",
    additionalProperties: false,
    properties: {
      strategy: {
        type: "object",
        additionalProperties: false,
        properties: {
          centralDramaticQuestion: { type: "string", maxLength: 500 },
          endingPromise: { type: "string", maxLength: 500 },
          escalationLogic: { type: "string", maxLength: 800 },
          revealCadence: { type: "string", maxLength: 800 },
        },
        required: [
          "centralDramaticQuestion",
          "endingPromise",
          "escalationLogic",
          "revealCadence",
        ],
      },
      chapters: {
        type: "array",
        minItems: chapterCount,
        maxItems: chapterCount,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            chapterNumber: {
              type: "integer",
              minimum: 1,
              maximum: chapterCount,
            },
            title: { type: "string", maxLength: 160 },
            summary: { type: "string", maxLength: 900 },
            objectives: {
              type: "array",
              minItems: 0,
              maxItems: 5,
              items: { type: "string", maxLength: 240 },
            },
            hook: { type: "string", maxLength: 500 },
            storySoFar: { type: "string", maxLength: 1200 },
            notes: { type: "string", maxLength: 700 },
            wordCountTarget: {
              type: "integer",
              minimum: 500,
              maximum: 20000,
            },
            decisiveTurn: { type: "string", maxLength: 500 },
            revealStep: { type: "string", maxLength: 500 },
            openLoop: { type: "string", maxLength: 500 },
            tensionLevel: {
              type: "integer",
              minimum: 1,
              maximum: 5,
            },
          },
          required: [
            "chapterNumber",
            "title",
            "summary",
            "objectives",
            "hook",
            "storySoFar",
            "notes",
            "wordCountTarget",
            "decisiveTurn",
            "revealStep",
            "openLoop",
            "tensionLevel",
          ],
        },
      },
    },
    required: ["strategy", "chapters"],
  });
}

function requiredString(record: Record<string, unknown>, key: string): string | null {
  const value = asString(record[key]);
  return value || null;
}

export function parseBookChapterPlanSuggestion(
  text: string,
  totalChapters: number,
  lockedChapterNumbers: ReadonlySet<number> = new Set()
): BookChapterPlanSuggestion | null {
  if (!Number.isInteger(totalChapters) || totalChapters < 1) return null;

  const root = asRecord(parseStructuredJson(text));
  const strategyRecord = asRecord(root?.strategy);
  if (!root || !strategyRecord) return null;

  const centralDramaticQuestion = requiredString(
    strategyRecord,
    "centralDramaticQuestion"
  );
  const endingPromise = requiredString(strategyRecord, "endingPromise");
  const escalationLogic = requiredString(strategyRecord, "escalationLogic");
  const revealCadence = requiredString(strategyRecord, "revealCadence");
  if (
    !centralDramaticQuestion ||
    !endingPromise ||
    !escalationLogic ||
    !revealCadence
  ) {
    return null;
  }

  const rawChapters = asRecordArray(root.chapters);
  if (rawChapters.length !== totalChapters) return null;

  const architecture = buildChapterArchitectureGrid(totalChapters);
  const chapters: BookChapterPlanChapter[] = [];
  const seen = new Set<number>();

  for (const record of rawChapters) {
    const chapterNumberValue = asFiniteNumber(record.chapterNumber);
    const wordCountTargetValue = asFiniteNumber(record.wordCountTarget);
    const tensionLevelValue = asFiniteNumber(record.tensionLevel);
    const objectives = asStringArray(record.objectives).slice(0, 5);
    const title = requiredString(record, "title");
    const summary = requiredString(record, "summary");
    const hook = requiredString(record, "hook");
    const storySoFar = requiredString(record, "storySoFar");
    const decisiveTurn = requiredString(record, "decisiveTurn");
    const revealStep = requiredString(record, "revealStep");
    const openLoop = requiredString(record, "openLoop");
    const isLocked =
      chapterNumberValue != null && lockedChapterNumbers.has(chapterNumberValue);

    if (
      chapterNumberValue == null ||
      !Number.isInteger(chapterNumberValue) ||
      chapterNumberValue < 1 ||
      chapterNumberValue > totalChapters ||
      seen.has(chapterNumberValue) ||
      wordCountTargetValue == null ||
      !Number.isInteger(wordCountTargetValue) ||
      wordCountTargetValue < 500 ||
      wordCountTargetValue > 20000 ||
      tensionLevelValue == null ||
      !Number.isInteger(tensionLevelValue) ||
      tensionLevelValue < 1 ||
      tensionLevelValue > 5 ||
      (!isLocked && objectives.length < 2) ||
      (!isLocked && !title) ||
      (!isLocked && !summary) ||
      (!isLocked && !hook) ||
      (!isLocked && !storySoFar) ||
      !decisiveTurn ||
      !revealStep ||
      !openLoop
    ) {
      return null;
    }

    seen.add(chapterNumberValue);
    chapters.push({
      chapterNumber: chapterNumberValue,
      title: title ?? "",
      summary: summary ?? "",
      objectives,
      hook: hook ?? "",
      storySoFar: storySoFar ?? "",
      notes: asString(record.notes),
      wordCountTarget: wordCountTargetValue,
      decisiveTurn,
      revealStep,
      openLoop,
      tensionLevel: tensionLevelValue,
      architecture: architecture[chapterNumberValue - 1],
    });
  }

  if (seen.size !== totalChapters) return null;

  return {
    strategy: {
      centralDramaticQuestion,
      endingPromise,
      escalationLogic,
      revealCadence,
    },
    chapters: chapters.sort((a, b) => a.chapterNumber - b.chapterNumber),
  };
}
