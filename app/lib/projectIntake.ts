import type { Locale } from "@/app/domain/models";
import {
  asFiniteNumber,
  asRecord,
  asString,
  createJsonResponseFormat,
  parseStructuredJson,
} from "@/app/lib/ai/structuredOutput";

export type CreateMode = "idea" | "outline" | "template";

export type StarterTemplateId = "three-act" | "investigation" | "relationship";

export const CREATE_MODE_COPY: Record<
  CreateMode,
  {
    eyebrow: string;
    title: string;
    body: string;
    note: string;
    outcome: string;
  }
> = {
  idea: {
    eyebrow: "Blank brief",
    title: "Start from an idea",
    body: "Creates a clean workspace with only your project metadata. No chapter scaffolding is added unless you ask for it.",
    note: "Best when you want to discover the story inside the workspace instead of inheriting a structure first.",
    outcome: "Creates a blank manuscript room, blank story bible, and optional empty chapter shells.",
  },
  outline: {
    eyebrow: "Outline import",
    title: "Start from an outline",
    body: "Turns each outline line into a chapter shell so the workspace opens with a readable chapter board.",
    note: "Best when you already know the major beats and want to draft against a rough table of contents.",
    outcome: "Creates chapter shells from your outline and keeps the rest of the project editable.",
  },
  template: {
    eyebrow: "Starter pack",
    title: "Start from a real template",
    body: "Adds a distinct starter structure, seeded chapter beats, and story-bible guidance before you enter the workspace.",
    note: "Best when you want momentum, visible structure, and a clearer difference between the available starting paths.",
    outcome: "Creates a prefilled starter pack with template-specific chapters, pacing targets, and canon prompts.",
  },
};

export const PROJECT_FIELD_HELP = {
  title: {
    label: "Title",
    help: "Working title shown on the project shelf. Change it later without affecting the manuscript data.",
    hint: "Visible on cards and exports.",
  },
  genre: {
    label: "Genre",
    help: "Used in planning prompts, marketing artifacts, and project shelf scanning. You can add multiple genre tags.",
    hint: "Search, select, or type your own genres.",
  },
  audience: {
    label: "Audience",
    help: "Reader bracket that helps AI and export tools stay aligned with expectations and language. You can add multiple audience tags.",
    hint: "Add one or more reader targets.",
  },
  tone: {
    label: "Tone",
    help: "Narrative feel reused by AI actions and cover/marketing generators. You can add multiple tonal references.",
    hint: "Blend tones when the book needs it.",
  },
  targetWords: {
    label: "Target words",
    help: "Sets the manuscript scale and helps seed chapter-level word targets.",
    hint: "Used for pacing and goals.",
  },
  initialChapterCount: {
    label: "Initial chapter shells",
    help: "How many chapter cards should exist on day one. Outline mode derives these from outline lines; template mode uses starter beats.",
    hint: "0 keeps non-template starts blank.",
  },
  synopsis: {
    label: "Synopsis",
    help: "Short story brief used by planning, project cards, and AI context builders.",
    hint: "Two to six sentences is enough.",
  },
  outlineText: {
    label: "Outline text",
    help: "One line per chapter or beat. The creator turns each line into a starter chapter shell.",
    hint: "One line = one chapter shell.",
  },
} as const;

export const GENRE_SUGGESTIONS = [
  "Fantasy",
  "Epic Fantasy",
  "Urban Fantasy",
  "Romance",
  "Romantasy",
  "Thriller",
  "Psychological Thriller",
  "Mystery",
  "Crime",
  "Horror",
  "Gothic",
  "Science Fiction",
  "Space Opera",
  "Dystopian",
  "Historical Fiction",
  "Literary Fiction",
  "Adventure",
  "Young Adult",
  "Contemporary",
  "Drama",
];

