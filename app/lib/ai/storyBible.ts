import type { ProjectBundle, StoryBible } from "@/app/domain/models";

type StoryBibleSuggestionFields = Pick<
  StoryBible,
  "premise" | "themes" | "stakes" | "worldRules"
>;

type StoryBibleLabel = "Premise" | "Themes" | "Stakes" | "World rules";

function compactList(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(", ") || "none";
}

function normalizeValue(value: string): string {
  return value
    .trim()
    .replace(/^["']+/, "")
    .replace(/["']+$/, "");
}

/** Values a model emits when it has nothing to say; they must not replace canon. */
const PLACEHOLDER_VALUES = new Set([
  "none",
  "n/a",
  "na",
  "tbd",
  "todo",
  "unknown",
  "unspecified",
  "aucun",
  "aucune",
  "...",
  "…",
  "-",
]);

/**
 * Themes replace the author's curated list wholesale, so a degenerate answer is
 * worse than no answer. A theme may legitimately contain a comma, so comma
 * splitting is only used when the model kept everything on one line.
 */
function parseThemes(value: string): string[] {
  const parts = /[\n;]/.test(value) ? value.split(/[\n;]/) : value.split(",");
  return parts
    .map((theme) => normalizeValue(theme.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")))
    .filter((theme) => theme.length > 0 && !PLACEHOLDER_VALUES.has(theme.toLocaleLowerCase()));
}

export function buildStoryBibleSuggestionInput(bundle: ProjectBundle): string {
  const chapterSummaries = bundle.chapters
    .slice()
    .sort((a, b) => a.number - b.number)
    .slice(0, 8)
    .map((chapter) =>
      `${chapter.number}. ${chapter.title.trim() || "Untitled chapter"}: ${
        chapter.summary.trim() || "No summary yet"
      }`
    );

  return [
    `Project title: ${bundle.project.title || "Untitled project"}`,
    `Genre: ${bundle.project.genre || "unspecified"}`,
    `Audience: ${bundle.project.audience || "unspecified"}`,
    `Tone: ${bundle.project.tone || "unspecified"}`,
    `Synopsis: ${bundle.project.synopsis || "none"}`,
    `Existing premise: ${bundle.bible.premise || "none"}`,
    `Existing themes: ${compactList(bundle.bible.themes)}`,
    `Existing stakes: ${bundle.bible.stakes || "none"}`,
    `Existing world rules: ${bundle.bible.worldRules || "none"}`,
    `Characters: ${compactList(bundle.characters.map((character) => character.name))}`,
    `Locations: ${compactList(bundle.locations.map((location) => location.name))}`,
    chapterSummaries.length > 0
      ? `Chapter summaries:\n${chapterSummaries.join("\n")}`
      : "Chapter summaries: none",
  ].join("\n\n");
}

export function buildStoryBibleSuggestionContext(): string {
  return [
    "Write or refine the project's core story bible.",
    "Return plain text using exactly this template. Keep the field labels exactly as written and write all values in the requested response language:",
    "Story Bible",
    "Premise: ...",
    "Themes: theme1, theme2, theme3",
    "Stakes: ...",
    "World rules: ...",
    "Requirements:",
    "- Fill all four fields.",
    "- Themes must stay on one comma-separated line.",
    "- Premise, Stakes, and World rules should be concrete and story-specific.",
    "- Do not add commentary before or after the template.",
  ].join("\n");
}

export function parseStoryBibleSuggestion(text: string): Partial<StoryBibleSuggestionFields> {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const pattern =
    /(?:^|\n)\s*(?:\*\*)?\s*(Premise|Themes|Stakes|World rules)\s*:(?:\*\*)?\s*/gi;
  const matches = Array.from(normalized.matchAll(pattern));

  if (matches.length === 0) {
    return {};
  }

  const values: Partial<Record<StoryBibleLabel, string>> = {};

  matches.forEach((match, index) => {
    const label = match[1] as StoryBibleLabel;
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = index < matches.length - 1 ? matches[index + 1].index ?? normalized.length : normalized.length;
    values[label] = normalizeValue(normalized.slice(contentStart, contentEnd));
  });

  const parsed: Partial<StoryBibleSuggestionFields> = {};

  if (values.Premise) {
    parsed.premise = values.Premise;
  }

  if (values.Themes) {
    const themes = parseThemes(values.Themes);
    // Skip the field entirely when nothing usable is left: `Themes: none` must
    // not overwrite a curated theme list with `["none"]`.
    if (themes.length > 0) {
      parsed.themes = themes;
    }
  }

  if (values.Stakes) {
    parsed.stakes = values.Stakes;
  }

  if (values["World rules"]) {
    parsed.worldRules = values["World rules"];
  }

  return parsed;
}
