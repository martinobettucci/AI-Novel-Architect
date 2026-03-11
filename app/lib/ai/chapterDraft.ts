import type { ProjectBundle } from "@/app/domain/models";
import { ASSISTANTS, buildAssistantInput } from "@/app/lib/ai/assistants";

function compactList(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(", ") || "none";
}

const chapterDraftAssistant =
  ASSISTANTS.find((assistant) => assistant.id === "ghostwriter") ?? ASSISTANTS[0];

export function buildChapterDraftInput(bundle: ProjectBundle, chapterId: string): string {
  const chapter = bundle.chapters.find((item) => item.id === chapterId);
  if (!chapter) {
    return "";
  }

  const previousChapter = bundle.chapters
    .filter((item) => item.number < chapter.number)
    .slice()
    .sort((a, b) => b.number - a.number)[0];
  const nextChapter = bundle.chapters
    .filter((item) => item.number > chapter.number)
    .slice()
    .sort((a, b) => a.number - b.number)[0];
  const scenes = bundle.scenes
    .filter((scene) => scene.chapterId === chapter.id)
    .slice()
    .sort((a, b) => a.order - b.order);

  return [
    buildAssistantInput(chapterDraftAssistant, bundle, chapterId),
    previousChapter
      ? `Immediate previous chapter: ${previousChapter.number}. ${
          previousChapter.title || "Untitled chapter"
        } | summary=${previousChapter.summary || "none"} | hook=${
          previousChapter.hook || "none"
        } | final draft=${previousChapter.content || "none"}`
      : "Immediate previous chapter: none",
    nextChapter
      ? `Immediate next chapter target: ${nextChapter.number}. ${
          nextChapter.title || "Untitled chapter"
        } | summary=${nextChapter.summary || "none"} | hook=${nextChapter.hook || "none"}`
      : "Immediate next chapter target: none",
    scenes.length > 0
      ? `Selected chapter scene plan:\n${scenes
          .map((scene) =>
            [
              `${scene.order}. ${scene.title.trim() || "Untitled scene"}`,
              `location=${scene.location || "none"}`,
              `characters=${compactList(scene.characters)}`,
              `description=${scene.description || "none"}`,
              `notes=${scene.notes || "none"}`,
              `draft seed=${scene.draftText || "none"}`,
            ].join(" | ")
          )
          .join("\n")}`
      : "Selected chapter scene plan: none",
    `Drafting objective: Write the full prose draft for chapter ${chapter.number}.`,
    `Target word count: ${chapter.wordCountTarget || bundle.goal.chapterWords || "unspecified"}`,
    `Current chapter draft: ${chapter.content || "none"}`,
  ].join("\n\n");
}

export function buildChapterDraftContext(): string {
  return [
    "Draft the selected chapter as manuscript prose.",
    "Use the story bible, selected chapter details, scene cards, story-wide characters, locations, lore, timeline, relationships, per-entity chapter history, entity progression, and computed chapter trackers as hard constraints.",
    "Story-wide registries are baseline canon. Per-entity chapter history is the chapter-by-chapter timeline layer that governs when an entity becomes active, changes state, or becomes unavailable.",
    "Respect the selected chapter's objectives, hook, story-so-far state, and downstream continuity targets.",
    "If scene cards exist, use them as the chapter spine and keep their order unless the canon strongly requires a cleaner transition.",
    "Keep continuity with previous chapters and avoid introducing facts that break later chapter targets.",
    "Return only the chapter prose in plain text.",
    "Requirements:",
    "- Write full narrative prose, not an outline or notes.",
    "- Do not add headings, labels, explanations, or markdown.",
    "- Preserve established character voice, lore rules, relationships, and timeline logic.",
    "- Make the chapter feel complete enough to revise manually in the editor immediately after insertion.",
  ].join("\n");
}