export const AUDIENCE_SUGGESTIONS = [
  "Adult",
  "New Adult",
  "Young Adult",
  "Teen",
  "Middle Grade",
  "Crossover",
  "Book Club",
  "Commercial",
  "Genre Readers",
  "Romance Readers",
  "Thriller Readers",
  "Fantasy Readers",
];

export const TONE_SUGGESTIONS = [
  "Tense",
  "Suspenseful",
  "Propulsive",
  "Dark",
  "Intimate",
  "Warm",
  "Hopeful",
  "Lyrical",
  "Witty",
  "Melancholic",
  "Atmospheric",
  "Brutal",
  "Reflective",
  "Playful",
  "Elegant",
  "Cinematic",
  "Uneasy",
  "Romantic",
];

export interface StarterTemplateChapterBlueprint {
  title: string;
  summary: string;
  objectives: string[];
  hook: string;
  notes: string;
}

export interface StarterTemplateDefinition {
  id: StarterTemplateId;
  eyebrow: string;
  label: string;
  summary: string;
  bestFor: string;
  note: string;
  recommendedGenre: string;
  recommendedAudience: string;
  recommendedTone: string;
  recommendedWordCount: number;
  recommendedChapterCount: number;
  whatYouGet: string[];
  starterPremise: string;
  starterThemes: string[];
  starterStakes: string;
  starterWorldRules: string;
  chapterBlueprints: StarterTemplateChapterBlueprint[];
}

