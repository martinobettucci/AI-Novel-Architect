import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/app/lib/db";
import { useProjectStore } from "@/app/stores/projectStore";

describe("project store", () => {
  beforeEach(async () => {
    await resetDatabase();
    useProjectStore.setState({
      projects: [],
      activeProject: null,
      loading: false,
      error: null,
    });
  });

  it("creates and opens project", async () => {
    const bundle = await useProjectStore.getState().createProject({
      title: "Store Project",
      genre: "Fantasy",
      audience: "Adult",
      tone: "Epic",
      targetWordCount: 90000,
      language: "fr",
      synopsis: "Store test",
      mode: "idea",
      chapterCount: 2,
    });

    expect(bundle.project.id).toBeTruthy();
    await useProjectStore.getState().openProject(bundle.project.id);
    expect(useProjectStore.getState().activeProject?.project.title).toBe("Store Project");
  });

  it("imports and exports project content", async () => {
    const bundle = await useProjectStore.getState().createProject({
      title: "Store Import",
      genre: "Drama",
      audience: "Adult",
      tone: "Warm",
      targetWordCount: 70000,
      language: "fr",
      synopsis: "Import test",
      mode: "idea",
      chapterCount: 1,
    });

    await useProjectStore.getState().openProject(bundle.project.id);
    const json = await useProjectStore.getState().exportActiveProjectJson();

    expect(json).toContain("Store Import");

    const imported = await useProjectStore.getState().importProjectFile("copy.json", json!);
    expect(imported.project.id).not.toBe(bundle.project.id);
  });

  it("updates chapter data through store actions", async () => {
    const bundle = await useProjectStore.getState().createProject({
      title: "Store Chapter",
      genre: "Thriller",
      audience: "Adult",
      tone: "Dark",
      targetWordCount: 80000,
      language: "fr",
      synopsis: "Chapter test",
      mode: "idea",
      chapterCount: 1,
    });

    await useProjectStore.getState().openProject(bundle.project.id);
    const chapter = useProjectStore.getState().activeProject?.chapters[0];
    if (!chapter) throw new Error("Expected chapter");

    await useProjectStore.getState().saveChapter({ ...chapter, content: "one two three" });
    expect(useProjectStore.getState().activeProject?.chapters[0].wordCountCurrent).toBe(3);

    await useProjectStore.getState().addScene(chapter.id);
    expect(useProjectStore.getState().activeProject?.scenes.length).toBe(1);
  });

  it("persists optimistic edits so a reload sees the same state", async () => {
    const bundle = await useProjectStore.getState().createProject({
      title: "Optimistic",
      genre: "SF",
      audience: "Adult",
      tone: "Cold",
      targetWordCount: 50000,
      language: "fr",
      synopsis: "Optimistic test",
      mode: "idea",
      chapterCount: 1,
    });

    await useProjectStore.getState().openProject(bundle.project.id);
    await useProjectStore.getState().saveCharacter({
      id: "char-optimistic",
      projectId: bundle.project.id,
      name: "Nadia",
      role: "Protagonist",
      motivation: "",
      arc: "",
      voice: "",
      relationships: "",
      notes: "",
      updatedAt: new Date().toISOString(),
    });

    expect(
      useProjectStore.getState().activeProject?.characters.find((c) => c.id === "char-optimistic")
        ?.name
    ).toBe("Nadia");

    useProjectStore.setState({ activeProject: null });
    await useProjectStore.getState().openProject(bundle.project.id);
    expect(
      useProjectStore.getState().activeProject?.characters.find((c) => c.id === "char-optimistic")
        ?.name
    ).toBe("Nadia");
  });

  it("removes deleted characters and their relationships from state", async () => {
    const bundle = await useProjectStore.getState().createProject({
      title: "Cascade",
      genre: "SF",
      audience: "Adult",
      tone: "Cold",
      targetWordCount: 50000,
      language: "fr",
      synopsis: "Cascade test",
      mode: "idea",
      chapterCount: 1,
    });

    await useProjectStore.getState().openProject(bundle.project.id);
    const timestamp = new Date().toISOString();
    await useProjectStore.getState().saveCharacter({
      id: "char-a",
      projectId: bundle.project.id,
      name: "A",
      role: "",
      motivation: "",
      arc: "",
      voice: "",
      relationships: "",
      notes: "",
      updatedAt: timestamp,
    });
    await useProjectStore.getState().saveCharacter({
      id: "char-b",
      projectId: bundle.project.id,
      name: "B",
      role: "",
      motivation: "",
      arc: "",
      voice: "",
      relationships: "",
      notes: "",
      updatedAt: timestamp,
    });
    await useProjectStore.getState().saveRelationship({
      id: "rel-ab",
      projectId: bundle.project.id,
      sourceType: "character",
      sourceId: "char-a",
      targetType: "character",
      targetId: "char-b",
      relationType: "allies",
      status: "active",
      intensity: 3,
      notes: "",
      updatedAt: timestamp,
    });

    await useProjectStore.getState().deleteCharacter("char-a");

    const state = useProjectStore.getState().activeProject;
    expect(state?.characters.some((c) => c.id === "char-a")).toBe(false);
    expect(state?.relationships.some((r) => r.id === "rel-ab")).toBe(false);
    expect(state?.characters.some((c) => c.id === "char-b")).toBe(true);
  });
});
