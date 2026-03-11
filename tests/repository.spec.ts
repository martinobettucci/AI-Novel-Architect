import { beforeEach, describe, expect, it } from "vitest";
import type { AppSettings } from "@/app/domain/models";
import {
  createChapterTrackerReport,
  createEntityHistoryEntry,
  DEFAULT_SETTINGS,
} from "@/app/domain/defaults";
import { resetDatabase } from "@/app/lib/db";
import {
  addChapter,
  addScene,
  buildGrammarSuggestions,
  buildMarketingArtifacts,
  buildPublishingArtifacts,
  checklistCompletion,
  computeChapterQualityScore,
  computeContinuityConflicts,
  createProjectFromInput,
  createRevisionIssue,
  createSnapshot,
  deleteChapter,
  deleteCharacterProfile,
  deleteProject,
  duplicateProject,
  exportProjectAsJson,
  exportProjectAsMarkdown,
  exportProjectBackup,
  getProjectBundle,
  getSettingsProfile,
  importProjectFromText,
  listProjects,
  resolveSettings,
  restoreSnapshot,
  saveAnnotation,
  saveCharacterProfile,
  saveChapter,
  saveChapterTrackerReport,
  saveChecklistItem,
  saveEntityHistoryEntry,
  saveEntityProgression,
  saveLocationProfile,
  saveLoreEntry,
  saveNarrativeRelationship,
  saveSettingsProfile,
  saveStoryBible,
  saveTimelineEvent,
  saveWritingGoal,
  toggleChecklistItem,
  updateProjectMeta,
  updateRevisionIssueStatus,
} from "@/app/lib/repository";

beforeEach(async () => {
  await resetDatabase();
});