export const STARTER_TEMPLATES: StarterTemplateDefinition[] = [
  {
    id: "three-act",
    eyebrow: "General novel",
    label: "Three-act runway",
    summary: "Balanced commercial arc with setup, midpoint reversal, crisis, and payoff already mapped.",
    bestFor: "Fantasy, sci-fi, adventure, thriller, and broad commercial fiction.",
    note: "Seeds 12 chapter beats, a midpoint turn, and a clean climax runway.",
    recommendedGenre: "Fantasy",
    recommendedAudience: "Adult",
    recommendedTone: "Propulsive",
    recommendedWordCount: 85000,
    recommendedChapterCount: 12,
    whatYouGet: [
      "12 chapter shells with escalating act beats",
      "Starter story-bible prompts for premise, stakes, and rules",
      "Even chapter word targets sized to the manuscript goal",
    ],
    starterPremise:
      "A protagonist is forced out of equilibrium, pays an escalating cost, and must change before the final confrontation can be won.",
    starterThemes: ["identity under pressure", "cost of power", "trust versus control"],
    starterStakes:
      "If the protagonist fails, they lose both the visible objective and the life or relationships that gave the fight meaning.",
    starterWorldRules:
      "Define what power, institutions, technology, or social rules govern the conflict and what real cost is paid when those rules are bent.",
    chapterBlueprints: [
      {
        title: "Ordinary World Fractures",
        summary: "Introduce the protagonist, the current status quo, and the early pressure that signals this life cannot hold.",
        objectives: ["Anchor the baseline world", "Expose the first pressure point"],
        hook: "Something small but undeniable breaks the illusion of normal.",
        notes: "Keep the promise of genre visible from page one.",
      },
      {
        title: "Point of No Return",
        summary: "A forcing event pushes the protagonist into the story problem and removes the easy way back.",
        objectives: ["Commit the protagonist", "Clarify the immediate objective"],
        hook: "The safest option disappears.",
        notes: "The decision can be active or forced, but it must close a door.",
      },
      {
        title: "New Rules, First Friction",
        summary: "Show the protagonist adjusting badly to the new arena while learning the first rules of the conflict.",
        objectives: ["Reveal new constraints", "Trigger early resistance"],
        hook: "The protagonist discovers the arena is harsher than expected.",
        notes: "A mentor, rival, or ally can frame the new rules here.",
      },
      {
        title: "First Counterattack",
        summary: "The protagonist attempts a solution and meets the story's first meaningful pushback.",
        objectives: ["Test a tactic", "Expose the opposing force"],
        hook: "The first plan fails more loudly than expected.",
        notes: "This beat should widen the story rather than stall it.",
      },
      {
        title: "False Control",
        summary: "A short stretch of apparent progress convinces the protagonist they understand the problem.",
        objectives: ["Deliver momentum", "Set up the reversal"],
        hook: "A victory feels real enough to trust.",
        notes: "Let the reader enjoy the rise so the turn hits harder.",
      },
      {
        title: "Midpoint Revelation",
        summary: "New information changes the true shape of the conflict and forces a sharper objective.",
        objectives: ["Reframe the conflict", "Raise the stakes"],
        hook: "The story the protagonist thought they were in is not the real story.",
        notes: "This is the structural hinge of the template.",
      },
      {
        title: "Fallout and Regroup",
        summary: "Characters absorb the midpoint blow and adjust alliances, plans, and emotional posture.",
        objectives: ["Process the reversal", "Choose a harder path"],
        hook: "Recovery costs more than expected.",
        notes: "Good place to deepen relationships and fear.",
      },
      {
        title: "Pressure Tightens",
        summary: "The opposing force narrows the protagonist's options and attacks vulnerable points.",
        objectives: ["Escalate danger", "Strip away easy support"],
        hook: "The antagonist starts winning on the protagonist's own ground.",
        notes: "This beat should feel more personal than earlier setbacks.",
      },
      {
        title: "All Is Lost",
        summary: "The protagonist suffers the story's emotional or strategic collapse and appears unable to continue.",
        objectives: ["Break the old self", "Force interior reckoning"],
        hook: "The thing worth protecting seems gone.",
        notes: "Do not rush through the loss; let it register.",
      },
      {
        title: "Recommitment",
        summary: "A clarified purpose or sacrifice decision creates the final plan and the transformed version of the protagonist.",
        objectives: ["Define the final strategy", "Show the internal shift"],
        hook: "The protagonist chooses the cost instead of merely enduring it.",
        notes: "This beat earns the climax emotionally.",
      },
      {
        title: "Endgame Assault",
        summary: "The final confrontation tests the protagonist's new approach against the strongest resistance.",
        objectives: ["Deliver climax", "Resolve the external objective"],
        hook: "The final move can succeed only if the change is real.",
        notes: "Make the chapter choice-driven, not accidental.",
      },
      {
        title: "Aftermath and New Balance",
        summary: "Resolve the surviving consequences and show the transformed state of the story world.",
        objectives: ["Cash out the cost", "Show the new equilibrium"],
        hook: "What remains is not what existed at the start.",
        notes: "A quiet ending still needs a visible shift.",
      },
    ],
  },
  {
    id: "investigation",
    eyebrow: "Mystery and thriller",
    label: "Investigation caseboard",
    summary: "Evidence-first scaffold for crimes, conspiracies, false leads, and late-stage reveal pressure.",
    bestFor: "Mystery, crime, investigative thrillers, conspiracies, procedural hybrids.",
    note: "Seeds 10 case-driven chapter beats, suspect logic, and clue discipline.",
    recommendedGenre: "Thriller",
    recommendedAudience: "Adult",
    recommendedTone: "Suspenseful",
    recommendedWordCount: 78000,
    recommendedChapterCount: 10,
    whatYouGet: [
      "10 investigation beats from inciting case to reveal",
      "Built-in space for suspects, false leads, and reversals",
      "Story-bible prompts aimed at clue logic and information control",
    ],
    starterPremise:
      "A destabilizing event demands investigation, but each answer deepens the danger and reveals that the visible case is not the real problem.",
    starterThemes: ["truth versus narrative", "obsession", "institutional rot"],
    starterStakes:
      "If the truth stays buried, another victim, a successful cover-up, or a public collapse makes the damage irreversible.",
    starterWorldRules:
      "Track who knows what, when they learned it, what evidence exists, and what access limits keep the case from resolving too early.",
    chapterBlueprints: [
      {
        title: "Disturbance or Crime",
        summary: "Open with the incident that creates the case and commits the protagonist emotionally or professionally.",
        objectives: ["Trigger the investigation", "Define the immediate question"],
        hook: "The first clue points in a direction that should be impossible.",
        notes: "The opening should promise pace and uncertainty immediately.",
      },
      {
        title: "First Evidence Pass",
        summary: "Gather surface facts, witness claims, and the first contradictions in the official story.",
        objectives: ["Map the scene", "Expose early friction with the truth"],
        hook: "The clean explanation collapses under one overlooked detail.",
        notes: "Use contrast between what is said and what is observed.",
      },
      {
        title: "Suspect Map Opens",
        summary: "Expand the case into competing suspects, motives, and pressure from outside forces.",
        objectives: ["Widen the field", "Show conflicting agendas"],
        hook: "A new suspect creates a more dangerous version of the case.",
        notes: "Give each suspect a plausible reason and a blind spot.",
      },
      {
        title: "False Lead Gains Weight",
        summary: "A persuasive theory pulls the investigation off-center while seeming rational to everyone involved.",
        objectives: ["Create confidence", "Set up misdirection"],
        hook: "The best-looking answer is the wrong one.",
        notes: "The false lead should teach the reader something true anyway.",
      },
      {
        title: "Hidden Motive Surfaces",
        summary: "Private relationships, money, fear, or institutional incentives complicate the suspect picture.",
        objectives: ["Deepen motive", "Raise personal risk"],
        hook: "Someone close to the case has been lying for survival, not just guilt.",
        notes: "This beat is good for emotional entanglement and cost.",
      },
      {
        title: "Midcase Reversal",
        summary: "A major reveal changes the case logic and shows the original framing was incomplete or manipulated.",
        objectives: ["Reframe the investigation", "Sharpen the real threat"],
        hook: "The case is suddenly bigger, smaller, or more personal than it first appeared.",
        notes: "This is the midpoint turn. It must change the investigation strategy.",
      },
      {
        title: "The Net Turns Inward",
        summary: "The protagonist becomes vulnerable to suspicion, retaliation, or institutional pressure.",
        objectives: ["Personalize the cost", "Reduce safe options"],
        hook: "Solving the case now threatens the investigator directly.",
        notes: "This is where the story stops being professional and becomes personal.",
      },
      {
        title: "Break in the Pattern",
        summary: "A buried connection or pattern break creates the final line of reasoning needed to solve the case.",
        objectives: ["Find the missing logic", "Build the final move"],
        hook: "A detail everyone ignored becomes the key that relinks the whole board.",
        notes: "The insight must feel earned from earlier evidence.",
      },
      {
        title: "Reveal and Confrontation",
        summary: "The protagonist forces the truth into the open and confronts the person or system responsible.",
        objectives: ["Deliver the reveal", "Resolve the visible case"],
        hook: "The culprit is dangerous precisely because the reveal cornered them.",
        notes: "Whether public or intimate, the confrontation needs pressure and consequence.",
      },
      {
        title: "Consequence and Cleanup",
        summary: "Show what the solved case changed, what damage remains, and what truth cost everyone involved.",
        objectives: ["Resolve fallout", "Leave an aftertaste or scar"],
        hook: "The truth solves the case without restoring innocence.",
        notes: "Mysteries benefit from an ending with residue, not total reset.",
      },
    ],
  },
  {
    id: "relationship",
    eyebrow: "Character driven",
    label: "Two-heart arc",
    summary: "Emotion-first scaffold for romance, relational drama, and dual-change character stories.",
    bestFor: "Romance, drama, book-club fiction, emotional fantasy, relationship-forward stories.",
    note: "Seeds 12 emotional movement beats from first collision to earned repair.",
    recommendedGenre: "Romance",
    recommendedAudience: "Adult",
    recommendedTone: "Intimate",
    recommendedWordCount: 82000,
    recommendedChapterCount: 12,
    whatYouGet: [
      "12 relationship beats across attraction, rupture, and repair",
      "Template prompts for emotional stakes and recurring wounds",
      "A chapter path that tracks internal change as much as plot",
    ],
    starterPremise:
      "Two people who want connection must confront the private fear, history, or belief that keeps intimacy from lasting.",
    starterThemes: ["vulnerability", "self-worth", "trust through action"],
    starterStakes:
      "If the characters do not change, they lose the relationship they want and repeat the wound that shaped them.",
    starterWorldRules:
      "Clarify the emotional boundaries, external obligations, and social or practical barriers that prevent instant resolution.",
    chapterBlueprints: [
      {
        title: "Separate Equilibrium",
        summary: "Introduce each lead in the life pattern or wound that connection is about to disrupt.",
        objectives: ["Show the private lack", "Define the emotional baseline"],
        hook: "The life that looks stable already contains a crack.",
        notes: "Let readers see the need before the characters can name it.",
      },
      {
        title: "Charged First Encounter",
        summary: "Bring the leads together in a way that produces spark, discomfort, or fascination immediately.",
        objectives: ["Create chemistry", "Set the first tension"],
        hook: "The connection is obvious, but the timing or conditions are wrong.",
        notes: "This beat can be soft, sharp, or chaotic, but it must register.",
      },
      {
        title: "Friction and Attraction",
        summary: "The leads collide over values, goals, or self-protection while attraction grows anyway.",
        objectives: ["Build conflict", "Make interest undeniable"],
        hook: "Every reason to stay apart makes them notice each other more.",
        notes: "Keep both external and emotional stakes alive.",
      },
      {
        title: "Forced Proximity",
        summary: "Circumstances keep the leads in each other's orbit long enough for pattern and intimacy to form.",
        objectives: ["Increase contact", "Expose habits and defenses"],
        hook: "Distance is no longer the easy answer.",
        notes: "Shared work, danger, obligation, or family pressure fits well here.",
      },
      {
        title: "First Emotional Crack",
        summary: "One lead lets something real slip, creating the first meaningful breach in their defenses.",
        objectives: ["Earn empathy", "Move beyond surface banter"],
        hook: "A brief moment of honesty changes the emotional temperature.",
        notes: "This chapter often creates a favorite scene if handled with restraint.",
      },
      {
        title: "Shared Vulnerability",
        summary: "The leads experience mutual honesty or mutual need that starts to reframe the relationship.",
        objectives: ["Deepen trust", "Create earned closeness"],
        hook: "The relationship stops feeling hypothetical.",
        notes: "Physical intimacy can fit here, but emotional exposure matters more.",
      },
      {
        title: "Bond Deepens",
        summary: "The connection becomes visible in choices, not just feelings, and outside pressure reacts to it.",
        objectives: ["Show change in behavior", "Raise the cost of caring"],
        hook: "Protecting the other person now matters more than convenience.",
        notes: "This is where the relationship begins altering the world around it.",
      },
      {
        title: "Fear Resurfaces",
        summary: "Old wounds, social pressure, or misread signals reawaken the defense mechanisms that intimacy triggered.",
        objectives: ["Stress the bond", "Foreshadow rupture"],
        hook: "The closer they get, the more dangerous honesty feels.",
        notes: "The fear should be specific to each lead, not generic drama.",
      },
      {
        title: "Rupture",
        summary: "The relationship breaks under pressure, misunderstanding, or a choice one or both leads cannot absorb yet.",
        objectives: ["Deliver the emotional break", "Expose the core wound"],
        hook: "The thing they most feared becomes true, or seems true.",
        notes: "The rupture must feel tragic but understandable.",
      },
      {
        title: "Separation and Self-Confrontation",
        summary: "Each lead faces the private pattern that helped create the break and decides whether change is possible.",
        objectives: ["Force interior reckoning", "Prepare repair"],
        hook: "Without the relationship, the old self looks unbearable.",
        notes: "This is a transformation chapter, not filler distance.",
      },
      {
        title: "Repair Attempt",
        summary: "One or both leads make a concrete attempt to repair the damage with changed behavior, not just apology.",
        objectives: ["Test the new self", "Risk rejection honestly"],
        hook: "Reconnection requires proof, not only desire.",
        notes: "Give the repair scene enough difficulty to feel earned.",
      },
      {
        title: "Chosen Future",
        summary: "Resolve the relationship into a believable next state and show how love changed the characters' lives.",
        objectives: ["Pay off the emotional arc", "Show the new pattern"],
        hook: "The final choice proves the characters are no longer defending the old wound.",
        notes: "A quiet ending still needs a visible commitment.",
      },
    ],
  },
];

