import { describe, expect, it } from "vitest";
import {
  createEntityProgression,
  createChapter,
  createDefaultChecklist,
  createEntityHistoryEntry,
  createLocationProfile,
  createLoreEntry,
  createNarrativeRelationship,
  createProject,
  createStoryBible,
  createWritingGoal,
  DEFAULT_SETTINGS,
} from "@/app/domain/defaults";

describe("domain defaults", () => {
  it("builds a project with required defaults", () => {
    const project = createProject({
      title: "Demo",
      genre: "Fantasy",
      audience: "Adult",
      tone: "Epic",
      targetWordCount: 90000,
      language: "fr",
      synopsis: "A hero rises.",
    });

    expect(project.id).toMatch(/^project-/);
    expect(project.status).toBe("active");
    expect(project.targetWordCount).toBe(90000);
  });

  it("enforces minimum target word count", () => {
    const project = createProject({
      title: "Tiny",
      genre: "Flash",
      audience: "Adult",
      tone: "Minimal",
      targetWordCount: 100,
      language: "en",
      synopsis: "Short form.",
    });

    expect(project.targetWordCount).toBe(1000);
  });

  it("creates chapter, bible, and goals", () => {
    const chapter = createChapter("project-1", 2, "Custom");
    const bible = createStoryBible("project-1");
    const goal = createWritingGoal("project-1");

    expect(chapter.number).toBe(2);
    expect(chapter.title).toBe("Custom");
    expect(bible.projectId).toBe("project-1");
    expect(goal.dailyWords).toBeGreaterThan(0);
  });

  it("creates blank structural records without fake content", () => {
    const chapter = createChapter("project-2", 1);
    const location = createLocationProfile("project-2");
    const lore = createLoreEntry("project-2");
    const relationship = createNarrativeRelationship("project-2");
    const progression = createEntityProgression("project-2");
    const history = createEntityHistoryEntry("project-2", "chapter-1");

    expect(chapter.title).toBe("");
    expect(location.name).toBe("");
    expect(lore.title).toBe("");
    expect(relationship.relationType).toBe("");
    expect(progression.label).toBe("");
    expect(progression.confidence).toBe("explicit");
    expect(history.entityId).toBe("");
    expect(history.chapterId).toBe("chapter-1");
  });

  it("creates checklist items and global defaults", () => {
    const checklist = createDefaultChecklist("project-2");
    expect(checklist.length).toBeGreaterThanOrEqual(6);
    expect(DEFAULT_SETTINGS.prompts.safetyMode).toBe("preview");
  });
});
