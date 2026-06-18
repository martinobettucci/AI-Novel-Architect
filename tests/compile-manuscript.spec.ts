import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/app/lib/db";
import {
  addScene,
  compileManuscript,
  createProjectFromInput,
  getProjectBundle,
  saveChapter,
  saveScene,
} from "@/app/lib/repository";

describe("compileManuscript", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("compiles only selected chapters in book order with front matter", async () => {
    const bundle = await createProjectFromInput({
      title: "My Book",
      genre: "SF",
      audience: "Adult",
      tone: "Cold",
      targetWordCount: 50000,
      language: "fr",
      synopsis: "A synopsis",
      mode: "idea",
      chapterCount: 2,
    });
    const [c1, c2] = bundle.chapters;
    await saveChapter({ ...c1, title: "One", content: "<p>First chapter body.</p>" });
    await saveChapter({ ...c2, title: "Two", content: "<p>Second chapter body.</p>" });

    const refreshed = (await getProjectBundle(bundle.project.id))!;
    const md = compileManuscript(refreshed, {
      chapterIds: [c2.id, c1.id],
      includeFrontMatter: true,
      sceneMode: "chapter",
    });

    expect(md).toContain("# My Book");
    expect(md.indexOf("## 1. One")).toBeLessThan(md.indexOf("## 2. Two"));
    expect(md).toContain("First chapter body.");
    expect(md).toContain("Second chapter body.");
  });

  it("excludes unselected chapters and can draw from scene drafts", async () => {
    const bundle = await createProjectFromInput({
      title: "Scenes",
      genre: "SF",
      audience: "Adult",
      tone: "Cold",
      targetWordCount: 50000,
      language: "fr",
      synopsis: "",
      mode: "idea",
      chapterCount: 2,
    });
    const [c1, c2] = bundle.chapters;
    const scene = await addScene(bundle.project.id, c1.id);
    await saveScene({ ...scene, title: "Opening", draftText: "Scene draft prose." });

    const refreshed = (await getProjectBundle(bundle.project.id))!;
    const md = compileManuscript(refreshed, {
      chapterIds: [c1.id],
      includeFrontMatter: false,
      sceneMode: "scenes",
    });

    expect(md).toContain("Scene draft prose.");
    expect(md).toContain("### Opening");
    expect(md).not.toContain("## 2.");
    void c2;
  });
});
