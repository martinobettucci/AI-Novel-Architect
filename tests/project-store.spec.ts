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
});