export function getDefaultStarterTemplate(): StarterTemplateDefinition {
  return STARTER_TEMPLATES[0];
}

export function isStarterTemplateId(value: string): value is StarterTemplateId {
  return STARTER_TEMPLATES.some((template) => template.id === value);
}

export function getStarterTemplate(
  id?: StarterTemplateId | string | null
): StarterTemplateDefinition | null {
  if (!id) return null;
  return STARTER_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function computeChapterWordTarget(totalWords: number, chapterCount: number): number {
  const safeTarget = Math.max(1000, totalWords);
  const safeCount = Math.max(1, chapterCount);
  return Math.max(800, Math.round(safeTarget / safeCount / 100) * 100);
}

export interface ProjectSetupSuggestion {
  createMode: CreateMode;
  templateId: StarterTemplateId | null;
  title: string;
  genre: string;
  audience: string;
  tone: string;
  targetWords: number | null;
  initialChapterCount: number | null;
  synopsis: string;
  rationale: string;
}

export const PROJECT_SETUP_RESPONSE_FORMAT = createJsonResponseFormat(
  "project_setup",
  {
    type: "object",
    additionalProperties: false,
    properties: {
      createMode: {
        type: "string",
        enum: ["idea", "outline", "template"],
      },
      templateId: {
        type: ["string", "null"],
        enum: ["three-act", "investigation", "relationship", null],
      },
      title: { type: "string", maxLength: 160 },
      genre: { type: "string", maxLength: 160 },
      audience: { type: "string", maxLength: 160 },
      tone: { type: "string", maxLength: 160 },
      targetWords: { type: "integer" },
      initialChapterCount: { type: "integer" },
      synopsis: { type: "string", maxLength: 900 },
      rationale: { type: "string", maxLength: 500 },
    },
    required: [
      "createMode",
      "templateId",
      "title",
      "genre",
      "audience",
      "tone",
      "targetWords",
      "initialChapterCount",
      "synopsis",
      "rationale",
    ],
  }
);

function cleanSingleLine(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function dedupeValues(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const cleaned = cleanSingleLine(value.replace(/^[,;/\s]+|[,;/\s]+$/g, ""));
    if (!cleaned) return;

    const key = cleaned.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(cleaned);
  });

  return result;
}