describe("repository lifecycle", () => {
  it("creates and lists projects", async () => {
    const bundle = await createProjectFromInput({
      title: "Alpha",
      genre: "Fantasy",
      audience: "Adult",
      tone: "Epic",
      targetWordCount: 90000,
      language: "fr",
      synopsis: "Test",
      mode: "idea",
      chapterCount: 3,
    });

    expect(bundle.project.id).toBeTruthy();

    const projects = await listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].title).toBe("Alpha");
  });

  it("updates metadata and chapter content", async () => {
    const bundle = await createProjectFromInput({
      title: "Beta",
      genre: "Thriller",
      audience: "Adult",
      tone: "Dark",
      targetWordCount: 80000,
      language: "fr",
      synopsis: "Test",
      mode: "template",
      chapterCount: 2,
    });

    await updateProjectMeta(bundle.project.id, { title: "Beta 2" });

    const chapter = bundle.chapters[0];
    await saveChapter({ ...chapter, content: "hello world" });

    const refreshed = await getProjectBundle(bundle.project.id);
    expect(refreshed?.project.title).toBe("Beta 2");
    expect(refreshed?.chapters[0].wordCountCurrent).toBe(2);
  });

  it("adds chapters and scenes with ordering", async () => {
    const bundle = await createProjectFromInput({
      title: "Gamma",
      genre: "Sci-Fi",
      audience: "Adult",
      tone: "Tense",
      targetWordCount: 70000,
      language: "fr",
      synopsis: "Test",
      mode: "idea",
      chapterCount: 1,
    });

    await addChapter(bundle.project.id);
    const refreshed = await getProjectBundle(bundle.project.id);
    expect(refreshed?.chapters).toHaveLength(2);

    const chapterId = refreshed?.chapters[0].id;
    expect(chapterId).toBeTruthy();
    if (!chapterId) return;

    await addScene(bundle.project.id, chapterId);
    await addScene(bundle.project.id, chapterId);

    const withScenes = await getProjectBundle(bundle.project.id);
    const chapterScenes = withScenes?.scenes.filter((scene) => scene.chapterId === chapterId) ?? [];
    expect(chapterScenes).toHaveLength(2);
  });

  it("can start with an intentionally empty chapter structure", async () => {
    const bundle = await createProjectFromInput({
      title: "Empty Start",
      genre: "Drama",
      audience: "Adult",
      tone: "Measured",
      targetWordCount: 75000,
      language: "fr",
      synopsis: "No fake chapter shells",
      mode: "idea",
    });

    expect(bundle.chapters).toHaveLength(0);
  });

  it("manages characters, timeline, and bible", async () => {
    const bundle = await createProjectFromInput({
      title: "Delta",
      genre: "Romance",
      audience: "Adult",
      tone: "Warm",
      targetWordCount: 60000,
      language: "fr",
      synopsis: "Test",
      mode: "idea",
      chapterCount: 1,
    });

    await saveStoryBible({ ...bundle.bible, worldRules: "Rule 1" });

    const character = await saveCharacterProfile({
      id: "",
      projectId: bundle.project.id,
      name: "Lena",
      role: "protagonist",
      motivation: "Find truth",
      arc: "Growth",
      voice: "Calm",
      relationships: "Mentor",
      notes: "",
      updatedAt: new Date().toISOString(),
    });

    await saveTimelineEvent({
      id: "",
      projectId: bundle.project.id,
      order: 1,
      chapterId: bundle.chapters[0].id,
      label: "Inciting event",
      details: "Something happens",
      impact: "Major",
      updatedAt: new Date().toISOString(),
    });

    const refreshed = await getProjectBundle(bundle.project.id);
    expect(refreshed?.bible.worldRules).toContain("Rule");
    expect(refreshed?.characters[0].name).toBe("Lena");
    expect(refreshed?.timeline).toHaveLength(1);

    await deleteCharacterProfile(character.id);
    const afterDelete = await getProjectBundle(bundle.project.id);
    expect(afterDelete?.characters).toHaveLength(0);
  });

  it("tracks revision issues and checklists", async () => {
    const bundle = await createProjectFromInput({
      title: "Epsilon",
      genre: "Mystery",
      audience: "Adult",
      tone: "Tight",
      targetWordCount: 65000,
      language: "fr",
      synopsis: "Test",
      mode: "idea",
      chapterCount: 1,
    });

    const issue = await createRevisionIssue({
      projectId: bundle.project.id,
      chapterId: bundle.chapters[0].id,
      title: "Fix pacing",
      description: "Middle chapter slows down",
      severity: "high",
    });

    await updateRevisionIssueStatus(issue.id, "resolved");

    const firstChecklist = bundle.checklist[0];
    await toggleChecklistItem(firstChecklist.id, true);
    await saveChecklistItem({
      ...firstChecklist,
      id: "",
      title: "Custom gate",
      done: false,
    });

    const refreshed = await getProjectBundle(bundle.project.id);
    expect(refreshed?.revisionIssues[0].status).toBe("resolved");
    expect(checklistCompletion(refreshed?.checklist ?? [])).toBeGreaterThan(0);
  });

  it("creates and restores snapshots", async () => {
    const bundle = await createProjectFromInput({
      title: "Zeta",
      genre: "Fantasy",
      audience: "Adult",
      tone: "Epic",
      targetWordCount: 80000,
      language: "fr",
      synopsis: "Test",
      mode: "idea",
      chapterCount: 1,
    });

    const chapter = bundle.chapters[0];
    await saveChapter({ ...chapter, content: "Version 1" });

    const snapshot = await createSnapshot({
      projectId: bundle.project.id,
      chapterId: chapter.id,
      label: "Before rewrite",
      payload: "Version 1",
    });

    await saveChapter({ ...chapter, content: "Version 2" });
    await restoreSnapshot(snapshot.id);

    const refreshed = await getProjectBundle(bundle.project.id);
    expect(refreshed?.chapters[0].content).toContain("Version 1");
  });

  it("duplicates and deletes projects", async () => {
    const bundle = await createProjectFromInput({
      title: "Eta",
      genre: "Drama",
      audience: "Adult",
      tone: "Reflective",
      targetWordCount: 55000,
      language: "fr",
      synopsis: "Test",
      mode: "idea",
      chapterCount: 2,
    });

    const duplicated = await duplicateProject(bundle.project.id);
    expect(duplicated?.project.id).not.toBe(bundle.project.id);

    await deleteProject(bundle.project.id);
    const projects = await listProjects(true);
    expect(projects.some((project) => project.id === bundle.project.id)).toBe(false);
  });

  it("exports and imports formats", async () => {
    const bundle = await createProjectFromInput({
      title: "Theta",
      genre: "Horror",
      audience: "Adult",
      tone: "Dark",
      targetWordCount: 60000,
      language: "fr",
      synopsis: "Test",
      mode: "idea",
      chapterCount: 1,
    });

    const json = await exportProjectAsJson(bundle.project.id);
    const markdown = await exportProjectAsMarkdown(bundle.project.id);
    const backup = await exportProjectBackup(bundle.project.id);

    expect(json).toContain("Theta");
    expect(markdown).toContain("# Theta");
    expect(backup.size).toBeGreaterThan(0);

    const imported = await importProjectFromText({
      filename: "import.json",
      content: json,
    });
    expect(imported.project.id).not.toBe(bundle.project.id);

    const importedTxt = await importProjectFromText({
      filename: "draft.txt",
      content: "plain draft content",
    });
    expect(importedTxt.chapters).toHaveLength(1);
  });

  it("resolves scoped settings precedence", async () => {
    const bundle = await createProjectFromInput({
      title: "Iota",
      genre: "Fantasy",
      audience: "Adult",
      tone: "Epic",
      targetWordCount: 80000,
      language: "fr",
      synopsis: "Test",
      mode: "idea",
      chapterCount: 1,
    });

    await saveSettingsProfile("global", {
      locale: "en",
      uiLocale: "en",
      llm: { ...DEFAULT_SETTINGS.llm, model: "global-model" },
    });

    await saveSettingsProfile(
      "project",
      {
        llm: { ...DEFAULT_SETTINGS.llm, model: "project-model" },
      },
      bundle.project.id
    );

    await saveSettingsProfile(
      "feature",
      {
        prompts: {
          ...DEFAULT_SETTINGS.prompts,
          toneGuide: "Feature tone",
        },
      },
      bundle.project.id,
      "drafting"
    );

    const resolved = await resolveSettings(bundle.project.id, "drafting", {
      qa: {
        ...DEFAULT_SETTINGS.qa,
        rubricWeights: {
          structure: 30,
          character: 20,
          pacing: 30,
          style: 20,
        },
      },
    } as Partial<AppSettings>);

    expect(resolved.settings.locale).toBe("en");
    expect(resolved.settings.uiLocale).toBe("en");
    expect(resolved.settings.llm.model).toBe("project-model");
    expect(resolved.settings.prompts.toneGuide).toBe("Feature tone");
    expect(resolved.sourceOrder.at(-1)).toBe("run");

    const profile = await getSettingsProfile("feature", bundle.project.id, "drafting");
    expect(profile).not.toBeNull();
  });

  it("persists global settings across database resets", async () => {
    await saveSettingsProfile("global", {
      llm: {
        ...DEFAULT_SETTINGS.llm,
        model: "persistent-model",
      },
    });

    await resetDatabase();

    const resolved = await resolveSettings();
    expect(resolved.settings.llm.model).toBe("persistent-model");
  });

  it("merges partial settings updates within the same scope", async () => {
    await saveSettingsProfile("global", {
      llm: {
        ...DEFAULT_SETTINGS.llm,
        model: "merged-model",
      },
    });

    await saveSettingsProfile("global", {
      prompts: {
        ...DEFAULT_SETTINGS.prompts,
        toneGuide: "Merged tone",
      },
    });

    const resolved = await resolveSettings();
    expect(resolved.settings.llm.model).toBe("merged-model");
    expect(resolved.settings.prompts.toneGuide).toBe("Merged tone");
  });

  it("builds artifacts and continuity checks", async () => {
    const bundle = await createProjectFromInput({
      title: "Kappa",
      genre: "Sci-Fi",
      audience: "Adult",
      tone: "Hard",
      targetWordCount: 90000,
      language: "fr",
      synopsis: "A conflict in orbit.",
      mode: "idea",
      chapterCount: 1,
    });

    const chapter = bundle.chapters[0];
    await saveChapter({ ...chapter, content: "This is a chapter body." });

    await saveAnnotation({
      id: "",
      projectId: bundle.project.id,
      chapterId: chapter.id,
      quote: "A line",
      note: "Check this",
      tags: ["tone"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await saveWritingGoal({
      ...bundle.goal,
      dailyWords: 1200,
    });

    const refreshed = await getProjectBundle(bundle.project.id);
    if (!refreshed) {
      throw new Error("Expected project bundle");
    }

    const publishing = buildPublishingArtifacts(refreshed);
    const marketing = buildMarketingArtifacts(refreshed);

    expect(publishing.metadataSheet).toContain("Title:");
    expect(marketing.launchChecklist.length).toBeGreaterThan(0);

    const conflicts = computeContinuityConflicts(refreshed);
    expect(Array.isArray(conflicts)).toBe(true);

    const score = computeChapterQualityScore(refreshed.chapters[0], DEFAULT_SETTINGS.qa.rubricWeights);
    expect(score).toBeGreaterThan(0);

    expect(buildGrammarSuggestions("He was like really  very very fast").length).toBeGreaterThan(0);
  });

  it("treats empty rich-text markup as empty for scoring and grammar", async () => {
    const bundle = await createProjectFromInput({
      title: "Empty Rich Text",
      genre: "Drama",
      audience: "Adult",
      tone: "Quiet",
      targetWordCount: 70000,
      language: "fr",
      synopsis: "Markup normalization",
      mode: "idea",
      chapterCount: 1,
    });

    const chapter = bundle.chapters[0];
    await saveChapter({ ...chapter, content: "<p></p>" });
    const refreshed = await getProjectBundle(bundle.project.id);
    if (!refreshed) {
      throw new Error("Expected project bundle");
    }

    expect(refreshed.chapters[0].wordCountCurrent).toBe(0);
    expect(
      computeChapterQualityScore(refreshed.chapters[0], DEFAULT_SETTINGS.qa.rubricWeights)
    ).toBe(0);
    expect(buildGrammarSuggestions("<p></p>")).toEqual([]);
  });

  it("tracks canon relationships, per-entity history, and progression and removes chapter-bound entries on deletion", async () => {
    const bundle = await createProjectFromInput({
      title: "Canon Graph",
      genre: "Fantasy",
      audience: "Adult",
      tone: "Dark",
      targetWordCount: 90000,
      language: "fr",
      synopsis: "Graph test",
      mode: "idea",
      chapterCount: 1,
    });

    const character = await saveCharacterProfile({
      id: "",
      projectId: bundle.project.id,
      name: "Mira",
      role: "lead",
      motivation: "",
      arc: "",
      voice: "",
      relationships: "",
      notes: "",
      updatedAt: new Date().toISOString(),
    });

    const location = await saveLocationProfile({
      id: "",
      projectId: bundle.project.id,
      name: "Glass Harbor",
      role: "setting",
      narrativeStatus: "open",
      description: "",
      notes: "",
      updatedAt: new Date().toISOString(),
    });

    const lore = await saveLoreEntry({
      id: "",
      projectId: bundle.project.id,
      title: "Ash Treaty",
      category: "history",
      status: "active",
      description: "",
      notes: "",
      updatedAt: new Date().toISOString(),
    });

    const relationship = await saveNarrativeRelationship({
      id: "",
      projectId: bundle.project.id,
      sourceType: "character",
      sourceId: character.id,
      targetType: "location",
      targetId: location.id,
      relationType: "hides in",
      status: "fragile",
      intensity: 4,
      notes: "",
      updatedAt: new Date().toISOString(),
    });

    await saveEntityProgression({
      id: "",
      projectId: bundle.project.id,
      chapterId: bundle.chapters[0].id,
      sceneId: undefined,
      entityType: "lore",
      entityId: lore.id,
      label: lore.title,
      startState: "sealed",
      evidence: "The treaty is recited in chapter one.",
      proposedDelta: "becomes public",
      validatedDelta: "becomes public",
      endState: "public",
      knowledge: "Mira learns the terms",
      belief: "",
      inventory: "",
      narrationStatus: "revealed",
      confidence: "explicit",
      aiSuggestion: "",
      updatedAt: new Date().toISOString(),
    });

    await saveEntityHistoryEntry({
      ...createEntityHistoryEntry(bundle.project.id, bundle.chapters[0].id),
      entityType: "relationship",
      entityId: relationship.id,
      label: "Mira -> hides in -> Glass Harbor",
      note: "This chapter establishes the harbor as Mira's emergency refuge.",
    });

    const beforeDelete = await getProjectBundle(bundle.project.id);
    expect(beforeDelete?.relationships).toHaveLength(1);
    expect(beforeDelete?.entityProgression).toHaveLength(1);
    expect(beforeDelete?.entityHistory).toHaveLength(1);

    await deleteChapter(bundle.chapters[0].id);
    const afterDelete = await getProjectBundle(bundle.project.id);

    expect(afterDelete?.chapters).toHaveLength(0);
    expect(afterDelete?.relationships).toHaveLength(1);
    expect(afterDelete?.entityProgression).toHaveLength(0);
    expect(afterDelete?.entityHistory).toHaveLength(0);
  });

  it("stores per-chapter tracker reports and removes them when deleting the chapter", async () => {
    const bundle = await createProjectFromInput({
      title: "Trackers",
      genre: "Fantasy",
      audience: "Adult",
      tone: "Measured",
      targetWordCount: 70000,
      language: "fr",
      synopsis: "Test",
      mode: "idea",
      chapterCount: 1,
    });

    const chapter = bundle.chapters[0];
    const report = createChapterTrackerReport(bundle.project.id, chapter.id, "characters");
    await saveChapterTrackerReport({
      ...report,
      previousState: "Before the chapter, Mira hides the atlas.",
      chapterEvolution: "She tests it in public.",
      finalState: "She ends exposed and more confident.",
    });

    const beforeDelete = await getProjectBundle(bundle.project.id);
    expect(beforeDelete?.chapterTrackerReports).toHaveLength(1);
    expect(beforeDelete?.chapterTrackerReports[0].finalState).toContain("exposed");

    await deleteChapter(chapter.id);

    const afterDelete = await getProjectBundle(bundle.project.id);
    expect(afterDelete?.chapterTrackerReports).toHaveLength(0);
  });
});
