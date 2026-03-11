import type { AiActionType } from "@/app/domain/models";

export interface AiRunRequest {
  action: AiActionType;
  locale: "fr" | "en";
  input: string;
  context?: string;
  styleProfile?: string;
  systemPrompt?: string;
  toneGuide?: string;
}

function localeName(locale: "fr" | "en"): string {
  return locale === "fr" ? "French" : "English";
}

const ACTION_DIRECTIVES: Record<AiActionType, string> = {
  brainstorm: "Generate fresh story ideas with concrete options and consequences.",
  expand: "Expand the passage with richer sensory detail and stronger narrative momentum.",
  rewrite: "Rewrite the passage for clarity and impact while preserving intent.",
  summarize: "Summarize the passage in concise bullet points.",
  continue: "Continue the passage naturally with coherent voice and pacing.",
  dialogue_polish: "Polish dialogue to sound natural, distinct, and conflict-driven.",
  plan_audit: "Audit the project structure and return prioritized findings.",
  consistency_check: "Check consistency across character, timeline, and world details.",
  revision_pass: "Perform a developmental + line-edit revision pass with clear rationale.",
  grammar_suggestions: "Provide actionable grammar and style corrections.",
  style_transform: "Transform the passage into the target ghostwriter style.",
  marketing_copy: "Generate marketing copy tailored to target readers.",
  publish_artifact: "Generate publishing-ready artifact text.",
};

export function buildSystemPrompt(req: AiRunRequest): string {
  const language = localeName(req.locale);
  const localeInstruction = `Write the response body in ${language} unless explicitly asked otherwise.`;
  const templateInstruction =
    "If the prompt includes a fixed template or field labels, preserve those labels exactly as provided and write only the field values/content in the requested language.";

  const styleInstruction = req.styleProfile
    ? `Style profile: ${req.styleProfile}`
    : "";

  return [
    req.systemPrompt ??
      "You are an expert writing and editing assistant for long-form fiction.",
    localeInstruction,
    templateInstruction,
    `Tone guide: ${req.toneGuide ?? "Precise, constructive, and practical."}`,
    styleInstruction,
    `Action directive: ${ACTION_DIRECTIVES[req.action]}`,
    "Return plain text only, no markdown code fences.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildUserPrompt(req: AiRunRequest): string {
  const language = localeName(req.locale);

  return [
    `Action: ${req.action}`,
    req.context ? `Context:\n${req.context}` : "",
    "Input:",
    req.input,
    "Output requirements:",
    "- Keep key facts consistent.",
    "- Be explicit and practical.",
    `- Write all generated content in ${language}.`,
    "- No placeholders.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