export function splitMultiValueField(input: string): string[] {
  return dedupeValues(input.split(/[,\n;]+/g));
}

export function joinMultiValueField(values: string[]): string {
  return dedupeValues(values).join(", ");
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractLabelValue(text: string, label: string): string {
  const match = text.match(new RegExp(`^${escapeRegExp(label)}:\\s*(.*)$`, "mi"));
  return cleanSingleLine(match?.[1] ?? "");
}

function parseIntegerValue(input: string): number | null {
  const digits = input.match(/\d[\d,]*/)?.[0];
  if (!digits) return null;
  const value = Number(digits.replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

export function buildProjectSetupSuggestionContext(): string {
  const templateLines = STARTER_TEMPLATES.map(
    (template) =>
      `- ${template.id}: ${template.label}. ${template.summary} Recommended ${template.recommendedChapterCount} chapters around ${template.recommendedWordCount.toLocaleString()} words. Best for ${template.bestFor}`
  ).join("\n");

  return [
    "You are helping configure a new novel project intake form.",
    "Available start modes:",
    "- idea: blank workspace, blank story bible, optional empty chapter shells.",
    "- outline: outline lines become chapter shells.",
    "- template: choose a starter template with prefilled chapter beats and story-bible prompts.",
    "Available template ids:",
    templateLines,
    "When a JSON schema is provided, return JSON matching it exactly. Otherwise return exactly these labels, one per line:",
    "Recommended Start Mode:",
    "Template Id:",
    "Title:",
    "Genre:",
    "Audience:",
    "Tone:",
    "Target Words:",
    "Initial Chapters:",
    "Synopsis:",
    "Rationale:",
    "Rules:",
    "- Recommended Start Mode must be idea, outline, or template.",
    "- Template Id must be three-act, investigation, relationship, or none.",
    "- Keep every value on one line only.",
    "- Target Words and Initial Chapters must be integers only.",
    "- Synopsis should be concise and usable as a project brief.",
    "- Rationale should explain the recommendation in one or two sentences.",
  ].join("\n");
}

export function buildProjectSetupSuggestionInput(params: {
  locale: Locale;
  createMode: CreateMode;
  title: string;
  genre: string;
  audience: string;
  tone: string;
  targetWords: number;
  initialChapterCount: number;
  synopsis: string;
  outlineText: string;
  selectedTemplate: StarterTemplateDefinition | null;
}): string {
  return [
    `UI locale: ${params.locale}`,
    `Current start mode: ${params.createMode}`,
    `Current template: ${params.selectedTemplate?.id ?? "none"}`,
    `Working title: ${params.title || "none"}`,
    `Genre: ${params.genre || "none"}`,
    `Audience: ${params.audience || "none"}`,
    `Tone: ${params.tone || "none"}`,
    `Target words: ${params.targetWords}`,
    `Initial chapters: ${params.initialChapterCount}`,
    "Synopsis / idea:",
    params.synopsis || "none",
    "Outline draft:",
    params.outlineText || "none",
    "Task:",
    "Recommend the best start mode and a stronger project setup for this manuscript intake.",
  ].join("\n\n");
}

export function parseProjectSetupSuggestion(text: string): ProjectSetupSuggestion {
  const json = asRecord(parseStructuredJson(text));
  if (json) {
    const rawMode = asString(json.createMode);
    const rawTemplateId = asString(json.templateId);
    const createMode: CreateMode =
      rawMode === "outline" || rawMode === "template" ? rawMode : "idea";
    const templateId = isStarterTemplateId(rawTemplateId) ? rawTemplateId : null;

    return {
      createMode,
      templateId,
      title: asString(json.title),
      genre: asString(json.genre),
      audience: asString(json.audience),
      tone: asString(json.tone),
      targetWords: asFiniteNumber(json.targetWords),
      initialChapterCount: asFiniteNumber(json.initialChapterCount),
      synopsis: asString(json.synopsis),
      rationale: asString(json.rationale),
    };
  }

  const rawMode = extractLabelValue(text, "Recommended Start Mode").toLowerCase();
  const rawTemplateId = extractLabelValue(text, "Template Id").toLowerCase();

  const createMode: CreateMode =
    rawMode === "outline" || rawMode === "template" ? rawMode : "idea";

  const templateId =
    rawTemplateId === "none"
      ? null
      : isStarterTemplateId(rawTemplateId)
        ? rawTemplateId
        : null;

  return {
    createMode,
    templateId,
    title: extractLabelValue(text, "Title"),
    genre: extractLabelValue(text, "Genre"),
    audience: extractLabelValue(text, "Audience"),
    tone: extractLabelValue(text, "Tone"),
    targetWords: parseIntegerValue(extractLabelValue(text, "Target Words")),
    initialChapterCount: parseIntegerValue(extractLabelValue(text, "Initial Chapters")),
    synopsis: extractLabelValue(text, "Synopsis"),
    rationale: extractLabelValue(text, "Rationale"),
  };
}
